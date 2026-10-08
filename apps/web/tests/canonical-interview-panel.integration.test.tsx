import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";

import {
  ASSESSMENT_INTERVIEW_CONTROLS,
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,
  type AssessmentInterviewQuestion,
  type AssessmentInterviewRuntimeState,
} from "@lcsp/contracts/evidence";
import { ASSESSMENT_LIFECYCLE_STATES } from "@lcsp/contracts/assessment";
import { apiQueryKeys } from "../src/lib/api/query-keys";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/assessments/integration-1",
});
const testWindow = dom.window;
for (const [name, value] of [
  ["window", testWindow],
  ["document", testWindow.document],
  ["navigator", testWindow.navigator],
  ["Element", testWindow.Element],
  ["HTMLElement", testWindow.HTMLElement],
  ["HTMLButtonElement", testWindow.HTMLButtonElement],
  ["HTMLTextAreaElement", testWindow.HTMLTextAreaElement],
  ["HTMLFormElement", testWindow.HTMLFormElement],
  ["KeyboardEvent", testWindow.KeyboardEvent],
  ["MouseEvent", testWindow.MouseEvent],
  ["Event", testWindow.Event],
  ["Node", testWindow.Node],
] as const) {
  Object.defineProperty(globalThis, name, { configurable: true, value });
}
Object.defineProperty(testWindow, "matchMedia", {
  configurable: true,
  value: () => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: "",
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});
Object.defineProperty(testWindow.HTMLElement.prototype, "scrollTo", {
  configurable: true,
  value: () => undefined,
});
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
});

let lastEventSource: TestEventSource | null = null;
class TestEventSource {
  private listeners = new Map<string, (event: MessageEvent<string>) => void>();
  constructor() {
    // The test source is intentionally exposed so the mounted runtime provider
    // can receive a canonical snapshot after its effect subscribes.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastEventSource = this;
  }
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
    this.listeners.set(type, listener);
  }
  emit(type: string, data: string) {
    this.listeners.get(type)?.(new testWindow.MessageEvent(type, { data }));
  }
  close() {}
}
Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  value: TestEventSource,
});

const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import(
  "@tanstack/react-query"
);
const { WorkspaceRuntimeProvider } = await import(
  "../src/features/workspace/components/organisms/workspace-runtime-provider"
);
const { CanonicalInterviewPanel } = await import(
  "../src/features/workspace/components/organisms/canonical-interview-panel"
);

const assessmentId = "00000000-0000-4000-8000-000000000001";
const roots: ReturnType<typeof createRoot>[] = [];
let fetchImpl: typeof globalThis.fetch;

afterEach(() => {
  globalThis.fetch = fetchImpl;
  for (const root of roots.splice(0)) act(() => root.unmount());
  testWindow.document.getElementById("root")?.replaceChildren();
});

function question(
  id: string,
  control: AssessmentInterviewQuestion["control"] =
    ASSESSMENT_INTERVIEW_CONTROLS.singleSelect,
): AssessmentInterviewQuestion {
  return {
    id,
    intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
    control,
    prompt: `Prompt ${id}`,
    choices:
      control === ASSESSMENT_INTERVIEW_CONTROLS.freeText
        ? undefined
        : [
            { id: "normal", label: "Normal" },
            { id: "other", label: "Other", requiresFreeText: true },
          ],
  };
}

