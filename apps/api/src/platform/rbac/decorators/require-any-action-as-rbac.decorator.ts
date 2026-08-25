import { SetMetadata } from "@nestjs/common";
import { RBAC_METADATA_TYPES } from "@lcsp/contracts/rbac";

import { RBAC_METADATA_KEY, type RbacMetadata } from "./rbac-metadata.js";

/**
 * Requires at least one RBAC action.
 *
 * @param actions - One or more RBAC actions of which at least one must be allowed.
 * @returns A Nest class/method decorator containing action-any metadata.
 */
export const RequireAnyActionAsRbac = (
  ...actions: [string, ...string[]]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, RbacMetadata>(RBAC_METADATA_KEY, {
    type: RBAC_METADATA_TYPES.actionAny,
    actions,
  });
