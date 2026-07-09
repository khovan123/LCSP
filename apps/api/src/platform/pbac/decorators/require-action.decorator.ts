import { SetMetadata } from "@nestjs/common";

import { PBAC_METADATA_KEY, type PbacMetadata } from "./pbac-metadata.js";

/** Session + active membership + evaluator allow for the given PBAC action. */
export const RequireAction = (
  action: string,
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, PbacMetadata>(PBAC_METADATA_KEY, {
    type: "action",
    action,
  });
