import { REPOSITORY_SCAN_TRIGGER_SOURCES } from "@lcsp/contracts/github-integration";

import { apiRequest } from "./api-request.ts";

export type StartRepositoryAnalysisInput = {
  connectionId: string;
  branch: string;
};

export type StartRepositoryAnalysisResult = {
  snapshotId: string;
  commitSha: string;
  scanJobId: string;
  scanStatus: string;
};

type SnapshotPayload = {
  snapshot_id?: unknown;
  commit_sha?: unknown;
};

type ScanPayload = {
  scan_job_id?: unknown;
  status?: unknown;
};

export async function startRepositoryAnalysis(
  assessmentId: string,
  input: StartRepositoryAnalysisInput,
): Promise<StartRepositoryAnalysisResult> {
  const snapshotResponse = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/snapshots`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        connection_id: input.connectionId,
        branch: input.branch,
      }),
    },
  );

  if (!snapshotResponse.ok || !isSnapshotPayload(snapshotResponse.payload)) {
    throw new Error(
      snapshotResponse.problemCode ?? "repository-snapshot-create-failed",
    );
  }

  const idempotencyKey = [
    "readiness",
    assessmentId,
    snapshotResponse.payload.snapshot_id,
  ].join(":");

  const scanResponse = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/scan-jobs`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        snapshot_id: snapshotResponse.payload.snapshot_id,
        trigger_source: REPOSITORY_SCAN_TRIGGER_SOURCES.manual,
        idempotency_key: idempotencyKey,
      }),
    },
  );

  if (!scanResponse.ok || !isScanPayload(scanResponse.payload)) {
    throw new Error(scanResponse.problemCode ?? "repository-scan-trigger-failed");
  }

  return {
    snapshotId: snapshotResponse.payload.snapshot_id,
    commitSha: snapshotResponse.payload.commit_sha,
    scanJobId: scanResponse.payload.scan_job_id,
    scanStatus: scanResponse.payload.status,
  };
}

function isSnapshotPayload(payload: unknown): payload is {
  snapshot_id: string;
  commit_sha: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const value = payload as SnapshotPayload;
  return (
    typeof value.snapshot_id === "string" &&
    typeof value.commit_sha === "string"
  );
}

function isScanPayload(payload: unknown): payload is {
  scan_job_id: string;
  status: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const value = payload as ScanPayload;
  return typeof value.scan_job_id === "string" && typeof value.status === "string";
}