function interviewState(activeQuestion: AssessmentInterviewQuestion | null): AssessmentInterviewRuntimeState {
  return {
    outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,
    threadId: "00000000-0000-4000-8000-000000000002",
    contextRevision: 1,
    activeQuestion,
    answerHistory: [],
  } as AssessmentInterviewRuntimeState;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function envelope(data: unknown) {
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function mount(
  state: AssessmentInterviewRuntimeState,
  options: {
    lifecycleState?: (typeof ASSESSMENT_LIFECYCLE_STATES)[keyof typeof ASSESSMENT_LIFECYCLE_STATES];
    mutation?: (input: unknown) => Promise<Response>;
  } = {},
) {
  const current = state;
  const mutation = options.mutation ?? (() => Promise.resolve(envelope(current)));
  fetchImpl = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    if (path.includes("/interview") && init?.method === "POST") {
      return mutation(JSON.parse(String(init.body)));
    }
    if (path.includes("/interview")) return envelope(current);
    if (path.includes("/artifacts")) return envelope(null);
    return envelope(null);
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const root = createRoot(testWindow.document.getElementById("root")!);
  roots.push(root);
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          WorkspaceRuntimeProvider,
          null,
          createElement(CanonicalInterviewPanel, {
            assessmentId,
            lifecycleState:
              options.lifecycleState ??
              ASSESSMENT_LIFECYCLE_STATES.WAITING_FOR_REQUIRED_INPUT,
            canonicalAvailable: true,
          }),
        ),
      ),
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    emitCanonicalRuntime(options.lifecycleState);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  return { container: testWindow.document.getElementById("root")!, queryClient };
}

