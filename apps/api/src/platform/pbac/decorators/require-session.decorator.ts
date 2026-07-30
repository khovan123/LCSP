import { SetMetadata } from "@nestjs/common";
import { PBAC_METADATA_TYPES } from "@lcsp/contracts/pbac";

import { PBAC_METADATA_KEY, type PbacMetadata } from "./pbac-metadata.js";

/** Session + active membership only — no PBAC action check. */
export const RequireSession = (): MethodDecorator & ClassDecorator =>
  SetMetadata<string, PbacMetadata>(PBAC_METADATA_KEY, {
    type: PBAC_METADATA_TYPES.session,
  });
