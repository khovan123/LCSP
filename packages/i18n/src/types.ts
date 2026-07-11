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
    pbacDenied: { title: string; detail: string };
    unsupportedProvider: { title: string; detail: string };
    invalidRedirectUri: { title: string; detail: string };
    oauthStateInvalid: { title: string; detail: string };
    oauthCallbackInvalid: { title: string; detail: string };
    accountNotFound: { title: string; detail: string };
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

export type PagesMessages = {
  signIn: {
    metadataTitle: string;
    metadataDescription: string;
    homeAriaLabel: string;
    formEyebrow: string;
    formTitle: string;
    formDescription: string;
    emailLabel: string;
    emailDescription: string;
    passwordLabel: string;
    passwordDescription: string;
    submit: string;
    submitting: string;
    divider: string;
    oauthGitHub: string;
    accessHelp: string;
    errors: {
      emailRequired: string;
      emailInvalid: string;
      passwordRequired: string;
      requestFailedTitle: string;
      requestFailedDetail: string;
    };
  };
};

export type LocaleMessages = {
  auth: AuthMessages;
  common: CommonMessages;
  pages: PagesMessages;
};
