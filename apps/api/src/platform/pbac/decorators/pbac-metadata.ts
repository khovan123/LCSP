import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

export const PBAC_METADATA_KEY = PBAC_ACTIONS.metadataCheck;

export type PbacMetadata = (
  | { type: "session" }
  | { type: "action"; action: string }
  | { type: "action_any"; actions: readonly [string, ...string[]] }
) & { membershipMissingAsPbacDenied?: boolean };
