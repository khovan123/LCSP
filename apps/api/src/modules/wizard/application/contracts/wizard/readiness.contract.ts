import type {
  ReadinessMissingEvidenceItem,
  ReadinessUnresolvedUnknownItem,
} from "@lcsp/contracts/wizard";

export type MissingEvidenceItem = ReadinessMissingEvidenceItem;

export interface ReadinessResponse {
  assessment_id: string;
  wizard_status: string;
  classification_locked: boolean;
  lock_reason: string | null;
  missing_evidence: MissingEvidenceItem[];
  unresolved_unknown_items: ReadinessUnresolvedUnknownItem[];
  completed_steps: string[];
  next_action: string;
  updated_at: string;
  correlation_id: string;
}
