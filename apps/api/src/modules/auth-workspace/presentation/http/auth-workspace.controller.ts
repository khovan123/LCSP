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
  AUTH_ERROR_CODES,
  MFA_RECOVERY_CODE_ACCESS_ACTIONS,
  type MfaRecoveryCodeAccessAction,
} from "@lcsp/contracts/auth";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
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
import {
  CheckSensitiveRouteDto,
  ConfirmPasswordRecoveryDto,
  OAuthCallbackQueryDto,
  OAuthLinkCallbackQueryDto,
  OAuthLinkStartQueryDto,
  OAuthStartQueryDto,
  PasswordReauthDto,
  RecordMfaRecoveryCodeAccessDto,
  RequestPasswordRecoveryDto,
  RevokeSessionDto,
  SignInDto,
  SignUpDto,
  UpdateProfileDto,
  VerifyMfaOtpDto,
  VerifyMfaRecoveryCodeDto,
} from "./dto/index.ts";


const MFA_RECOVERY_CODE_ACCESS_ACTION_VALUES = Object.values(
  MFA_RECOVERY_CODE_ACCESS_ACTIONS,
);

@Controller()
export class AuthWorkspaceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("auth/sign-in")
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() payload: SignInDto,
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
    @Body() payload: SignUpDto,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new SignUpCommand({
          email: payload.email,
          displayName: payload.display_name,
          password: payload.password,
          correlationId: requestMeta(correlationId).correlationId,
        }),
      ),
    );
  }

  @Post("auth/revoke-session")
  async revokeSession(
    @Body() body: RevokeSessionDto,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RevokeSessionCommand(
          body.session_token ?? "",
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
    @Body() body: VerifyMfaOtpDto,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new VerifyMfaOtpCommand(
          body.session_token ?? "",
          body.otp ?? "",
          requestMeta(correlationId),
        ),
      ),
    );
  }

  @Post("auth/mfa/recovery-code/verify")
  async verifyMfaRecoveryCode(
    @Body() body: VerifyMfaRecoveryCodeDto,
    @Headers("x-correlation-id") correlationId?: string,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new VerifyMfaRecoveryCodeCommand(
          body.session_token ?? "",
          body.code ?? "",
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
    @Body() body: RecordMfaRecoveryCodeAccessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const action =
      typeof body.action === "string" &&
      MFA_RECOVERY_CODE_ACCESS_ACTION_VALUES.includes(
        body.action as MfaRecoveryCodeAccessAction,
      )
        ? (body.action as MfaRecoveryCodeAccessAction)
        : null;

    if (!action) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        request.correlationId!,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    return resultEnvelope(
      await this.commandBus.execute(
        new RecordMfaRecoveryCodeAccessCommand(
          request.rbacContext.userId,
          action,
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
    @Body() body: PasswordReauthDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new ReauthenticatePasswordCommand(
          body.password ?? "",
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
    @Body() body: CheckSensitiveRouteDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const method = typeof body.method === "string" ? body.method : "";
    const route =
      typeof body.path === "string"
        ? body.path
        : typeof body.route === "string"
          ? body.route
          : "";

    if (method.trim().length === 0 || route.trim().length === 0) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        request.correlationId!,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    return resultEnvelope(
      await this.queryBus.execute<
        CheckSensitiveRouteQuery,
        SensitiveRouteCheckDto
      >(
        new CheckSensitiveRouteQuery(
          request.rbacContext.sessionId,
          method,
          route,
        ),
      ),
    );
  }

  @Patch("auth/profile")
  @UseGuards(RbacGuard)
  @RequireSession()
  async updateProfile(
    @Body() body: UpdateProfileDto,
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
    @Body() payload: RequestPasswordRecoveryDto,
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
    @Body() payload: ConfirmPasswordRecoveryDto,
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
    @Query() query: OAuthStartQueryDto,
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
    @Query() query: OAuthCallbackQueryDto,
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
    @Query() query: OAuthLinkStartQueryDto,
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
    @Query() query: OAuthLinkCallbackQueryDto,
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