function emitCanonicalRuntime(
  lifecycleState: (typeof ASSESSMENT_LIFECYCLE_STATES)[keyof typeof ASSESSMENT_LIFECYCLE_STATES] | undefined,
) {
  lastEventSource?.emit(
    "workspace.runtime",
    JSON.stringify({
        emitted_at: "2026-10-08T00:00:00.000Z",
        canonical_assessments: [
          {
            assessmentId,
            lifecycle: {
              state:
                lifecycleState ??
                ASSESSMENT_LIFECYCLE_STATES.WAITING_FOR_REQUIRED_INPUT,
              assessmentRevision: 1,
            },
            runtime: {
              threadId: "00000000-0000-4000-8000-000000000002",
              rootAgentVersion: "test",
              checkpointNamespace: "00000000-0000-4000-8000-000000000003",
              checkpointId: null,
              currentExecutionId: "00000000-0000-4000-8000-000000000004",
              executionState: "RUNNING",
              eventSequence: 1,
              startedAt: "2026-10-08T00:00:00.000Z",
              lastResumedAt: null,
              updatedAt: "2026-10-08T00:00:00.000Z",
            },
          },
        ],
        canonical_events: [],
      }),
  );
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new testWindow.MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function changeText(element: HTMLTextAreaElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value",
    )?.set;
    setter?.call(element, value);
    element.dispatchEvent(new testWindow.Event("input", { bubbles: true }));
    element.dispatchEvent(new testWindow.Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("canonical panel locks immediately and sends one structured command", async () => {
  let resolveMutation!: (response: Response) => void;
  const mutation = () => new Promise<Response>((resolve) => (resolveMutation = resolve));
  const { container } = await mount(interviewState(question("q1")), { mutation });
  const choice = container.querySelectorAll<HTMLElement>("[role='radio']")[0];
  await click(choice);
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  assert.equal(action.disabled, false);
  await click(action);
  await click(action);
  assert.equal(action.disabled, true);
  assert.equal(
    container.querySelectorAll("[data-slot='selection-submit-action'] button").length,
    1,
  );
  resolveMutation(envelope(interviewState(question("q1"))));
});

test("canonical panel preserves required-text input while making composer submission unavailable", async () => {
  const { container } = await mount(interviewState(question("q-required")));
  const radios = container.querySelectorAll<HTMLElement>("[role='radio']");
  await click(radios[1]);
  const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
  const composerSend = container.querySelector<HTMLButtonElement>(
    "[data-slot='assessment-composer'] button[type='submit']",
  )!;
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  await changeText(textarea, "required explanation");
  assert.equal(textarea.disabled, false);
  assert.equal(composerSend.disabled, true);
  assert.equal(action.disabled, false);
});

test("canonical panel is read-only when lifecycle interaction is not eligible", async () => {
  const { container } = await mount(interviewState(question("q-readonly")), {
    lifecycleState: ASSESSMENT_LIFECYCLE_STATES.PAUSED,
  });
  assert.equal(container.querySelector("textarea"), null);
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  );
  assert.ok(action);
  assert.equal(action.disabled, true);
});

test("canonical panel keeps the same question locked after success and refetch", async () => {
  let calls = 0;
  let resolveMutation!: (response: Response) => void;
  const q1 = question("q-refetch");
  const mounted = await mount(interviewState(q1), {
    mutation: () => {
      calls += 1;
      return new Promise<Response>((resolve) => (resolveMutation = resolve));
    },
  });
  const { container, queryClient } = mounted;
  await click(container.querySelectorAll<HTMLElement>("[role='radio']")[0]);
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  await click(action);
  assert.equal(calls, 1);
  assert.equal(action.disabled, true);
  resolveMutation(envelope(interviewState(q1)));
  await settle();
  queryClient.setQueryData(apiQueryKeys.assessment.interview(assessmentId), interviewState(q1));
  await settle();
  const refetchedAction = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  assert.equal(refetchedAction.disabled, true);
  await click(refetchedAction);
  assert.equal(calls, 1);
});

test("canonical panel releases a failed structured answer for retry without losing the draft", async () => {
  let calls = 0;
  let rejectMutation!: (error: Error) => void;
  let resolveRetry!: (response: Response) => void;
  const mounted = await mount(interviewState(question("q-retry")), {
    mutation: () => {
      calls += 1;
      if (calls === 1) return new Promise<Response>((_, reject) => (rejectMutation = reject));
      return new Promise<Response>((resolve) => (resolveRetry = resolve));
    },
  });
  const { container } = mounted;
  await click(container.querySelectorAll<HTMLElement>("[role='radio']")[0]);
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  await click(action);
  assert.equal(action.disabled, true);
  rejectMutation(new Error("temporary network failure"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  const retryAction = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  assert.equal(retryAction.disabled, false);
  await click(retryAction);
  assert.equal(calls, 2);
  resolveRetry(envelope(interviewState(question("q-retry"))));
  await settle();
  assert.equal(
    container.querySelector<HTMLButtonElement>(
      "[data-slot='selection-submit-action'] button",
    )!.disabled,
    true,
  );
});

test("canonical panel resets draft, lock and mode when the authoritative question changes", async () => {
  let calls = 0;
  let resolveMutation!: (response: Response) => void;
  const q1 = question("q-one");
  const q2 = question("q-two", ASSESSMENT_INTERVIEW_CONTROLS.freeText);
  const mounted = await mount(interviewState(q1), {
    mutation: () => {
      calls += 1;
      return new Promise<Response>((resolve) => (resolveMutation = resolve));
    },
  });
  const { container, queryClient } = mounted;
  await click(container.querySelectorAll<HTMLElement>("[role='radio']")[1]);
  const textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
  await changeText(textarea, "draft for q1");
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  )!;
  await click(action);
  assert.equal(calls, 1);
  resolveMutation(envelope(interviewState(q1)));
  await settle();
  queryClient.setQueryData(
    apiQueryKeys.assessment.interview(assessmentId),
    interviewState(q2),
  );
  await settle();
  const q2Textarea = container.querySelector<HTMLTextAreaElement>("textarea")!;
  assert.equal(q2Textarea.value, "");
  assert.equal(q2Textarea.disabled, false);
  assert.equal(
    container.querySelector("[data-slot='selection-submit-action']"),
    null,
  );
  await changeText(q2Textarea, "answer for q2");
  await click(container.querySelector<HTMLButtonElement>("button[type='submit']")!);
  assert.equal(calls, 2);
});

test("canonical panel blocks stale Interview answers even with a valid draft", async () => {
  const stale = {
    ...interviewState(question("q-stale")),
    contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.superseded,
  } as AssessmentInterviewRuntimeState;
  let calls = 0;
  const mounted = await mount(stale, { mutation: async () => {
    calls += 1;
    return envelope(stale);
  }});
  const { container } = mounted;
  assert.equal(container.querySelector("textarea"), null);
  const action = container.querySelector<HTMLButtonElement>(
    "[data-slot='selection-submit-action'] button",
  );
  assert.ok(action);
  assert.equal(action.disabled, true);
  await click(action);
  assert.equal(calls, 0);
});
