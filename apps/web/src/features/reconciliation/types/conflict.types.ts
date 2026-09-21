import type { MessageKey } from "@lcsp/i18n";

import type {
  ConflictSummary,
  ResolveConflictPayload,
} from "@/lib/api/conflict-client";
import { API_OUTCOME_KINDS } from "../../../lib/api/outcome-kinds.ts";
import type { ConflictResolutionValue } from "./conflict-card.types";

export const CONFLICT_RESOLUTION_VIEW_STATES = {
  loading: "loading",
  loaded: API_OUTCOME_KINDS.loaded,
  empty: API_OUTCOME_KINDS.empty,
  accessRevoked: API_OUTCOME_KINDS.accessRevoked,
  error: API_OUTCOME_KINDS.error,
} as const;

export type ConflictResolutionViewState =
  (typeof CONFLICT_RESOLUTION_VIEW_STATES)[keyof typeof CONFLICT_RESOLUTION_VIEW_STATES];

export type ConflictCardModel = ConflictSummary;

export type ConflictResolutionAction = ResolveConflictPayload;

export type ConflictTypeLabelMap = Record<string, MessageKey>;

export type ConflictResolutionPageProps = {
  assessmentId: string;
};

export type ConflictResolutionDraftMap = Record<string, boolean>;

export type ConflictResolutionStatusMap = Record<
  string,
  ConflictResolutionValue
>;

export type ConflictResolutionNoteMap = Record<string, string>;

export type ConflictResolutionErrorMap = Record<string, string | null>;
