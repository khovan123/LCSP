import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import type { RequestMeta } from "../../application/contracts/auth-workspace/common.contract.ts";
import type { RegisterPayload } from "../../application/contracts/auth-workspace/register-approved-path.contract.ts";
import type {
  ConfirmRecoveryPayload,
  RequestRecoveryPayload,
} from "../../application/contracts/auth-workspace/recovery.contract.ts";
import type { CredentialPayload } from "../../application/contracts/auth-workspace/sign-in.contract.ts";
import type { WorkspaceRequest } from "../../application/contracts/auth-workspace/workspace.contract.ts";
import type { UpdateProfilePayload } from "../../application/commands/update-profile/update-profile.command.ts";
import { AuthWorkspaceFacade } from "../../application/services/auth-workspace/auth-workspace.facade.ts";

@Controller()
export class AuthWorkspaceController {
  constructor(private readonly authWorkspaceFacade: AuthWorkspaceFacade) {}

  @Post("auth/register-approved-path")
  registerApprovedPath(
    @Body() payload: RegisterPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.registerApprovedPath(
      payload,
      requestMeta(correlationId),
    );
  }

  @Post("auth/sign-in")
  signIn(
    @Body() payload: CredentialPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.signIn(payload, requestMeta(correlationId));
  }

  @Post("auth/revoke-session")
  revokeSession(
    @Body() body: { session_token?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.revokeSession(
      body.session_token ?? "",
      requestMeta(correlationId),
    );
  }

  @Get("workspace")
  getWorkspace(
    @Query("organization_id") organizationId?: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const request: WorkspaceRequest = {
      organization_id: organizationId,
      session_token: bearerToken(authorization),
      correlation_id: correlationId,
    };
    return this.authWorkspaceFacade.getWorkspace(request);
  }

  @Post("auth/mfa/enroll")
  enrollMfa(
    @Body() body: { session_token?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.enrollMfa(
      body.session_token ?? "",
      requestMeta(correlationId),
    );
  }

  @Post("auth/mfa/verify-otp")
  verifyMfaOtp(
    @Body() body: { session_token?: string; otp?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.verifyMfaOtp(
      body.session_token ?? "",
      body.otp ?? "",
      requestMeta(correlationId),
    );
  }

  @Patch("auth/profile")
  updateProfile(
    @Body() body: UpdateProfilePayload & { session_token?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const { session_token, ...payload } = body;
    return this.authWorkspaceFacade.updateProfile(
      session_token ?? "",
      payload as UpdateProfilePayload,
      requestMeta(correlationId),
    );
  }

  @Post("auth/recovery/request")
  requestPasswordRecovery(
    @Body() payload: RequestRecoveryPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.requestPasswordRecovery(
      payload,
      requestMeta(correlationId),
    );
  }

  @Post("auth/recovery/confirm")
  confirmPasswordRecovery(
    @Body() payload: ConfirmRecoveryPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.confirmPasswordRecovery(
      payload,
      requestMeta(correlationId),
    );
  }
}

function requestMeta(correlationId?: string): RequestMeta {
  return correlationId ? { correlation_id: correlationId } : {};
}

function bearerToken(authorization?: string): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}
