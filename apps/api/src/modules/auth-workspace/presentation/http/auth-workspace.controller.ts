import {
  Body,
  Controller,
  Delete,
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
  SUBJECT_ROLES,
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
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";

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
      throw problemException(
        AUTH_ERROR_CODES.pbacDenied,
        request.correlationId as string,
        { status: HttpStatus.FORBIDDEN },
      );
    }
    const memberships = await this.prisma.authMembership.findMany({
      where: {
        organizationId: orgId,
        policy: { subjectRole: SUBJECT_ROLES.developer },
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        policy: { select: { actions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return resultEnvelope(
      memberships.map((membership) => ({
        user_id: membership.user.id,
        email: membership.user.email,
        display_name: membership.user.displayName,
        status: membership.status,
        allowed_actions: membership.policy.actions,
        subject_attributes: membership.subjectAttributes,
        revoked_at: membership.revokedAt,
      })),
    );
  }

  @Post("organizations/:orgId/invitations")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.inviteDeveloper)
  async inviteDeveloper(
    @Param("orgId") orgId: string,
    @Body() payload: InviteDeveloperRequest,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;
    if (pbacContext.organizationId !== orgId) {
      throw problemException(
        AUTH_ERROR_CODES.pbacDenied,
        request.correlationId as string,
        { status: HttpStatus.FORBIDDEN },
      );
    }

    return resultEnvelope(
      await this.authWorkspaceFacade.inviteDeveloper(
        orgId,
        pbacContext.userId,
        payload,
        requestMeta(request.correlationId),
      ),
    );
  }

  @Delete("organizations/:orgId/memberships/:userId")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.membershipRevoke)
  async revokeMembership(
    @Param("orgId") orgId: string,
    @Param("userId") userId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;
    if (pbacContext.organizationId !== orgId) {
      const errorCode = REVOKE_MEMBERSHIP_ERROR_CODES.organizationScopeMismatch;
      throw problemException(errorCode, request.correlationId as string, {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return resultEnvelope(
      await this.authWorkspaceFacade.revokeMembership(
        orgId,
        pbacContext.userId,
        userId,
        requestMeta(request.correlationId),
      ),
    );
  }

  @Post("auth/register-approved-path")
  async registerApprovedPath(
    @Body() payload: RegisterPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.registerApprovedPath(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Post("auth/accept-invitation")
  async acceptInvitation(
    @Body() payload: AcceptInvitationRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.acceptInvitation(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Post("auth/invitations/preview")
  @HttpCode(HttpStatus.OK)
  async previewInvitation(
    @Body() payload: InvitationPreviewRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.previewInvitation(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Post("auth/sign-in")
  async signIn(
    @Body() payload: CredentialPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.signIn(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Post("auth/revoke-session")
  async revokeSession(
    @Body() body: { session_token?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.revokeSession(
        body.session_token ?? "",
        requestMeta(correlationId),
      ),
    );
  }

  @Get("workspace")
  @UseGuards(PbacGuard)
  @RequireSession()
  async getWorkspace(
    @Req() request: AuthenticatedRequest,
    @Query("organization_id") organizationId?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const workspaceRequest: WorkspaceRequest = {
      organization_id: organizationId,
      session_token: bearerToken(authorization),
      correlation_id: request.correlationId,
    };
    return resultEnvelope(
      await this.authWorkspaceFacade.getWorkspace(workspaceRequest),
    );
  }

  @Get("workspace/developer-task")
  @UseGuards(PbacGuard)
  @RequireAnyActionAsPbac(...DEVELOPER_ALLOWED_ACTION_VALUES)
  async getDeveloperTaskContext(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.authWorkspaceFacade.getDeveloperTaskContext(
        request.pbacContext,
        request.correlationId!,
      ),
    );
  }

  @Post("auth/mfa/enroll")
  @UseGuards(PbacGuard)
  @RequireSession()
  async enrollMfa(
    @Body() body: { session_token?: string },
    @Headers("authorization") authorization: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.enrollMfa(
        bearerToken(authorization) ?? body.session_token ?? "",
        requestMeta(request.correlationId),
      ),
    );
  }

  @Post("auth/mfa/verify-otp")
  async verifyMfaOtp(
    @Body() body: { session_token?: string; otp?: string },
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.verifyMfaOtp(
        body.session_token ?? "",
        body.otp ?? "",
        requestMeta(correlationId),
      ),
    );
  }

  @Patch("auth/profile")
  @UseGuards(PbacGuard)
  @RequireSession()
  async updateProfile(
    @Body() body: UpdateProfilePayload & { session_token?: string },
    @Headers("authorization") authorization: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const { session_token, ...payload } = body;
    return resultEnvelope(
      await this.authWorkspaceFacade.updateProfile(
        bearerToken(authorization) ?? session_token ?? "",
        payload,
        requestMeta(request.correlationId),
      ),
    );
  }

  @Post("auth/recovery/request")
  async requestPasswordRecovery(
    @Body() payload: RequestRecoveryPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.requestPasswordRecovery(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Post("auth/recovery/confirm")
  async confirmPasswordRecovery(
    @Body() payload: ConfirmRecoveryPayload,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.authWorkspaceFacade.confirmPasswordRecovery(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Get("auth/oauth/start")
  async oauthStart(
    @Query("provider") provider?: string,
    @Query("redirect_uri") redirectUri?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const payload: OAuthStartPayload = {
      provider,
      redirect_uri: redirectUri,
    };
    return resultEnvelope(
      await this.authWorkspaceFacade.oauthStart(
        payload,
        requestMeta(correlationId),
      ),
    );
  }

  @Get("auth/oauth/callback")
  async oauthCallback(
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("provider") provider?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    const payload: OAuthCallbackPayload = { code, state, provider };
    return resultEnvelope(
      await this.authWorkspaceFacade.oauthCallback(
        payload,
        requestMeta(correlationId),
      ),
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
