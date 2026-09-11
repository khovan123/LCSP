import type { WorkspaceRuntimeActivityItem } from "@/features/workspace/types/workspace-runtime.types";
import type { ProgramEvidenceGraphOverview } from "@/lib/api/evidence-graph-detail-client";

import type {
  ProgramEvidenceMetric,
  ProgramEvidenceSummary,
} from "../types/assessment-flow.types";
import {
  PROGRAM_EVIDENCE_METRIC_FORMATS,
  PROGRAM_EVIDENCE_UNAVAILABLE_REASONS,
} from "../types/assessment-flow.types";

export function deriveProgramEvidenceSummary(input: {
  recentActivity?: WorkspaceRuntimeActivityItem[];
  canonicalOverview?: ProgramEvidenceGraphOverview | null;
}): ProgramEvidenceSummary {
  void input.recentActivity;
  const overview = input.canonicalOverview ?? null;
  return {
    modulesAnalyzed: metricFromCanonical(
      overview?.modules_analyzed ?? null,
      PROGRAM_EVIDENCE_METRIC_FORMATS.count,
    ),
    codeSymbolsIndexed: metricFromCanonical(
      overview?.code_symbols_indexed ?? null,
      PROGRAM_EVIDENCE_METRIC_FORMATS.count,
    ),
    aiModelInvocations: metricFromCanonical(
      overview?.ai_model_invocations ?? null,
      PROGRAM_EVIDENCE_METRIC_FORMATS.count,
    ),
    evidenceMappedScope: metricFromCanonical(
      overview?.evidence_mapped_scope ?? null,
      PROGRAM_EVIDENCE_METRIC_FORMATS.percent,
    ),
  };
}

function metricFromCanonical(
  value: number | null,
  format: ProgramEvidenceMetric["format"],
): ProgramEvidenceMetric {
  return value === null
    ? {
        value: null,
        format,
        unavailableReason:
          PROGRAM_EVIDENCE_UNAVAILABLE_REASONS.missingCanonicalMetric,
      }
    : { value, format };
}
