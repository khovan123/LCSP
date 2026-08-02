import { Injectable } from "@nestjs/common";
import {
  ANSWER_STATES,
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  READINESS_EXPORT_BADGES,
  READINESS_EXPORT_GUARDRAIL_REASONS,
  READINESS_EXPORT_LABELS,
} from "@lcsp/contracts/wizard";

const OVERCLAIM_PATTERN =
  /\b(high|medium|low|risk|severity|violation|non compliant|certified|certification|approved|legal conclusion|final classification|classification result)\b/i;
const MAX_SERIALIZED_CONTENT_LENGTH = 256_000;
const MAX_LIST_ITEMS = 100;
const MAX_TEXT_LENGTH = 2_000;

export interface ReadinessExportGuardrailResult {
  passed: boolean;
  blockedReason: string | null;
}

@Injectable()
export class ReadinessExportGuardrailService {
  check(content: unknown): ReadinessExportGuardrailResult {
    const serialized = JSON.stringify(content);
    if (typeof serialized !== "string") {
      return {
        passed: false,
        blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.contractMismatch,
      };
    }
    const match = OVERCLAIM_PATTERN.exec(serialized.replace(/[_-]+/g, " "));

    if (match || serialized.length > MAX_SERIALIZED_CONTENT_LENGTH) {
      return {
        passed: false,
        blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.overclaim,
      };
    }

    if (!this.hasReadinessOnlyContract(content)) {
      return {
        passed: false,
        blockedReason: READINESS_EXPORT_GUARDRAIL_REASONS.contractMismatch,
      };
    }

    return { passed: true, blockedReason: null };
  }

  private hasReadinessOnlyContract(content: unknown): boolean {
    if (typeof content !== "object" || content === null) return false;
    const candidate = content as Record<string, unknown>;
    const metadata = candidate.metadata;
    if (typeof metadata !== "object" || metadata === null) return false;
    const metadataRecord = metadata as Record<string, unknown>;

    return (
      candidate.artifact_type ===
        READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport &&
      candidate.label === READINESS_EXPORT_LABELS.wizardReadinessExport &&
      candidate.title === READINESS_EXPORT_LABELS.wizardReadinessExport &&
      candidate.badge === READINESS_EXPORT_BADGES.readinessOnly &&
      metadataRecord.artifact_type ===
        READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport &&
      metadataRecord.label === READINESS_EXPORT_LABELS.wizardReadinessExport &&
      metadataRecord.readiness_only === true &&
      metadataRecord.classification_status ===
        READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired &&
      isBoundedString(metadataRecord.assessment_id) &&
      isBoundedString(metadataRecord.generated_by) &&
      isBoundedString(metadataRecord.generated_at) &&
      Number.isSafeInteger(metadataRecord.version) &&
      (metadataRecord.version as number) > 0 &&
      Number.isSafeInteger(metadataRecord.wizard_profile_version) &&
      (metadataRecord.wizard_profile_version as number) > 0 &&
      isBoundedString(candidate.preview) &&
      isMissingEvidenceList(candidate.missing_evidence) &&
      isUnknownItemList(candidate.unresolved_unknown_items) &&
      isStringList(candidate.preparation_guidance) &&
      isStringList(candidate.next_steps)
    );
  }
}

function isMissingEvidenceList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= MAX_LIST_ITEMS &&
    value.every(
      (item: unknown) =>
        isRecord(item) &&
        isBoundedString(item.type) &&
        isBoundedString(item.label) &&
        isBoundedString(item.description),
    )
  );
}

function isUnknownItemList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= MAX_LIST_ITEMS &&
    value.every(
      (item: unknown) =>
        isRecord(item) &&
        isBoundedString(item.question_id) &&
        isBoundedString(item.label) &&
        item.answer_state === ANSWER_STATES.explicitUnknown,
    )
  );
}

function isStringList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= MAX_LIST_ITEMS &&
    value.every(isBoundedString)
  );
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TEXT_LENGTH
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
