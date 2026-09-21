"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiQueryKeys } from "../../../../lib/api/query-keys.ts";
import {
  parseAgentStreamEvent,
  parseRuntimeEvent,
  runtimeFingerprint,
  affectedAssessmentIds,
} from "../../utils/workspace-runtime-parser";
import {
  WORKSPACE_RUNTIME_CONNECTION_STATES,
  type WorkspaceRuntimeAssessmentTimeline,
  type WorkspaceRuntimeContextValue,
} from "../../types/workspace-runtime.types";

const initialRuntime: WorkspaceRuntimeContextValue = {
  connectionState: WORKSPACE_RUNTIME_CONNECTION_STATES.connecting,
  emittedAt: null,
  runs: [],
  recentActivity: [],
  engineeringProgress: [],
  repositorySnapshots: [],
  scanJobs: [],
  evidenceReports: [],
  postFindingStates: [],
  runsByAssessmentId: {},
  recentActivityByAssessmentId: {},
  engineeringProgressByAssessmentId: {},
  agentStreamEventsByAssessmentId: {},
  latestRunIdByAssessmentId: {},
  postFindingByAssessmentId: {},
  getAssessmentRuntime: (): WorkspaceRuntimeAssessmentTimeline => ({
    currentRun: null,
    recentActivity: [],
    engineeringProgress: [],
    agentStreamEvents: [],
    latestRunId: null,
    connectionState: WORKSPACE_RUNTIME_CONNECTION_STATES.connecting,
    lastEmittedAt: null,
    postFinding: null,
  }),
  subscribeAssessmentRuntime: () => () => undefined,
};

const WorkspaceRuntimeContext =
  createContext<WorkspaceRuntimeContextValue>(initialRuntime);

export type ScopedAgentStreamSource = {
  addEventListener: (
    type: "workspace.agent-stream",
    listener: (event: MessageEvent<string>) => void,
  ) => void;
  removeEventListener: (
    type: "workspace.agent-stream",
    listener: (event: MessageEvent<string>) => void,
  ) => void;
  close: () => void;
};

export type ScopedAgentStreamEntry = {
  source: ScopedAgentStreamSource;
  subscribers: number;
  onAgentStream: (event: MessageEvent<string>) => void;
};

export function WorkspaceRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [runtime, setRuntime] = useState(initialRuntime);
  const queryClient = useQueryClient();
  const latestFingerprint = useRef<string | null>(null);
  const scopedAgentStreams = useRef<Map<string, ScopedAgentStreamEntry>>(
    new Map(),
  );

  const appendAgentStreamEvent = useCallback((event: MessageEvent<string>) => {
    const parsed = parseAgentStreamEvent(event.data);
    if (parsed === null) return false;
    setRuntime((current) => {
      const previous =
        current.agentStreamEventsByAssessmentId[parsed.assessmentId] ?? [];
      if (previous.some((item) => item.eventId === parsed.eventId)) {
        return current;
      }
      const nextEvents = [...previous, parsed];
      return withAgentStreamEvents(current, {
        ...current.agentStreamEventsByAssessmentId,
        [parsed.assessmentId]: nextEvents,
      });
    });
    return true;
  }, []);

  const subscribeAssessmentRuntime = useCallback(
    (assessmentId: string) => {
      return subscribeScopedAssessmentRuntimeStream({
        assessmentId,
        appendAgentStreamEvent,
        scopedAgentStreams: scopedAgentStreams.current,
      });
    },
    [appendAgentStreamEvent],
  );

  useEffect(() => {
    let source: EventSource;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let stopped = false;
    let needsResync = false;
    const activeScopedAgentStreams = scopedAgentStreams.current;
    const onRuntime = (event: MessageEvent<string>) => {
      const parsed = parseRuntimeEvent(event.data);
      if (parsed !== null) {
        attempts = 0;
        setRuntime((current) =>
          withAgentStreamEvents(
            parsed,
            current.agentStreamEventsByAssessmentId,
          ),
        );
        const fingerprint = runtimeFingerprint(parsed);
        if (latestFingerprint.current !== fingerprint) {
          latestFingerprint.current = fingerprint;
          for (const assessmentId of affectedAssessmentIds(parsed)) {
            void queryClient.invalidateQueries({
              queryKey: apiQueryKeys.assessment.interview(assessmentId),
            });
            void queryClient.invalidateQueries({
              queryKey: apiQueryKeys.assessment.readiness(assessmentId),
            });
            void queryClient.invalidateQueries({
              queryKey: apiQueryKeys.assessment.evidence(assessmentId),
            });
            void queryClient.invalidateQueries({
              queryKey:
                apiQueryKeys.assessment.evidenceGraphOverview(assessmentId),
            });
            void queryClient.invalidateQueries({
              queryKey: apiQueryKeys.assessment.classification(assessmentId),
            });
          }
        }
      }
    };

    const onAgentStream = (event: MessageEvent<string>) => {
      if (appendAgentStreamEvent(event)) {
        attempts = 0;
      }
    };

    const connect = () => {
      if (stopped) return;
      source = new EventSource(workspaceRuntimeEventsUrl());
      source.addEventListener("workspace.runtime", onRuntime);
      source.addEventListener("workspace.agent-stream", onAgentStream);
      source.onopen = () => {
        if (needsResync) {
          latestFingerprint.current = null;
          void queryClient.invalidateQueries({
            queryKey: apiQueryKeys.workspace.detail(),
          });
          void queryClient.invalidateQueries({
            queryKey: apiQueryKeys.workspace.assessments(),
          });
          void queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] === "assessment",
          });
          needsResync = false;
        }
        setRuntime((current) => ({
          ...current,
          connectionState: WORKSPACE_RUNTIME_CONNECTION_STATES.connected,
        }));
      };
      source.onerror = () => {
        source.removeEventListener("workspace.runtime", onRuntime);
        source.removeEventListener("workspace.agent-stream", onAgentStream);
        source.onopen = null;
        source.onerror = null;
        source.close();
        needsResync = true;
        setRuntime((current) => ({
          ...current,
          connectionState: WORKSPACE_RUNTIME_CONNECTION_STATES.disconnected,
        }));
        const delay = Math.min(1000 * 2 ** Math.min(attempts++, 5), 30000);
        retryTimer = setTimeout(connect, delay);
      };
    };
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      for (const entry of activeScopedAgentStreams.values()) {
        entry.source.removeEventListener(
          "workspace.agent-stream",
          entry.onAgentStream,
        );
        entry.source.close();
      }
      activeScopedAgentStreams.clear();
      source.removeEventListener("workspace.runtime", onRuntime);
      source.removeEventListener("workspace.agent-stream", onAgentStream);
      source.onopen = null;
      source.onerror = null;
      source.close();
    };
  }, [appendAgentStreamEvent, queryClient]);

  return (
    <WorkspaceRuntimeContext.Provider
      value={{ ...runtime, subscribeAssessmentRuntime }}
    >
      {children}
    </WorkspaceRuntimeContext.Provider>
  );
}

