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
  mfaVerify: {
    metadataTitle: string;
    metadataDescription: string;
    homeAriaLabel: string;
    formEyebrow: string;
    formTitle: string;
    formDescription: string;
    otpLabel: string;
    otpDescription: string;
    submit: string;
    submitting: string;
    accessHelp: string;
    errors: {
      otpRequired: string;
      otpInvalidFormat: string;
      requestFailedTitle: string;
      requestFailedDetail: string;
    };
  };
  workspace: {
    metadataTitle: string;
    metadataDescription: string;
    productName: string;
    sidebarTitle: string;
    sidebarDescription: string;
    sidebarToggle: string;
    pageTitle: string;
    pageDescription: string;
    organizationLabel: string;
    membershipRoleLabel: string;
    navigationLabel: string;
    overviewNav: string;
    assessmentsNav: string;
    documentsNav: string;
    createAssessment: string;
    assessmentsTitle: string;
    assessmentsDescription: string;
    emptyTitle: string;
    emptyDescription: string;
    loadingAssessments: string;
    statusLabel: string;
    wizardStatusLabel: string;
    createdAtLabel: string;
    statuses: {
      WIZARD_IN_PROGRESS: string;
      WIZARD_SUBMITTED: string;
      EVIDENCE_REQUIRED: string;
      SCAN_IN_PROGRESS: string;
      CLASSIFICATION_LOCKED: string;
      READY_FOR_REVIEW: string;
    };
    wizardStatuses: {
      NOT_STARTED: string;
      IN_PROGRESS: string;
      SUBMITTED: string;
    };
    nextActions: {
      wizardNotStarted: string;
      wizardInProgress: string;
      wizardSubmitted: string;
    };
    errors: {
      workspaceUnavailableTitle: string;
      workspaceUnavailableDetail: string;
      assessmentsUnavailableTitle: string;
      assessmentsUnavailableDetail: string;
    };
  };
};

export type LocaleMessages = {
  auth: AuthMessages;
  common: CommonMessages;
  pages: PagesMessages;
};
