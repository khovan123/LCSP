import { SetMetadata } from "@nestjs/common";

export const ALLOW_PENDING_MFA_METADATA_KEY = "pbac:allow_pending_mfa";

export const AllowPendingMfa = (): MethodDecorator & ClassDecorator =>
  SetMetadata<string, true>(ALLOW_PENDING_MFA_METADATA_KEY, true);
