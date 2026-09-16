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
import { CommandBus, QueryBus } from "@nestjs/cqrs";

import {
  checkSensitiveRouteSchema,
  confirmPasswordRecoverySchema,
  oauthCallbackSchema,
  oauthLinkCallbackSchema,
  oauthLinkStartSchema,
  oauthStartSchema,
  passwordReauthSchema,
  recordMfaRecoveryCodeAccessSchema,
  requestPasswordRecoverySchema,
  revokeSessionSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  verifyMfaOtpSchema,
  verifyMfaRecoveryCodeSchema,
  type CheckSensitiveRouteInput,
  type ConfirmPasswordRecoveryInput,
  type OAuthCallbackInput,
  type OAuthLinkCallbackInput,
  type OAuthLinkStartInput,
  type OAuthStartInput,
  type PasswordReauthInput,
  type RecordMfaRecoveryCodeAccessInput,
  type RequestPasswordRecoveryInput,
  type RevokeSessionInput,
  type SignInInput,
  type SignUpInput,
  type UpdateProfileInput,
  type VerifyMfaOtpInput,
  type VerifyMfaRecoveryCodeInput,
} from "@lcsp/contracts/auth";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe.ts";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { AllowPendingMfa } from "../../../../platform/rbac/decorators/allow-pending-mfa.decorator.js";
import { RequireSession } from "../../../../platform/rbac/decorators/require-session.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { ReAuthForSensitiveRoute } from "../../../../platform/security/decorators/re-auth-for-sensitive-route.decorator.js";
import { SENSITIVE_ROUTE_IDS } from "../../../../platform/security/sensitive-route-policy.js";
import {
  ConfirmPasswordRecoveryCommand,
  DisableMfaCommand,
  EnrollMfaCommand,
  GenerateMfaRecoveryCodesCommand,
  OAuthCallbackCommand,
  OAuthLinkCallbackCommand,
  OAuthLinkStartCommand,
  OAuthStartCommand,
  ReauthenticatePasswordCommand,
  RecordMfaRecoveryCodeAccessCommand,
  RequestPasswordRecoveryCommand,
  RevokeOwnedSessionCommand,
  RevokeSessionCommand,
  SignInCommand,
  SignUpCommand,
  UpdateProfileCommand,
  VerifyMfaOtpCommand,
  VerifyMfaRecoveryCodeCommand,
} from "../../application/commands/index.ts";
import type {
  RequestMeta,
  SensitiveRouteCheckDto,
} from "../../application/contracts/auth-workspace/index.ts";
import {
  CheckSensitiveRouteQuery,
  GetAuthProfileQuery,
  GetWorkspaceQuery,
  ListAuthRepositoriesQuery,
  ListAuthSessionsQuery,
} from "../../application/queries/index.ts";

