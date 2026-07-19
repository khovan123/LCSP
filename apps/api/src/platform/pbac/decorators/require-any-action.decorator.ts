import { SetMetadata } from "@nestjs/common";

import { PBAC_METADATA_KEY, type PbacMetadata } from "./pbac-metadata.js";

export const RequireAnyAction = (
  ...actions: [string, ...string[]]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, PbacMetadata>(PBAC_METADATA_KEY, {
    type: "action_any",
    actions,
  });
