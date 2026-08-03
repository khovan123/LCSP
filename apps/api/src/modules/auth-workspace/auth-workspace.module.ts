import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module.js";
import { PrismaService } from "../../infrastructure/prisma/prisma.service.js";
import { AuditModule } from "../../platform/audit/audit.module.js";
import { AcceptInvitationHandler } from "./application/commands/accept-invitation/accept-invitation.handler.ts";
import { ConfirmPasswordRecoveryHandler } from "./application/commands/confirm-password-recovery/confirm-password-recovery.handler.ts";
import { DisableMfaHandler } from "./application/commands/disable-mfa/disable-mfa.handler.ts";
import { EnrollMfaHandler } from "./application/commands/enroll-mfa/enroll-mfa.handler.ts";
import { InviteDeveloperHandler } from "./application/commands/invite-developer/invite-developer.handler.ts";
import { OAuthCallbackHandler } from "./application/commands/oauth-callback/oauth-callback.handler.ts";
import { OAuthStartHandler } from "./application/commands/oauth-start/oauth-start.handler.ts";
import { RegisterApprovedPathHandler } from "./application/commands/register-approved-path/register-approved-path.handler.ts";
import { RevokeMembershipHandler } from "./application/commands/revoke-membership/revoke-membership.handler.ts";
import { RequestPasswordRecoveryHandler } from "./application/commands/request-password-recovery/request-password-recovery.handler.ts";
import { ReauthenticatePasswordHandler } from "./application/commands/reauthenticate-password/reauthenticate-password.handler.ts";
import { RevokeOwnedSessionHandler } from "./application/commands/revoke-owned-session/revoke-owned-session.handler.ts";
import { RevokeSessionHandler } from "./application/commands/revoke-session/revoke-session.handler.ts";
import { SignInHandler } from "./application/commands/sign-in/sign-in.handler.ts";
import { UpdateProfileHandler } from "./application/commands/update-profile/update-profile.handler.ts";
import { VerifyMfaOtpHandler } from "./application/commands/verify-mfa-otp/verify-mfa-otp.handler.ts";
import { GetWorkspaceHandler } from "./application/queries/get-workspace/get-workspace.handler.ts";
import { GetAuthProfileHandler } from "./application/queries/get-auth-profile/get-auth-profile.handler.ts";
import { GetDeveloperTaskContextHandler } from "./application/queries/get-developer-task-context/get-developer-task-context.handler.ts";
import { ListAuthRepositoriesHandler } from "./application/queries/list-auth-repositories/list-auth-repositories.handler.ts";
import { ListAuthSessionsHandler } from "./application/queries/list-auth-sessions/list-auth-sessions.handler.ts";
import { PreviewInvitationHandler } from "./application/queries/preview-invitation/preview-invitation.handler.ts";
import {
  AUTH_WORKSPACE_RECOVERY_NOTIFIER,
  type RecoveryNotifier,
} from "./application/ports/notification/recovery-notifier.ts";
import { AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY } from "./application/ports/persistence/assessment-scope.repository.ts";
import type { AssessmentScopeRepository } from "./application/ports/persistence/assessment-scope.repository.ts";
import type { AuthWorkspaceRepositories } from "./application/ports/persistence/auth-workspace-repositories.ts";
import { AuthAuditService } from "./application/services/auth-workspace/auth-audit.service.ts";
import { AuthWorkspaceSupportService } from "./application/services/auth-workspace/auth-workspace-support.service.ts";
import { AuthWorkspaceFacade } from "./application/services/auth-workspace/auth-workspace.facade.ts";
import { RecoveryEmailNotifierService } from "./infrastructure/notification/recovery-email-notifier.service.ts";
import { GitHubOAuthProvider } from "./infrastructure/oauth/github-oauth.provider.ts";
import { GoogleOAuthProvider } from "./infrastructure/oauth/google-oauth.provider.ts";
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
import { PrismaAssessmentScopeRepository } from "./infrastructure/persistence/prisma-assessment-scope.repository.ts";
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
  PrismaAssessmentScopeRepository,
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
  imports: [PrismaModule, AuditModule],
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
      inject: [AuthAuditService],
      useFactory: (authAudit: AuthAuditService) =>
        new AuthWorkspaceSupportService(authAudit),
    },
    {
      provide: AUTH_WORKSPACE_RECOVERY_NOTIFIER,
      useClass: RecoveryEmailNotifierService,
    },
    GitHubOAuthProvider,
    GoogleOAuthProvider,
    OAuthProviderRegistry,
    AuthAuditService,
    handlerProvider(RegisterApprovedPathHandler),
    {
      provide: AcceptInvitationHandler,
      inject: [PrismaService, AuthAuditService],
      useFactory: (prisma: PrismaService, authAudit: AuthAuditService) =>
        new AcceptInvitationHandler(prisma, authAudit),
    },
    {
      provide: PreviewInvitationHandler,
      inject: [PrismaService, AuthAuditService],
      useFactory: (prisma: PrismaService, authAudit: AuthAuditService) =>
        new PreviewInvitationHandler(prisma, authAudit),
    },
    {
      provide: RevokeMembershipHandler,
      inject: [PrismaService, AuthAuditService],
      useFactory: (prisma: PrismaService, authAudit: AuthAuditService) =>
        new RevokeMembershipHandler(prisma, authAudit),
    },
    {
      provide: GetDeveloperTaskContextHandler,
      inject: [
        PrismaService,
        AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY,
        AuthAuditService,
      ],
      useFactory: (
        prisma: PrismaService,
        assessmentScopes: AssessmentScopeRepository,
        authAudit: AuthAuditService,
      ) =>
        new GetDeveloperTaskContextHandler(prisma, assessmentScopes, authAudit),
    },
    {
      provide: AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY,
      useExisting: PrismaAssessmentScopeRepository,
    },
    handlerProvider(SignInHandler),
    handlerProvider(RevokeSessionHandler),
    {
      provide: RevokeOwnedSessionHandler,
      inject: [PrismaService, AuthWorkspaceSupportService],
      useFactory: (
        prisma: PrismaService,
        support: AuthWorkspaceSupportService,
      ) => new RevokeOwnedSessionHandler(prisma, support),
    },
    {
      provide: GetAuthProfileHandler,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new GetAuthProfileHandler(prisma),
    },
    {
      provide: ListAuthSessionsHandler,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new ListAuthSessionsHandler(prisma),
    },
    {
      provide: ListAuthRepositoriesHandler,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new ListAuthRepositoriesHandler(prisma),
    },
    handlerProvider(GetWorkspaceHandler),
    handlerProvider(DisableMfaHandler),
    handlerProvider(EnrollMfaHandler),
    handlerProvider(VerifyMfaOtpHandler),
    handlerProvider(UpdateProfileHandler),
    handlerProvider(ReauthenticatePasswordHandler),
    {
      provide: InviteDeveloperHandler,
      inject: [
        AuthWorkspaceSupportService,
        AUTH_WORKSPACE_REPOSITORIES_BAG,
        AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY,
      ],
      useFactory: (
        support: AuthWorkspaceSupportService,
        repositories: AuthWorkspaceRepositories,
        assessmentScope: AssessmentScopeRepository,
      ) => new InviteDeveloperHandler(support, repositories, assessmentScope),
    },
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
        RevokeOwnedSessionHandler,
        GetAuthProfileHandler,
        ListAuthSessionsHandler,
        ListAuthRepositoriesHandler,
        GetWorkspaceHandler,
        DisableMfaHandler,
        EnrollMfaHandler,
        VerifyMfaOtpHandler,
        UpdateProfileHandler,
        RequestPasswordRecoveryHandler,
        ConfirmPasswordRecoveryHandler,
        ReauthenticatePasswordHandler,
        OAuthStartHandler,
        OAuthCallbackHandler,
        InviteDeveloperHandler,
        AcceptInvitationHandler,
        PreviewInvitationHandler,
        RevokeMembershipHandler,
        GetDeveloperTaskContextHandler,
      ],
      useFactory: (
        registerApprovedPathHandler: RegisterApprovedPathHandler,
        signInHandler: SignInHandler,
        revokeSessionHandler: RevokeSessionHandler,
        revokeOwnedSessionHandler: RevokeOwnedSessionHandler,
        getAuthProfileHandler: GetAuthProfileHandler,
        listAuthSessionsHandler: ListAuthSessionsHandler,
        listAuthRepositoriesHandler: ListAuthRepositoriesHandler,
        getWorkspaceHandler: GetWorkspaceHandler,
        disableMfaHandler: DisableMfaHandler,
        enrollMfaHandler: EnrollMfaHandler,
        verifyMfaOtpHandler: VerifyMfaOtpHandler,
        updateProfileHandler: UpdateProfileHandler,
        requestPasswordRecoveryHandler: RequestPasswordRecoveryHandler,
        confirmPasswordRecoveryHandler: ConfirmPasswordRecoveryHandler,
        reauthenticatePasswordHandler: ReauthenticatePasswordHandler,
        oauthStartHandler: OAuthStartHandler,
        oauthCallbackHandler: OAuthCallbackHandler,
        inviteDeveloperHandler: InviteDeveloperHandler,
        acceptInvitationHandler: AcceptInvitationHandler,
        previewInvitationHandler: PreviewInvitationHandler,
        revokeMembershipHandler: RevokeMembershipHandler,
        getDeveloperTaskContextHandler: GetDeveloperTaskContextHandler,
      ) =>
        new AuthWorkspaceFacade(
          registerApprovedPathHandler,
          signInHandler,
          revokeSessionHandler,
          revokeOwnedSessionHandler,
          getAuthProfileHandler,
          listAuthSessionsHandler,
          listAuthRepositoriesHandler,
          getWorkspaceHandler,
          disableMfaHandler,
          enrollMfaHandler,
          verifyMfaOtpHandler,
          updateProfileHandler,
          requestPasswordRecoveryHandler,
          confirmPasswordRecoveryHandler,
          reauthenticatePasswordHandler,
          oauthStartHandler,
          oauthCallbackHandler,
          inviteDeveloperHandler,
          acceptInvitationHandler,
          previewInvitationHandler,
          revokeMembershipHandler,
          getDeveloperTaskContextHandler,
        ),
    },
  ],
  exports: [
    AuthWorkspaceFacade,
    AuthAuditService,
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
