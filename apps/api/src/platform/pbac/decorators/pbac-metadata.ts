import { PBAC_ACTIONS, PBAC_METADATA_TYPES } from "@lcsp/contracts/pbac";

export const PBAC_METADATA_KEY = PBAC_ACTIONS.metadataCheck;

export type PbacMetadata = (
  | { type: typeof PBAC_METADATA_TYPES.session }
  | { type: typeof PBAC_METADATA_TYPES.action; action: string }
  | {
      type: typeof PBAC_METADATA_TYPES.actionAny;
      actions: readonly [string, ...string[]];
    }
) & { membershipMissingAsPbacDenied?: boolean };
