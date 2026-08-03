import { CONFLICT_RECORD_STATUSES } from "@lcsp/contracts/scan";

import type { ConflictCardModel } from "./conflict.types";

export const CONFLICT_RESOLUTION_OPTIONS = [
  {
    value: CONFLICT_RECORD_STATUSES.resolved,
    labelKey: "pages.reconciliation.resolutionResolved",
  },
  {
    value: CONFLICT_RECORD_STATUSES.dismissed,
    labelKey: "pages.reconciliation.resolutionDismissed",
  },
] as const;

export type ConflictResolutionValue =
  (typeof CONFLICT_RESOLUTION_OPTIONS)[number]["value"];

export type ConflictCardProps = {
  conflict: ConflictCardModel;
  resolution: ConflictResolutionValue;
  resolutionNote: string;
  isSubmitting: boolean;
  formError: string | null;
  onResolutionChange: (resolution: ConflictResolutionValue) => void;
  onResolutionNoteChange: (note: string) => void;
  onSubmit: () => void;
};
