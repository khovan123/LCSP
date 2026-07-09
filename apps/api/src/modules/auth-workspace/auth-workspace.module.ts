import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { ConfirmPasswordRecoveryHandler } from "./application/commands/confirm-password-recovery/confirm-password-recovery.handler.ts";
import { EnrollMfaHandler } from "./application/commands/enroll-mfa/enroll-mfa.handler.ts";
import { OAuthCallbackHandler } from "./application/commands/oauth-callback/oauth-callback.handler.ts";
import { OAuthStartHandler } from "./application/commands/oauth-start/oauth-start.handler.ts";
import { RegisterApprovedPathHandler } from "./application/commands/register-approved-path/register-approved-path.handler.ts";
import { RequestPasswordRecoveryHandler } from "./application/commands/request-password-recovery/request-password-recovery.handler.ts";
import { RevokeSessionHandler } from "./application/commands/revoke-session/revoke-session.handler.ts";
import { SignInHandler } from "./application/commands/sign-in/sign-in.handler.ts";
import { UpdateProfileHandler } from "./application/commands/update-profile/update-profile.handler.ts";
import { VerifyMfaOtpHandler } from "./application/commands/verify-mfa-otp/verify-mfa-otp.handler.ts";
import { GetWorkspaceHandler } from "./application/queries/get-workspace/get-workspace.handler.ts";
import {
  AUTH_WORKSPACE_RECOVERY_NOTIFIER,
  type RecoveryNotifier,
} from "./application/ports/notification/recovery-notifier.ts";
import type { AuthWorkspaceRepositories } from "./application/ports/persistence/auth-workspace-repositories.ts";
import { AuthWorkspaceSupportService } from "./application/services/auth-workspace/auth-workspace-support.service.ts";
import { AuthWorkspaceFacade } from "./application/services/auth-workspace/auth-workspace.facade.ts";
import { NoopRecoveryNotifierService } from "./infrastructure/notification/noop-recovery-notifier.service.ts";
import { GitHubOAuthProvider } from "./infrastructure/oauth/github-oauth.provider.ts";
import { OAuthProviderRegistry } from "./infrastructure/oauth/oauth-provider.registry.ts";
import {
  PrismaAuditEventRepository,
  PrismaAuthorizationDecisionRepository,
  PrismaInvitationRepository,
  PrismaMembershipRepository,
  PrismaMfaEnrollmentRepository,
  PrismaMfaOtpUsedRepository,
  PrismaMfaRateLimitRepository,
  PrismaOAuthIdentityRepository,
  PrismaOAuthStateRepository,
  PrismaOrganizationRepository,
  PrismaPolicyRepository,
  PrismaRecoveryRequestRepository,
  PrismaSessionRepository,
  PrismaUserRepository,
} from "./infrastructure/persistence/prisma-auth-workspace.repositories.ts";
import { AuthWorkspaceController } from "./presentation/http/auth-workspace.controller.ts";

const REPOSITORY_PROVIDERS = [
  PrismaOrganizationRepository,
  PrismaUserRepository,
  PrismaMembershipRepository,
  PrismaInvitationRepository,
  PrismaSessionRepository,
  PrismaPolicyRepository,
  PrismaAuditEventRepository,
  PrismaAuthorizationDecisionRepository,
  PrismaMfaEnrollmentRepository,
  PrismaMfaRateLimitRepository,
  PrismaMfaOtpUsedRepository,
  PrismaRecoveryRequestRepository,
  PrismaOAuthStateRepository,
  PrismaOAuthIdentityRepository,
];

const AUTH_WORKSPACE_REPOSITORIES_BAG = "AUTH_WORKSPACE_REPOSITORIES_BAG";

function handlerProvider<T>(
  handlerClass: new (
    support: AuthWorkspaceSupportService,
    repositories: AuthWorkspaceRepositories,
    ...rest: never[]
  ) => T,
) {
  return {
    provide: handlerClass,
    inject: [AuthWorkspaceSupportService, AUTH_WORKSPACE_REPOSITORIES_BAG],
    useFactory: (
      support: AuthWorkspaceSupportService,
      repositories: AuthWorkspaceRepositories,
    ) => new handlerClass(support, repositories),
  };
}

