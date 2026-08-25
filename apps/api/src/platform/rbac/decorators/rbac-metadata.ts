import { RBAC_ACTIONS, RBAC_METADATA_TYPES } from "@lcsp/contracts/rbac";

export const RBAC_METADATA_KEY = RBAC_ACTIONS.metadataCheck;

export type RbacMetadata = (
  | { type: typeof RBAC_METADATA_TYPES.session }
  | { type: typeof RBAC_METADATA_TYPES.action; action: string }
  | {
      type: typeof RBAC_METADATA_TYPES.actionAny;
      actions: readonly [string, ...string[]];
    }
) & {
  membershipMissingAsRbacDenied?: boolean;
};