@Controller()
export class AuthWorkspaceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("auth/sign-in")
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) payload: SignInInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new SignInCommand(payload, requestMeta(correlationId)),
      ),
    );
  }

  @Post("auth/sign-up")
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) payload: SignUpInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new SignUpCommand({
          email: payload.email,
          displayName: payload.display_name ?? payload.name ?? "",
          password: payload.password,
          correlationId: requestMeta(correlationId).correlationId,
        }),
      ),
    );
  }

  @Post("auth/revoke-session")
  async revokeSession(
    @Body(new ZodValidationPipe(revokeSessionSchema)) body: RevokeSessionInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RevokeSessionCommand(
          body.session_token,
          requestMeta(correlationId),
        ),
      ),
    );
  }

  @Get("workspace")
  @UseGuards(RbacGuard)
  @RequireSession()
  async getWorkspace(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.queryBus.execute(
        new GetWorkspaceQuery(
          request.rbacContext,
          request.correlationId,
        ),
      ),
    );
  }

  @Post("auth/mfa/enroll")
  @UseGuards(RbacGuard)
  @RequireSession()
  @AllowPendingMfa()
  async enrollMfa(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.commandBus.execute(
        new EnrollMfaCommand(
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Delete("auth/mfa")
  @UseGuards(RbacGuard)
  @RequireSession()
  async disableMfa(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.commandBus.execute(
        new DisableMfaCommand(
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Post("auth/mfa/verify-otp")
  async verifyMfaOtp(
    @Body(new ZodValidationPipe(verifyMfaOtpSchema)) body: VerifyMfaOtpInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new VerifyMfaOtpCommand(
          body.session_token,
          body.otp,
          requestMeta(correlationId),
        ),
      ),
    );
  }

  @Post("auth/mfa/recovery-code/verify")
  async verifyMfaRecoveryCode(
    @Body(new ZodValidationPipe(verifyMfaRecoveryCodeSchema))
    body: VerifyMfaRecoveryCodeInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new VerifyMfaRecoveryCodeCommand(
          body.session_token,
          body.code,
          requestMeta(correlationId),
        ),
      ),
    );
  }

  @Post("auth/mfa/recovery-codes")
  @UseGuards(RbacGuard)
  @RequireSession()
  @ReAuthForSensitiveRoute({
    routeId: SENSITIVE_ROUTE_IDS.mfaRecoveryCodesGenerate,
    method: "POST",
    pathTemplate: "/auth/mfa/recovery-codes",
    aliases: [{ method: "POST", pathTemplate: "/api/auth/mfa/recovery-codes" }],
  })
  async generateMfaRecoveryCodes(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.commandBus.execute(
        new GenerateMfaRecoveryCodesCommand(
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Post("auth/mfa/recovery-codes/access")
  @UseGuards(RbacGuard)
  @RequireSession()
  async recordMfaRecoveryCodeAccess(
    @Body(new ZodValidationPipe(recordMfaRecoveryCodeAccessSchema))
    body: RecordMfaRecoveryCodeAccessInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RecordMfaRecoveryCodeAccessCommand(
          request.rbacContext.userId,
          body.action,
          request.rbacContext.sessionId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Post("auth/re-auth/password")
  @UseGuards(RbacGuard)
  @RequireSession()
  @AllowPendingMfa()
  async reauthenticatePassword(
    @Body(new ZodValidationPipe(passwordReauthSchema)) body: PasswordReauthInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new ReauthenticatePasswordCommand(
          body.password,
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Post("auth/sensitive-route/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @RequireSession()
  @AllowPendingMfa()
  async checkSensitiveRoute(
    @Body(new ZodValidationPipe(checkSensitiveRouteSchema))
    body: CheckSensitiveRouteInput,
    @Req() request: AuthenticatedRequest,
  ) {
    const route = body.path ?? body.route ?? "";
    return resultEnvelope(
      await this.queryBus.execute<
        CheckSensitiveRouteQuery,
        SensitiveRouteCheckDto
      >(
        new CheckSensitiveRouteQuery(
          request.rbacContext.sessionId,
          body.method,
          route,
        ),
      ),
    );
  }

  @Patch("auth/profile")
  @UseGuards(RbacGuard)
  @RequireSession()
  async updateProfile(
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new UpdateProfileCommand(
          body,
          request.rbacContext.userId,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Get("auth/profile")
  @UseGuards(RbacGuard)
  @RequireSession()
  async getProfile(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.queryBus.execute(
        new GetAuthProfileQuery(request.rbacContext, request.correlationId!),
      ),
    );
  }

  @Get("auth/sessions")
  @UseGuards(RbacGuard)
  @RequireSession()
  async listSessions(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.queryBus.execute(
        new ListAuthSessionsQuery(request.rbacContext),
      ),
    );
  }

  @Delete("auth/sessions/:sessionId")
  @UseGuards(RbacGuard)
  @RequireSession()
  async revokeOwnedSession(
    @Param("sessionId") sessionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RevokeOwnedSessionCommand(
          sessionId,
          request.rbacContext,
          requestMeta(request.correlationId),
        ),
      ),
    );
  }

  @Get("auth/repositories")
  @UseGuards(RbacGuard)
  @RequireSession()
  async listRepositories(@Req() request: AuthenticatedRequest) {
    return resultEnvelope(
      await this.queryBus.execute(
        new ListAuthRepositoriesQuery(request.rbacContext),
      ),
    );
  }

  @Post("auth/recovery/request")
  async requestPasswordRecovery(
    @Body(new ZodValidationPipe(requestPasswordRecoverySchema))
    payload: RequestPasswordRecoveryInput,
    @Headers("x-correlation-id") correlationId?: string,
    @Headers("x-app-origin") appOrigin?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RequestPasswordRecoveryCommand(
          payload,
          requestMeta(correlationId, appOrigin),
        ),
      ),
    );
  }

  @Post("auth/recovery/confirm")
  async confirmPasswordRecovery(
    @Body(new ZodValidationPipe(confirmPasswordRecoverySchema))
    payload: ConfirmPasswordRecoveryInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new ConfirmPasswordRecoveryCommand(payload, requestMeta(correlationId)),
      ),
    );
  }

  @Get("auth/oauth/start")
  async oauthStart(
    @Query(new ZodValidationPipe(oauthStartSchema)) query: OAuthStartInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new OAuthStartCommand(query, requestMeta(correlationId)),
      ),
    );
  }

  @Get("auth/oauth/callback")
  async oauthCallback(
    @Query(new ZodValidationPipe(oauthCallbackSchema)) query: OAuthCallbackInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new OAuthCallbackCommand(query, requestMeta(correlationId)),
      ),
    );
  }

  @Get("auth/oauth/link/start")
  @UseGuards(RbacGuard)
  @RequireSession()
  async oauthLinkStart(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(oauthLinkStartSchema)) query: OAuthLinkStartInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new OAuthLinkStartCommand(
          query,
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(correlationId),
        ),
      ),
    );
  }

  @Get("auth/oauth/link/callback")
  @UseGuards(RbacGuard)
  @RequireSession()
  async oauthLinkCallback(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(oauthLinkCallbackSchema))
    query: OAuthLinkCallbackInput,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new OAuthLinkCallbackCommand(
          query,
          request.rbacContext.userId,
          request.rbacContext.sessionId,
          requestMeta(correlationId),
        ),
      ),
    );
  }
}

function requestMeta(correlationId?: string, appOrigin?: string): RequestMeta {
  return {
    ...(correlationId ? { correlationId: correlationId } : {}),
    ...(appOrigin ? { app_origin: appOrigin } : {}),
  };
}

