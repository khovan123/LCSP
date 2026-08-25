import { SetMetadata } from "@nestjs/common";
import { RBAC_METADATA_TYPES } from "@lcsp/contracts/rbac";

import { RBAC_METADATA_KEY, type RbacMetadata } from "./rbac-metadata.js";

/**
 * Requires an authenticated principal to be allowed to perform at least one of the supplied RBAC actions.
 *
 * @param actions - One or more RBAC actions of which at least one must be allowed.
 * @returns A Nest class/method decorator containing the action-any metadata.
 */
export const RequireAnyAction = (
  ...actions: [string, ...string[]]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, RbacMetadata>(RBAC_METADATA_KEY, {
    type: RBAC_METADATA_TYPES.actionAny,
    actions,
  });
