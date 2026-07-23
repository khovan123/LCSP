import type { MessageKey } from "@lcsp/i18n";

import type {
  ConflictSummary,
  ResolveConflictPayload,
} from "@/lib/api/conflict-client";

export type ConflictResolutionViewState =
  | "loading"
  | "loaded"
  | "empty"
  | "access_revoked"
  | "error";

export type ConflictCardModel = ConflictSummary;

export type ConflictResolutionAction = ResolveConflictPayload;

export type ConflictTypeLabelMap = Record<string, MessageKey>;
