import type { MessageKey } from "@lcsp/i18n";

export const conflictTypeLabelKeys = {
  evidence_contradiction:
    "pages.reconciliation.conflictTypeLabels.evidenceContradiction",
  scope_mismatch: "pages.reconciliation.conflictTypeLabels.scopeMismatch",
  unverifiable: "pages.reconciliation.conflictTypeLabels.unverifiableFinding",
} as const satisfies Record<string, MessageKey>;

export function getConflictTypeLabelKey(conflictType: string): MessageKey {
  return (
    conflictTypeLabelKeys[conflictType as keyof typeof conflictTypeLabelKeys] ??
    "pages.reconciliation.conflictTypeLabels.generic"
  );
}