@Module({
  imports: [PrismaModule],
  controllers: [AuthWorkspaceController],
  providers: [
    ...REPOSITORY_PROVIDERS,
    {
      provide: AUTH_WORKSPACE_REPOSITORIES_BAG,
      inject: REPOSITORY_PROVIDERS,
      useFactory: (
        organizations: PrismaOrganizationRepository,
        users: PrismaUserRepository,
        memberships: PrismaMembershipRepository,
        invitations: PrismaInvitationRepository,
        sessions: PrismaSessionRepository,
        policies: PrismaPolicyRepository,
        auditEvents: PrismaAuditEventRepository,
        authorizationDecisions: PrismaAuthorizationDecisionRepository,
        mfaEnrollments: PrismaMfaEnrollmentRepository,
        mfaRateLimits: PrismaMfaRateLimitRepository,
        mfaOtpUsed: PrismaMfaOtpUsedRepository,
        recoveryRequests: PrismaRecoveryRequestRepository,
        oauthStates: PrismaOAuthStateRepository,
        oauthIdentities: PrismaOAuthIdentityRepository,
      ): AuthWorkspaceRepositories => ({
        organizations,
        users,
        memberships,
        invitations,
        sessions,
        policies,
        auditEvents,
        authorizationDecisions,
        mfaEnrollments,
        mfaRateLimits,
        mfaOtpUsed,
        recoveryRequests,
        oauthStates,
        oauthIdentities,
      }),
    },
    {
      provide: AuthWorkspaceSupportService,
      useFactory: () => new AuthWorkspaceSupportService(),
    },
    {
      provide: AUTH_WORKSPACE_RECOVERY_NOTIFIER,
      useClass: NoopRecoveryNotifierService,
    },
    GitHubOAuthProvider,
    OAuthProviderRegistry,
    handlerProvider(RegisterApprovedPathHandler),
    handlerProvider(SignInHandler),
    handlerProvider(RevokeSessionHandler),
    handlerProvider(GetWorkspaceHandler),
    handlerProvider(EnrollMfaHandler),
    handlerProvider(VerifyMfaOtpHandler),
    handlerProvider(UpdateProfileHandler),
    {
      provide: RequestPasswordRecoveryHandler,
      inject: [
        AuthWorkspaceSupportService,
        AUTH_WORKSPACE_REPOSITORIES_BAG,
        AUTH_WORKSPACE_RECOVERY_NOTIFIER,
      ],
      useFactory: (
        support: AuthWorkspaceSupportService,
        repositories: AuthWorkspaceRepositories,
        notifier: RecoveryNotifier,
      ) => new RequestPasswordRecoveryHandler(support, repositories, notifier),
    },
    handlerProvider(ConfirmPasswordRecoveryHandler),
    {
      provide: OAuthStartHandler,
      inject: [
        AuthWorkspaceSupportService,
        AUTH_WORKSPACE_REPOSITORIES_BAG,
        OAuthProviderRegistry,
        ConfigService,
      ],
      useFactory: (
        support: AuthWorkspaceSupportService,
        repositories: AuthWorkspaceRepositories,
        providerRegistry: OAuthProviderRegistry,
        configService: ConfigService,
      ) =>
        new OAuthStartHandler(
          support,
          repositories,
          providerRegistry,
          configService,
        ),
    },
    {
      provide: OAuthCallbackHandler,
      inject: [
        AuthWorkspaceSupportService,
        AUTH_WORKSPACE_REPOSITORIES_BAG,
        OAuthProviderRegistry,
      ],
      useFactory: (
        support: AuthWorkspaceSupportService,
        repositories: AuthWorkspaceRepositories,
        providerRegistry: OAuthProviderRegistry,
      ) => new OAuthCallbackHandler(support, repositories, providerRegistry),
    },
    {
      provide: AuthWorkspaceFacade,
      inject: [
        RegisterApprovedPathHandler,
        SignInHandler,
        RevokeSessionHandler,
        GetWorkspaceHandler,
        EnrollMfaHandler,
        VerifyMfaOtpHandler,
        UpdateProfileHandler,
        RequestPasswordRecoveryHandler,
        ConfirmPasswordRecoveryHandler,
        OAuthStartHandler,
        OAuthCallbackHandler,
      ],
      useFactory: (
        registerApprovedPathHandler: RegisterApprovedPathHandler,
        signInHandler: SignInHandler,
        revokeSessionHandler: RevokeSessionHandler,
        getWorkspaceHandler: GetWorkspaceHandler,
        enrollMfaHandler: EnrollMfaHandler,
        verifyMfaOtpHandler: VerifyMfaOtpHandler,
        updateProfileHandler: UpdateProfileHandler,
        requestPasswordRecoveryHandler: RequestPasswordRecoveryHandler,
        confirmPasswordRecoveryHandler: ConfirmPasswordRecoveryHandler,
        oauthStartHandler: OAuthStartHandler,
        oauthCallbackHandler: OAuthCallbackHandler,
      ) =>
        new AuthWorkspaceFacade(
          registerApprovedPathHandler,
          signInHandler,
          revokeSessionHandler,
          getWorkspaceHandler,
          enrollMfaHandler,
          verifyMfaOtpHandler,
          updateProfileHandler,
          requestPasswordRecoveryHandler,
          confirmPasswordRecoveryHandler,
          oauthStartHandler,
          oauthCallbackHandler,
        ),
    },
  ],
  exports: [
    AuthWorkspaceFacade,
    // Exposed for platform/pbac's PbacGuard, which needs read access to
    // sessions/memberships/policies/MFA enrollment and write access to the
    // decision log — reusing these rather than duplicating the same Prisma
    // queries in a second, potentially-diverging implementation.
    PrismaSessionRepository,
    PrismaMembershipRepository,
    PrismaPolicyRepository,
    PrismaMfaEnrollmentRepository,
    PrismaAuthorizationDecisionRepository,
  ],
})
export class AuthWorkspaceModule {}
