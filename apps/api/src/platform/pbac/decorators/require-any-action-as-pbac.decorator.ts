import { SetMetadata } from "@nestjs/common";
import { PBAC_METADATA_TYPES } from "@lcsp/contracts/pbac";

import { PBAC_METADATA_KEY, type PbacMetadata } from "./pbac-metadata.js";

/** Action-any gate whose inactive-membership error is intentionally non-enumerating. */
export const RequireAnyActionAsPbac = (
  ...actions: [string, ...string[]]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, PbacMetadata>(PBAC_METADATA_KEY, {
    type: PBAC_METADATA_TYPES.actionAny,
    actions,
    membershipMissingAsPbacDenied: true,
  });
