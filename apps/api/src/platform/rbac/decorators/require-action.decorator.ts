import { SetMetadata } from "@nestjs/common";
import { RBAC_METADATA_TYPES } from "@lcsp/contracts/rbac";

import { RBAC_METADATA_KEY, type RbacMetadata } from "./rbac-metadata.js";

/**
 * Requires an authenticated session and an allow decision for one RBAC action.
 *
 * @param action - RBAC action that the current principal must be allowed to perform.
 * @returns A Nest class/method decorator containing the required RBAC action metadata.
 */
export const RequireAction = (
  action: string,
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, RbacMetadata>(RBAC_METADATA_KEY, {
    type: RBAC_METADATA_TYPES.action,
    action,
  });
