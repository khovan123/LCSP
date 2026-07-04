import type { RequestMeta } from "../../contracts/auth-workspace/common.contract.ts";
import type { RegisterPayload } from "../../contracts/auth-workspace/register-approved-path.contract.ts";
import type {
  ConfirmRecoveryPayload,
  RequestRecoveryPayload,
} from "../../contracts/auth-workspace/recovery.contract.ts";
import type { CredentialPayload } from "../../contracts/auth-workspace/sign-in.contract.ts";
import type { WorkspaceRequest } from "../../contracts/auth-workspace/workspace.contract.ts";
import type { UpdateProfilePayload } from "../../commands/update-profile/update-profile.command.ts";
import { ConfirmPasswordRecoveryCommand } from "../../commands/confirm-password-recovery/confirm-password-recovery.command.ts";
import { ConfirmPasswordRecoveryHandler } from "../../commands/confirm-password-recovery/confirm-password-recovery.handler.ts";
import { EnrollMfaCommand } from "../../commands/enroll-mfa/enroll-mfa.command.ts";
import { EnrollMfaHandler } from "../../commands/enroll-mfa/enroll-mfa.handler.ts";
import { RegisterApprovedPathCommand } from "../../commands/register-approved-path/register-approved-path.command.ts";
import { RegisterApprovedPathHandler } from "../../commands/register-approved-path/register-approved-path.handler.ts";
import { RequestPasswordRecoveryCommand } from "../../commands/request-password-recovery/request-password-recovery.command.ts";
import { RequestPasswordRecoveryHandler } from "../../commands/request-password-recovery/request-password-recovery.handler.ts";
import { RevokeSessionCommand } from "../../commands/revoke-session/revoke-session.command.ts";
import { RevokeSessionHandler } from "../../commands/revoke-session/revoke-session.handler.ts";
import { SignInCommand } from "../../commands/sign-in/sign-in.command.ts";
import { SignInHandler } from "../../commands/sign-in/sign-in.handler.ts";
import { UpdateProfileCommand } from "../../commands/update-profile/update-profile.command.ts";
import { UpdateProfileHandler } from "../../commands/update-profile/update-profile.handler.ts";
import { VerifyMfaOtpCommand } from "../../commands/verify-mfa-otp/verify-mfa-otp.command.ts";
import { VerifyMfaOtpHandler } from "../../commands/verify-mfa-otp/verify-mfa-otp.handler.ts";
import { GetWorkspaceHandler } from "../../queries/get-workspace/get-workspace.handler.ts";
import { GetWorkspaceQuery } from "../../queries/get-workspace/get-workspace.query.ts";

export class AuthWorkspaceFacade {
  constructor(
    private readonly registerApprovedPathHandler: RegisterApprovedPathHandler,
    private readonly signInHandler: SignInHandler,
    private readonly revokeSessionHandler: RevokeSessionHandler,
    private readonly getWorkspaceHandler: GetWorkspaceHandler,
    private readonly enrollMfaHandler: EnrollMfaHandler,
    private readonly verifyMfaOtpHandler: VerifyMfaOtpHandler,
    private readonly updateProfileHandler: UpdateProfileHandler,
    private readonly requestPasswordRecoveryHandler: RequestPasswordRecoveryHandler,
    private readonly confirmPasswordRecoveryHandler: ConfirmPasswordRecoveryHandler,
  ) {}

  registerApprovedPath(
    payload: RegisterPayload,
    requestMeta: RequestMeta = {},
  ) {
    return this.registerApprovedPathHandler.execute(
      new RegisterApprovedPathCommand(payload, requestMeta),
    );
  }

  signIn(payload: CredentialPayload, requestMeta: RequestMeta = {}) {
    return this.signInHandler.execute(new SignInCommand(payload, requestMeta));
  }

  revokeSession(sessionToken: string, requestMeta: RequestMeta = {}) {
    return this.revokeSessionHandler.execute(
      new RevokeSessionCommand(sessionToken, requestMeta),
    );
  }

  getWorkspace(request: WorkspaceRequest = {}) {
    return this.getWorkspaceHandler.execute(new GetWorkspaceQuery(request));
  }

  enrollMfa(sessionToken: string, requestMeta: RequestMeta = {}) {
    return this.enrollMfaHandler.execute(
      new EnrollMfaCommand(sessionToken, requestMeta),
    );
  }

  verifyMfaOtp(
    sessionToken: string,
    otp: string,
    requestMeta: RequestMeta = {},
  ) {
    return this.verifyMfaOtpHandler.execute(
      new VerifyMfaOtpCommand(sessionToken, otp, requestMeta),
    );
  }

  updateProfile(
    sessionToken: string,
    payload: UpdateProfilePayload,
    requestMeta: RequestMeta = {},
  ) {
    return this.updateProfileHandler.execute(
      new UpdateProfileCommand(
        { ...payload, session_token: sessionToken },
        requestMeta,
      ),
    );
  }

  requestPasswordRecovery(
    payload: RequestRecoveryPayload,
    requestMeta: RequestMeta = {},
  ) {
    return this.requestPasswordRecoveryHandler.execute(
      new RequestPasswordRecoveryCommand(payload, requestMeta),
    );
  }

  confirmPasswordRecovery(
    payload: ConfirmRecoveryPayload,
    requestMeta: RequestMeta = {},
  ) {
    return this.confirmPasswordRecoveryHandler.execute(
      new ConfirmPasswordRecoveryCommand(payload, requestMeta),
    );
  }
}
