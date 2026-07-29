import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  DEVELOPER_ALLOWED_ACTION_VALUES,
  PBAC_ACTIONS,
} from "@lcsp/contracts/pbac";

import type { RequestMeta } from "../../application/contracts/auth-workspace/common.contract.ts";
import type { AcceptInvitationRequest } from "../../application/contracts/auth-workspace/accept-invitation.contract.ts";
import type { InvitationPreviewRequest } from "../../application/contracts/auth-workspace/invitation-preview.contract.ts";
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
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { RequireAnyActionAsPbac } from "../../../../platform/pbac/decorators/require-any-action-as-pbac.decorator.js";
import { RequireSession } from "../../../../platform/pbac/decorators/require-session.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";

@Controller()
export class AuthWorkspaceController {
  constructor(
    private readonly authWorkspaceFacade: AuthWorkspaceFacade,
    private readonly prisma: PrismaService,
  ) {}

  @Get("organizations/:orgId/developers")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.inviteDeveloper)
  async listDevelopers(
    @Param("orgId") orgId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (request.pbacContext.organizationId !== orgId) {
      throw new ForbiddenException({ error_code: AUTH_ERROR_CODES.pbacDenied });
    }
    const memberships = await this.prisma.authMembership.findMany({
      where: { organizationId: orgId, policy: { subjectRole: "Developer" } },
      include: { user: { select: { id: true, email: true, displayName: true } }, policy: { select: { actions: true } } },
      orderBy: { createdAt: "desc" },
    });
    return memberships.map((membership) => ({
      user_id: membership.user.id,
      email: membership.user.email,
      display_name: membership.user.displayName,
      status: membership.status,
      allowed_actions: membership.policy.actions,
      subject_attributes: membership.subjectAttributes,
      revoked_at: membership.revokedAt,
    }));
  }

  @Post("organizations/:orgId/invitations")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.inviteDeveloper)
  inviteDeveloper(
    @Param("orgId") orgId: string,
    @Body() payload: InviteDeveloperRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;
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
  @RequireAction(PBAC_ACTIONS.membershipRevoke)
  revokeMembership(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;
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

  @Post("auth/invitations/preview")
  @HttpCode(HttpStatus.OK)
  previewInvitation(
    @Body() payload: InvitationPreviewRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return this.authWorkspaceFacade.previewInvitation(
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
  @UseGuards(PbacGuard)
  @RequireSession()
  getWorkspace(
    @Req() request: AuthenticatedRequest,
    @Query("organization_id") organizationId?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const workspaceRequest: WorkspaceRequest = {
      organization_id: organizationId,
      session_token: bearerToken(authorization),
      correlation_id: request.correlationId,
    };
    return this.authWorkspaceFacade.getWorkspace(workspaceRequest);
  }

  @Get("workspace/developer-task")
  @UseGuards(PbacGuard)
  @RequireAnyActionAsPbac(...DEVELOPER_ALLOWED_ACTION_VALUES)
  getDeveloperTaskContext(@Req() request: AuthenticatedRequest) {
    return this.authWorkspaceFacade.getDeveloperTaskContext(
      request.pbacContext,
      request.correlationId!,
    );
  }

  @Post("auth/mfa/enroll")
  @UseGuards(PbacGuard)
  @RequireSession()
  enrollMfa(
    @Body() body: { session_token?: string },
    @Headers("authorization") authorization: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authWorkspaceFacade.enrollMfa(
      bearerToken(authorization) ?? body.session_token ?? "",
      requestMeta(request.correlationId),
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
  @UseGuards(PbacGuard)
  @RequireSession()
  updateProfile(
    @Body() body: UpdateProfilePayload & { session_token?: string },
    @Headers("authorization") authorization: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const { session_token, ...payload } = body;
    return this.authWorkspaceFacade.updateProfile(
      bearerToken(authorization) ?? session_token ?? "",
      payload,
      requestMeta(request.correlationId),
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