export function workspaceRuntimeEventsUrl(
  assessmentId?: string,
  agentStreamOnly = false,
): string {
  const params = new URLSearchParams();
  if (assessmentId) {
    params.set("assessment_id", assessmentId);
  }
  if (agentStreamOnly) {
    params.set("agent_stream_only", "1");
  }
  const query = params.toString();
  return query
    ? `/api/workspace/runtime-events?${query}`
    : "/api/workspace/runtime-events";
}

export function subscribeScopedAssessmentRuntimeStream({
  assessmentId,
  appendAgentStreamEvent,
  scopedAgentStreams,
  createEventSource = (url) => new EventSource(url),
}: {
  assessmentId: string;
  appendAgentStreamEvent: (event: MessageEvent<string>) => boolean;
  scopedAgentStreams: Map<string, ScopedAgentStreamEntry>;
  createEventSource?: (url: string) => ScopedAgentStreamSource;
}): () => void {
  const scopedAssessmentId = assessmentId.trim();
  if (!scopedAssessmentId) {
    return () => undefined;
  }
  const existing = scopedAgentStreams.get(scopedAssessmentId);
  if (existing) {
    existing.subscribers += 1;
    return () => {
      releaseScopedAssessmentRuntimeStream(
        scopedAgentStreams,
        scopedAssessmentId,
      );
    };
  }

  const source = createEventSource(
    workspaceRuntimeEventsUrl(scopedAssessmentId, true),
  );
  const onAgentStream = (event: MessageEvent<string>) => {
    appendAgentStreamEvent(event);
  };
  source.addEventListener("workspace.agent-stream", onAgentStream);
  scopedAgentStreams.set(scopedAssessmentId, {
    source,
    subscribers: 1,
    onAgentStream,
  });

  return () => {
    releaseScopedAssessmentRuntimeStream(
      scopedAgentStreams,
      scopedAssessmentId,
    );
  };
}

function releaseScopedAssessmentRuntimeStream(
  scopedAgentStreams: Map<string, ScopedAgentStreamEntry>,
  scopedAssessmentId: string,
) {
  const current = scopedAgentStreams.get(scopedAssessmentId);
  if (!current) return;
  current.subscribers -= 1;
  if (current.subscribers > 0) return;
  current.source.removeEventListener(
    "workspace.agent-stream",
    current.onAgentStream,
  );
  current.source.close();
  scopedAgentStreams.delete(scopedAssessmentId);
}

function withAgentStreamEvents(
  runtime: WorkspaceRuntimeContextValue,
  agentStreamEventsByAssessmentId: WorkspaceRuntimeContextValue["agentStreamEventsByAssessmentId"],
): WorkspaceRuntimeContextValue {
  return {
    ...runtime,
    agentStreamEventsByAssessmentId,
    getAssessmentRuntime: (assessmentId: string) => ({
      currentRun: runtime.runsByAssessmentId[assessmentId]?.[0] ?? null,
      recentActivity: runtime.recentActivityByAssessmentId[assessmentId] ?? [],
      engineeringProgress:
        runtime.engineeringProgressByAssessmentId[assessmentId] ?? [],
      agentStreamEvents: agentStreamEventsByAssessmentId[assessmentId] ?? [],
      latestRunId: runtime.latestRunIdByAssessmentId[assessmentId] ?? null,
      connectionState: runtime.connectionState,
      lastEmittedAt: runtime.emittedAt,
      postFinding: runtime.postFindingByAssessmentId[assessmentId] ?? null,
    }),
  };
}

export function useWorkspaceRuntime() {
  return useContext(WorkspaceRuntimeContext);
}

export const __workspaceRuntimeTestUtils = {
  parseRuntimeEvent,
};
