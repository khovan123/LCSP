import { apiRequest } from "./api-request.ts";
import type {
  EvidenceGraphFilters,
  ProgramEvidenceGraphOverview,
} from "./evidence-graph-detail-client.ts";

export async function getProgramEvidenceGraphOverview(
  assessmentId: string,
  filters?: EvidenceGraphFilters,
): Promise<ProgramEvidenceGraphOverview | null> {
  const searchParams = new URLSearchParams();
  if (filters?.snapshotId) searchParams.set("snapshotId", filters.snapshotId);
  if (filters?.scanJobId) searchParams.set("scanJobId", filters.scanJobId);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const { payload, ok } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/evidence-graph/overview${query}`,
    { cache: "no-store" },
  );
  if (!ok || typeof payload !== "object" || payload === null) return null;
  const overview = payload as Record<string, unknown>;
  const result: ProgramEvidenceGraphOverview = {
    modules_analyzed: normalizeMetric(overview.modules_analyzed),
    code_symbols_indexed: normalizeMetric(overview.code_symbols_indexed),
    ai_model_invocations: normalizeMetric(overview.ai_model_invocations),
    evidence_mapped_scope: normalizeMetric(overview.evidence_mapped_scope),
  };
  if (typeof overview.report_id === "string") {
    result.report_id = overview.report_id;
  }
  if (typeof overview.snapshot_id === "string") {
    result.snapshot_id = overview.snapshot_id;
  }
  if (typeof overview.scan_job_id === "string") {
    result.scan_job_id = overview.scan_job_id;
  }
  return result;
}

function normalizeMetric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
