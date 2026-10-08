import { expect, test, type Page, type Route } from "@playwright/test";

const ASSESSMENT_ID = "00000000-0000-4000-8000-000000000101";
const THREAD_ID = "00000000-0000-4000-8000-000000000102";
const CHECKPOINT_NAMESPACE = "00000000-0000-4000-8000-000000000103";
const EXECUTION_ID = "00000000-0000-4000-8000-000000000104";

const lifecycle = {
  state: "WAITING_FOR_REQUIRED_INPUT",
  assessmentRevision: 1,
};

const runtime = {
  threadId: THREAD_ID,
  rootAgentVersion: "playwright-fixture",
  checkpointNamespace: CHECKPOINT_NAMESPACE,
  checkpointId: null,
  currentExecutionId: EXECUTION_ID,
  executionState: "RUNNING",
  eventSequence: 1,
  startedAt: "2026-10-08T00:00:00.000Z",
  lastResumedAt: null,
  updatedAt: "2026-10-08T00:00:00.000Z",
};

function envelope(data: unknown) {
  return JSON.stringify({ ok: true, data });
}

function assessmentDetail() {
  return {
    assessment_id: ASSESSMENT_ID,
    name: "Playwright Interview assessment",
    owner_id: "playwright-owner",
    lifecycle,
    runtime,
    case: null,
    created_at: "2026-10-08T00:00:00.000Z",
    updated_at: "2026-10-08T00:00:00.000Z",
    correlationId: "playwright-correlation",
  };
}

function interviewState(control: "FREE_TEXT" | "SINGLE_SELECT" = "FREE_TEXT") {
  return {
    outcome: "WAITING_FOR_CUSTOMER",
    threadId: THREAD_ID,
    contextRevision: 1,
    activeQuestion: {
      id: "q-playwright-1",
      intent: "ASK",
      control,
      prompt: "What data does this workflow process?",
      ...(control === "SINGLE_SELECT"
        ? {
            choices: [
              { id: "other", label: "Other", requiresFreeText: true },
            ],
          }
        : {}),
    },
    answerHistory: [],
  };
}

function runtimeSse() {
  return [
    "event: workspace.runtime",
    `data: ${JSON.stringify({
      emitted_at: "2026-10-08T00:00:00.000Z",
      canonical_assessments: [
        { assessmentId: ASSESSMENT_ID, lifecycle, runtime },
      ],
      canonical_events: [],
    })}`,
    "",
    "",
  ].join("\n");
}

async function installFixture(page: Page) {
  let currentInterview = interviewState();
  const submissions: unknown[] = [];
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/workspace/runtime-events") {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: runtimeSse(),
      });
      return;
    }
    if (path === `/api/assessments/${ASSESSMENT_ID}`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: envelope(assessmentDetail()) });
      return;
    }
    if (path === `/api/assessments/${ASSESSMENT_ID}/interview`) {
      if (request.method() === "POST") {
        submissions.push(request.postDataJSON());
        await route.fulfill({ status: 201, contentType: "application/json", body: envelope(currentInterview) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: envelope(currentInterview) });
      }
      return;
    }
    if (path === `/api/assessments/${ASSESSMENT_ID}/human-requests`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: envelope({ caseRevision: 1, requests: [] }) });
      return;
    }
    if (path === `/api/assessments/${ASSESSMENT_ID}/artifacts`) {
      await route.fulfill({ status: 200, contentType: "application/json", body: envelope(null) });
      return;
    }
    if (path === "/api/auth/profile") {
      await route.fulfill({ status: 200, contentType: "application/json", body: envelope({ user: { id: "playwright-owner", email: "playwright@example.com", role: "CUSTOMER" } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: envelope(null) });
  });
  return {
    submissions,
    setInterviewState(next: ReturnType<typeof interviewState>) {
      currentInterview = next;
    },
  };
}

test("canonical assessment renders Interview and owns FREE_TEXT submission", async ({ page }) => {
  const fixture = await installFixture(page);
  await page.context().addCookies([
    { name: "lcsp_session", value: "billing-e2e-customer", url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" },
    { name: "lcsp_locale", value: "en", url: "http://127.0.0.1:3100", sameSite: "Lax" },
  ]);
  await page.goto(`/assessments/${ASSESSMENT_ID}`);

  await expect(page.locator("main[data-assessment-id]")).toBeVisible();
  await expect(page.locator("[data-canonical-status='PRESENT']").first()).toBeVisible();
  await expect(page.locator("[data-slot='canonical-interview-panel']")).toBeVisible();
  await expect(page.getByText("What data does this workflow process?")).toBeVisible();

  const composer = page.locator("[data-slot='assessment-composer'] textarea");
  await expect(composer).toBeEnabled();
  await composer.fill("Customer records and workflow metadata.");
  await expect(page.locator("[data-slot='assessment-composer'] button[type='submit']")).toBeEnabled();

  const requestPromise = page.waitForRequest(
    (request) => request.url().endsWith(`/api/assessments/${ASSESSMENT_ID}/interview`) && request.method() === "POST",
  );
  await page.locator("[data-slot='assessment-composer'] button[type='submit']").click();
  const request = await requestPromise;
  const payload = request.postDataJSON() as { answer?: { kind?: string; text?: string } };
  expect(payload.answer?.kind).toBe("FREE_TEXT");
  expect(payload.answer?.text).toBe("Customer records and workflow metadata.");
  expect(fixture.submissions).toHaveLength(1);
  await expect(composer).toBeDisabled();
});

test("canonical page preserves required-text structured ownership", async ({ page }) => {
  const fixture = await installFixture(page);
  fixture.setInterviewState(interviewState("SINGLE_SELECT"));
  await page.context().addCookies([
    { name: "lcsp_session", value: "billing-e2e-customer", url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" },
    { name: "lcsp_locale", value: "en", url: "http://127.0.0.1:3100", sameSite: "Lax" },
  ]);
  await page.goto(`/assessments/${ASSESSMENT_ID}`);

  const choice = page.getByRole("radio");
  await expect(choice).toBeVisible();
  await choice.click();
  const composer = page.locator("[data-slot='assessment-composer'] textarea");
  const action = page.locator("[data-slot='selection-submit-action'] button");
  await expect(composer).toBeEnabled();
  await expect(action).toBeVisible();
  await expect(action).toBeDisabled();
  await expect(page.locator("[data-slot='assessment-composer'] button[type='submit']")).toBeDisabled();
  await composer.fill("Customer records.");
  await expect(action).toBeEnabled();
  await composer.press("Enter");
  await expect.poll(() => fixture.submissions.length).toBe(0);
  await action.click();
  await expect.poll(() => fixture.submissions.length).toBe(1);
  const payload = fixture.submissions[0] as { answer?: { kind?: string; value?: string; comment?: string } };
  expect(payload.answer?.kind).toBe("SINGLE_SELECT");
  expect(payload.answer?.value).toBe("other");
  expect(payload.answer?.comment).toBe("Customer records.");
});
