export type AuthMessages = {
  errors: {
    authRequired: { title: string; detail: string };
    invalidCredentials: { title: string; detail: string };
    invalidInviteState: { title: string; detail: string };
    membershipMissing: { title: string; detail: string };
    emailVerificationRequired: { title: string; detail: string };
    sessionInvalid: { title: string; detail: string };
    temporaryLock: { title: string; detail: string };
    authzPolicyUnavailable: { title: string; detail: string };
    authzSubjectIncomplete: { title: string; detail: string };
    authzTenantScopeMismatch: { title: string; detail: string };
    authzStateGateBlocked: { title: string; detail: string };
    authzEvaluatorFailure: { title: string; detail: string };
    validationFailed: { title: string; detail: string };
    mfaRequired: { title: string; detail: string };
    mfaInvalid: { title: string; detail: string };
    mfaRateLimited: { title: string; detail: string };
    recoveryInvalid: { title: string; detail: string };
  };
};

export type CommonMessages = {
  actions: {
    signIn: string;
    verifyEmail: string;
    acceptInvite: string;
    contactOwner: string;
    waitAndRetry: string;
    verifyMfa: string;
    retryRecovery: string;
    none: string;
  };
};

export type LocaleMessages = {
  auth: AuthMessages;
  common: CommonMessages;
};
