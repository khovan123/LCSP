import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import type { RequestMeta } from "../../application/contracts/auth-workspace/common.contract.ts";
import type { AcceptInvitationRequest } from "../../application/contracts/auth-workspace/accept-invitation.contract.ts";
import type { InviteDeveloperRequest } from "../../application/contracts/auth-workspace/invitation.contract.ts";
import type {
  OAuthCallbackPayload,
  OAuthStartPayload,
} from "../../application/contracts/auth-workspace/oauth.contract.ts";
import type { RegisterPayload } from "../../application/contracts/auth-workspace/register-approved-path.contract.ts";
import type {
  ConfirmRecoveryPayload,
  RequestRecoveryPayload,
} from "../../application/contracts/auth-workspace/recovery.contract.ts";
import type { CredentialPayload } from "../../application/contracts/auth-workspace/sign-in.contract.ts";
import type { WorkspaceRequest } from "../../application/contracts/auth-workspace/workspace.contract.ts";
import type { UpdateProfilePayload } from "../../application/commands/update-profile/update-profile.command.ts";
import { REVOKE_MEMBERSHIP_ERROR_CODES } from "@lcsp/contracts/auth";
import { AuthWorkspaceFacade } from "../../application/services/auth-workspace/auth-workspace.facade.ts";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import {
  PbacGuard,
  type PbacRequestContext,
} from "../../../../platform/pbac/pbac.guard.js";

interface AuthWorkspaceRequest extends Request {
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

@Controller()
export class AuthWorkspaceController {
  constructor(private readonly authWorkspaceFacade: AuthWorkspaceFacade) {}

  @Post("organizations/:orgId/invitations")
  @UseGuards(PbacGuard)
  @RequireAction("invite:developer")
  inviteDeveloper(
    @Param("orgId") orgId: string,
    @Body() payload: InviteDeveloperRequest,
    @Req() request: AuthWorkspaceRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;
    if (pbacContext.organizationId !== orgId) {
      throw new ForbiddenException({
        error_code: AUTH_ERROR_CODES.pbacDenied,
        code: AUTH_ERROR_CODES.pbacDenied,
        correlation_id: request.correlationId,
      });
    }

    return this.authWorkspaceFacade.inviteDeveloper(
      orgId,
      pbacContext.userId,
      payload,
      requestMeta(request.correlationId),
    );
  }

  @Delete("organizations/:orgId/memberships/:userId")
  @UseGuards(PbacGuard)
  @RequireAction("membership:revoke")
  revokeMembership(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string,
    @Req() request: AuthWorkspaceRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;
    if (pbacContext.organizationId !== orgId) {
      const errorCode = REVOKE_MEMBERSHIP_ERROR_CODES.organizationScopeMismatch;
      throw new BadRequestException({
        error_code: errorCode,
        code: errorCode,
        correlation_id: request.correlationId,
      });
    }

    return this.authWorkspaceFacade.revokeMembership(
      orgId,
      pbacContext.userId,
      userId,
      requestMeta(request.correlationId),
    );
  }

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

  @Post("auth/accept-invitation")
  acceptInvitation(
    @Body() payload: AcceptInvitationRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.acceptInvitation(
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
      payload,
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

  @Get("auth/oauth/start")
  oauthStart(
    @Query("provider") provider?: string,
    @Query("redirect_uri") redirectUri?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const payload: OAuthStartPayload = {
      provider,
      redirect_uri: redirectUri,
    };
    return this.authWorkspaceFacade.oauthStart(
      payload,
      requestMeta(correlationId),
    );
  }

  @Get("auth/oauth/callback")
  oauthCallback(
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("provider") provider?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const payload: OAuthCallbackPayload = { code, state, provider };
    return this.authWorkspaceFacade.oauthCallback(
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
