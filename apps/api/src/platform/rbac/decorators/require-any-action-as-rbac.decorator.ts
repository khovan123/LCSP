import { SetMetadata } from "@nestjs/common";
import { RBAC_METADATA_TYPES } from "@lcsp/contracts/rbac";

import { RBAC_METADATA_KEY, type RbacMetadata } from "./rbac-metadata.js";

/**
 * Requires at least one RBAC action while intentionally mapping missing membership to a non-enumerating RBAC denial.
 *
 * @param actions - One or more RBAC actions of which at least one must be allowed.
 * @returns A Nest class/method decorator containing the action-any metadata and denial behavior.
 */
export const RequireAnyActionAsRbac = (
  ...actions: [string, ...string[]]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, RbacMetadata>(RBAC_METADATA_KEY, {
    type: RBAC_METADATA_TYPES.actionAny,
    actions,
    membershipMissingAsRbacDenied: true,
  });
