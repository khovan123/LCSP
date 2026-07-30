import type { PagesMessages } from "../../types.ts";
export const enPages = {
  appShell: {
    productName: "LCSP",
    productTagline: "Compliance operations",
    mobileTitle: "LCSP workspace",
    mobileDescription: "Navigate assessments and compliance workflows.",
    sidebarToggle: "Toggle workspace navigation",
    headerEyebrow: "Compliance workspace",
    workspaceTitle: "Workspace overview",
    assessmentTitle: "Assessment workflow",
    developerTitle: "Developer tasks",
    workspaceNavigation: "Workspace",
    assessmentNavigation: "Current assessment",
    chooseAssessmentToView: "Choose an assessment to view",
    selectAssessmentFirst: "Please select your assessment first.",
    developerNavigation: "Developer",
    overview: "Overview",
    assessments: "Assessments",
    recentAssessments: "Recent assessments",
    moreAssessments: "More assessments",
    allAssessments: "All assessments",
    searchAssessments: "Search assessments",
    noAssessmentMatches: "No matching assessments found.",
    wizard: "Intake wizard",
    readiness: "Readiness",
    classification: "Classification",
    documents: "Documents",
    conflicts: "Conflict review",
    developer: "Technical findings",
    developers: "Developers",
    secureWorkspace: "Protected organization workspace",
    signOut: "Sign out",
    switchWorkspace: "Switch workspace",
    currentWorkspace: "Current workspace",
    switchingWorkspace: "Switching workspace",
    workspaceMenuTitle: "Switch workspace",
    authEyebrow: "Governance, without the guesswork",
    authTitle: "Move every AI assessment forward with evidence.",
    authDescription:
      "LCSP keeps intake, readiness, classification, and review in one controlled workspace.",
  },
  signIn: {
    metadataTitle: "Sign in | LCSP",
    metadataDescription: "Access the LCSP compliance workspace.",
    homeAriaLabel: "LCSP home",
    formEyebrow: "Secure access",
    formTitle: "Sign in to LCSP",
    formDescription: "Use your approved organization account.",
    emailLabel: "Work email",
    emailDescription: "Enter the address associated with your organization.",
    passwordLabel: "Password",
    passwordDescription:
      "On a shared device, do not save this password in your browser.",
    submit: "Sign in",
    submitting: "Checking access",
    divider: "Others",
    oauthGoogle: "Google",
    oauthGitHub: "GitHub",
    accessHelp: "Need access? Contact your organization owner.",
    errors: {
      emailRequired: "Enter your work email.",
      emailInvalid: "Enter a valid work email.",
      passwordRequired: "Enter your password.",
      requestFailedTitle: "Unable to sign in",
      requestFailedDetail: "Unable to sign in. Please try again.",
    },
  },
  mfaVerify: {
    metadataTitle: "Verify your identity | LCSP",
    metadataDescription: "Complete multi-factor verification to continue.",
    homeAriaLabel: "LCSP home",
    formEyebrow: "Secure verification",
    formTitle: "Enter your verification code",
    formDescription: "Use the six-digit code from your authenticator app.",
    otpLabel: "Verification code",
    otpDescription: "Enter the current six-digit code.",
    submit: "Verify code",
    submitting: "Verifying code",
    accessHelp: "Need help? Contact your organization owner.",
    errors: {
      otpRequired: "Enter your verification code.",
      otpInvalidFormat: "Enter a six-digit verification code.",
      requestFailedTitle: "Unable to verify",
      requestFailedDetail: "Unable to verify the code. Please try again.",
    },
  },
  acceptInvitation: {
    metadataTitle: "Accept developer invitation | LCSP",
    metadataDescription: "Review and accept your scoped developer invitation.",
    eyebrow: "Developer access",
    title: "Accept your invitation",
    description:
      "Review the access being granted before creating your account.",
    loading: "Loading invitation details",
    organizationScope: "Organization-scoped access",
    expiresLabel: "Invitation expires",
    displayNameLabel: "Display name",
    displayNameDescription:
      "Enter the name teammates should see (1–100 characters).",
    passwordLabel: "Password",
    passwordDescription: "Use at least 12 characters.",
    submit: "Accept invitation",
    submitting: "Creating your account",
    signInInstead: "Sign in instead.",
    errors: {
      displayNameRequired: "Enter your display name.",
      displayNameTooLong: "Display name must be 100 characters or fewer.",
      passwordTooShort: "Password must be at least 12 characters.",
      invalidTitle: "Invitation unavailable",
      invalidDetail:
        "This invitation link is no longer valid. Ask your organization owner for a new one.",
      emailExistsTitle: "Account already exists",
      emailExistsDetail: "An account already exists for this email.",
      requestTitle: "Unable to accept invitation",
      requestDetail: "The invitation could not be accepted. Please try again.",
    },
  },
  developerTask: {
    metadataTitle: "Developer task workspace | LCSP",
    metadataDescription: "Review assigned redacted technical findings.",
    sidebarTitle: "Developer workspace",
    sidebarDescription: "Developer task navigation",
    sidebarToggle: "Toggle developer task navigation",
    navigationLabel: "Developer task",
    taskNav: "Technical findings",
    pageTitle: "Scoped task workspace",
    pageDescription: "Review the redacted technical findings assigned to you.",
    selectionTitle: "Choose an assessment",
    selectionDescription:
      "Open an assessment within your current organization scope.",
    openAssessment: "Open technical findings",
    loading: "Loading your task",
    scopeTitle: "Your access scope",
    scopeDescription: "This scope is controlled by your organization owner.",
    organization: "Organization",
    assessment: "Assessment",
    organizationScope: "Organization scope",
    grantedActions: "Granted actions",
    hiddenBoundaryTitle: "Protected information remains hidden",
    hiddenBoundary:
      "You cannot see: source code, file paths, line numbers, or Manager-only actions.",
    findingsTitle: "Redacted technical findings",
    findingsDescription:
      "Only the finding details permitted by your current scope are shown.",
    emptyTitle: "No technical findings available yet for this assessment.",
    emptyDescription: "Check back after technical evidence has been processed.",
    revokedTitle: "Access revoked",
    revokedDetail: "Your access to this task was revoked.",
    errorTitle: "Task unavailable",
    errorDetail: "This task cannot be loaded right now. Please try again.",
    actions: {
      assessmentList: "Browse assigned assessments",
      evidenceReadRedacted: "View redacted technical findings",
      aiUsageFlowRead: "View AI usage flow",
      findingsReadRedacted: "Review redacted findings",
      conflictComment: "Comment on conflicts",
      scanRead: "View scan status",
    },
  },
  workspace: {
    metadataTitle: "Workspace | LCSP",
    metadataDescription: "Manage the active LCSP organization workspace.",
    productName: "LCSP",
    sidebarTitle: "Workspace",
    sidebarDescription: "Workspace navigation",
    sidebarToggle: "Toggle workspace navigation",
    pageTitle: "Workspace dashboard",
    pageDescription:
      "Review organization context, granted workspace actions, and active assessments.",
    organizationLabel: "Organization",
    membershipRoleLabel: "Membership role",
    navigationLabel: "Workspace navigation",
    overviewNav: "Overview",
    assessmentsNav: "Assessments",
    documentsNav: "Documents",
    createAssessment: "Create Assessment",
    newAssessmentName: "New assessment",
    openConflictResolution: "Open conflict resolution",
    openWizard: "Open Wizard",
    assessmentsTitle: "Assessments",
    assessmentsDescription:
      "Track assessment progress from wizard intake through review.",
    overviewAssessmentsTitle: "Manage assessments",
    overviewAssessmentsDescription:
      "Open the full list to track progress and continue each assessment.",
    openAssessments: "Open assessment list",
    insightsTitle: "Assessment overview",
    totalAssessments: "Total assessments",
    needsAttention: "Needs follow-up",
    readyForReview: "Ready for review",
    recentAssessmentsTitle: "Recent assessments",
    recentAssessmentsDescription:
      "Quickly open recently created assessments or view the full list.",
    emptyTitle: "No assessments yet",
    emptyDescription: "Create your first assessment.",
    loadingAssessments: "Loading assessments",
    statusLabel: "Status",
    wizardStatusLabel: "Wizard status",
    createdAtLabel: "Created",
    progressLabel: "Assessment progress",
    statuses: {
      WIZARD_IN_PROGRESS: "In Progress",
      WIZARD_SUBMITTED: "Wizard Complete",
      EVIDENCE_REQUIRED: "Evidence Needed",
      SCAN_IN_PROGRESS: "Scan Running",
      CLASSIFICATION_LOCKED: "Classification Locked",
      READY_FOR_REVIEW: "Ready for Review",
    },
    wizardStatuses: {
      NOT_STARTED: "Not Started",
      IN_PROGRESS: "In Progress",
      SUBMITTED: "Submitted",
    },
    nextActions: {
      wizardNotStarted:
        "Start the Wizard to describe how this AI system is used.",
      wizardInProgress: "Continue the Wizard to complete your assessment.",
      wizardSubmitted:
        "Waiting for technical evidence before classification can proceed.",
    },
    errors: {
      workspaceUnavailableTitle: "Workspace unavailable",
      workspaceUnavailableDetail:
        "Workspace context cannot be loaded right now.",
      assessmentsUnavailableTitle: "Assessments unavailable",
      assessmentsUnavailableDetail:
        "Assessment list cannot be loaded right now.",
      createAssessmentTitle: "Unable to create assessment",
      createAssessmentDetail: "Please try again.",
    },
  },
  assessment: {
    eyebrow: "Assessment workflow",
    pageTitle: "Assessment overview",
    pageDescription:
      "Open the right workflow step to complete intake, check readiness, review classification, and manage compliance records.",
    openOverview: "Open assessment overview",
    moduleNavigation: "Assessment workflow steps",
    openModule: "Open this step",
    modules: {
      wizard: "Describe the business context and how the AI system is used.",
      readiness: "Review completed conditions and the evidence still needed.",
      classification:
        "Review the classification state and available next actions.",
      documents: "Generate, track, and download assessment documents.",
      conflicts: "Review and record decisions for pending conflicts.",
    },
  },
  assessmentForm: {
    pageTitle: "Create assessment",
    pageDescription: "Enter the basics before starting the Wizard intake.",
    formTitle: "Assessment details",
    formDescription: "You can add more detail in the next workflow steps.",
    nameLabel: "Assessment name",
    namePlaceholder: "Example: AI customer support assistant",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Briefly describe the AI system to assess.",
    cancel: "Cancel",
    submit: "Create and start Wizard",
    submitting: "Creating assessment",
  },
  developerManagement: {
    pageTitle: "Manage developers",
    pageDescription:
      "Grant and revoke Developer access for the current assessment scope.",
    inviteTitle: "Invite developer",
    emailLabel: "Work email",
    invite: "Send invitation",
    membersTitle: "Granted developers",
    scopeLabel: "Assessment scope",
    revoke: "Revoke access",
    empty: "No developers have been granted access to this assessment.",
  },
  wizard: {
    metadataTitle: "Assessment Wizard | LCSP",
    metadataDescription:
      "Describe the business context of this AI system in guided steps.",
    pageTitle: "Assessment Wizard",
    pageDescription:
      "Describe how this AI system is used before technical evidence is reviewed.",
    loading: "Loading wizard",
    loadingDetail: "Checking the current assessment state.",
    preScreenBadge: "Pre-screen",
    detailedBadge: "Detailed intake",
    progressLabel: "Progress",
    draftSaved: "Draft saved",
    draftSaving: "Saving draft",
    draftDirty: "Draft has unsaved changes",
    helperButton: "Why are we asking this?",
    helperClose: "Close helper",
    readOnlyBadge: "Read-only",
    landingTitle: "Start with the business context",
    landingDescription:
      "This step collects self-declared context in business language. It does not create a final legal conclusion.",
    timeEstimate: "Estimated time: about 10 minutes",
    readinessOnlyHint:
      "After submission, LCSP will keep this assessment in a readiness-only state until technical evidence is available.",
    preScreenTitle: "Quick pre-screen",
    preScreenDescription:
      "These opening questions help LCSP show the right detailed sections next.",
    readOnlyTitle: "This Wizard has already been submitted",
    readOnlyDescription:
      "The submitted profile cannot be edited from this page. Review the captured summary or continue with the next assessment step.",
    readOnlyEmpty:
      "No local summary is available on this device. The submitted Wizard remains locked.",
    summaryTitle: "Draft summary",
    summaryDescription:
      "Use this view to confirm what has been captured in the current browser session.",
    clearForm: "Clear form",
    helperTitle: "Guidance",
    helperDescription:
      "Examples and plain-language explanations for the current question.",
    actions: {
      backToWorkspace: "Back to workspace",
      previous: "Previous",
      saveAndContinue: "Save and continue",
      continueToDetailed: "Continue to detailed intake",
      submit: "Submit Wizard",
      openClassification: "Open next step",
    },
    sections: {
      purpose: "System purpose",
      dataUsers: "Data and affected people",
      decision: "Decision making",
      provider: "External AI usage",
      risk: "Special risk signals",
    },
    fields: {
      preAiScopeLabel:
        "Does this system use AI or generate AI-based suggestions or content?",
      preAiScopeDescription:
        "Choose the option that best matches the role of AI in this workflow today.",
      preAffectedPeopleLabel:
        "Could the result affect customers, staff, applicants, students, patients, or other people?",
      preAffectedPeopleDescription:
        "This helps LCSP understand who may be directly affected.",
      prePersonalDataLabel:
        "Does the system handle personal, sensitive, or biometric data?",
      prePersonalDataDescription:
        "If you are unsure, choose the option that keeps review cautious.",
      preDecisionImportanceLabel:
        "Could the AI result influence an important decision about a person?",
      preDecisionImportanceDescription:
        "For example: hiring, access, eligibility, pricing, or service outcomes.",
      purposeLabel: "What business purpose does this system support?",
      purposeDescription:
        "Describe the main task in everyday business language.",
      purposePlaceholder:
        "Example: Help a support team draft replies for customer requests.",
      sectorLabel: "Which business context fits this system best?",
      sectorDescription:
        "Choose the closest primary context for this assessment.",
      dataTypeLabel: "What kinds of data does the system use or analyze?",
      dataTypeDescription:
        "Select every category that applies to the AI workflow.",
      userGroupLabel: "Who is directly affected by the result?",
      userGroupDescription:
        "Choose the group most directly affected by the system outcome.",
      userGroupPlaceholder: "Add a short note if another group is affected.",
      userImpactLabel: "How strong is the impact on those people?",
      userImpactDescription:
        "Think about whether the output changes access, treatment, opportunities, or service quality.",
      decisionRoleLabel:
        "What role does the AI output play in the final decision?",
      decisionRoleDescription:
        "Choose the option that best reflects how much the result influences the outcome.",
      decisionRoleExamples:
        "Example: a suggestion for staff review is different from an output that directly determines an outcome.",
      humanOversightLabel:
        "Where does a person review the result before it takes effect?",
      humanOversightDescription:
        "This question appears when the AI output goes beyond simple background support.",
      externalLlmUsageLabel:
        "Does the system call an external AI provider such as OpenAI, Anthropic, Google, or another vendor?",
      externalLlmUsageDescription:
        "Select yes when prompts or content leave your environment for an outside provider.",
      biometricIndicatorLabel:
        "Does the system use biometric data for recognition, verification, or scoring?",
      biometricIndicatorDescription:
        "Examples include face, voice, fingerprint, or similar identity signals.",
      highImpactIndicatorLabel:
        "Does this workflow relate to hiring, education, credit, healthcare, public services, or another important life context?",
      highImpactIndicatorDescription:
        "This helps LCSP flag workflows that may need closer follow-up later.",
    },
    options: {
      yes: "Yes",
      no: "No",
      unknown: "I am not sure yet",
      sectorGeneral: "General business operations",
      sectorHr: "Employment or HR",
      sectorFinance: "Finance, credit, or insurance",
      sectorEducation: "Education or training",
      sectorHealthcare: "Healthcare or wellness",
      sectorPublicServices: "Public services or regulated access",
      dataTypePersonal: "Personal profile data",
      dataTypeSensitive: "Sensitive or special-category data",
      dataTypeBiometric: "Biometric data",
      dataTypeBehavioral: "Behavior or usage data",
      dataTypeOperational: "Operational or product data",
      userGroupCustomers: "Customers or end users",
      userGroupEmployees: "Employees or internal staff",
      userGroupApplicants: "Applicants or candidates",
      userGroupStudents: "Students or learners",
      userGroupPatients: "Patients or care recipients",
      userImpactLow: "Low impact",
      userImpactModerate: "Moderate impact",
      userImpactSignificant: "Significant impact",
      decisionRoleNoAutonomousDecision:
        "It supports background work only and does not shape a final decision",
      decisionRoleSupportsDecision:
        "It supports a person who still decides the outcome",
      decisionRoleRecommendsOutcome:
        "It recommends an outcome that people usually follow",
      decisionRoleDirectlyDrivesOutcome:
        "It directly drives the outcome with little or no review",
      humanOversightPresent:
        "A person reviews and can change the result before it takes effect",
      humanOversightLimited:
        "A person reviews some cases, but not every result",
      humanOversightAbsent:
        "The result usually takes effect without meaningful review",
      humanOversightNotApplicable:
        "Not applicable because the AI does not influence a final decision",
    },
    helpers: {
      decisionTitle: "How to answer the decision question",
      decisionBody:
        "Choose the strongest statement that still feels true. If the AI output can approve, reject, rank, or gate people with limited review, select a stronger decision role.",
      humanOversightTitle: "What counts as meaningful human review",
      humanOversightBody:
        "A meaningful review happens before the result takes effect and gives a person real authority to question, change, or stop it.",
      providerTitle: "When external provider usage matters",
      providerBody:
        "Select yes when your team sends prompts, documents, or user content to a third-party AI service outside your controlled environment.",
    },
    errors: {
      loadTitle: "Unable to load this Wizard",
      loadDetail: "The assessment state could not be loaded right now.",
      saveFailed: "The draft could not be saved. Try again.",
      submitFailed:
        "The Wizard could not be submitted. Review the highlighted answers and try again.",
      alreadySubmitted:
        "This Wizard has already been submitted and is now read-only.",
      purposeRequired: "Describe the main business purpose before continuing.",
      sectorRequired: "Choose the primary business context before continuing.",
      dataTypeRequired: "Select at least one data category before continuing.",
      userGroupRequired: "Choose who is directly affected before continuing.",
      userImpactRequired: "Choose the level of impact before continuing.",
      decisionRoleRequired:
        "Choose how strongly the AI output affects the final decision.",
      humanOversightRequired:
        "Describe where a person reviews the result before continuing.",
      externalProviderRequired:
        "Confirm whether the system uses an external AI provider before continuing.",
    },
  },
  readiness: {
    metadataTitle: "Readiness status | LCSP",
    metadataDescription:
      "Review the readiness-only handoff after the Wizard is submitted.",
    pageTitle: "Readiness status",
    pageDescription:
      "This view shows what is ready, what is still missing, and the next safe step before classification can proceed.",
    loading: "Loading readiness status",
    loadingDetail: "Checking the latest Wizard and evidence state.",
    errorTitle: "Unable to load readiness status",
    errorDetail: "Please try again in a moment.",
    badgeReadinessOnly: "Readiness only",
    badgeLocked: "Locked",
    badgeReady: "Ready for the next gate",
    summaryTitle: "Current handoff",
    summaryDescription:
      "The Wizard is complete, but LCSP still treats this assessment as readiness-only until technical evidence is available.",
    completedTitle: "Completed steps",
    missingTitle: "Still missing",
    nextActionTitle: "Next action",
    updatedAtLabel: "Updated",
    noMissingEvidence: "There are no missing readiness items at the moment.",
    noCompletedSteps: "No readiness milestones have been confirmed yet.",
    completedSteps: {
      wizardProfile: "Wizard profile submitted",
      repositoryConnected: "Repository connected",
      technicalEvidenceAccepted: "Technical evidence accepted",
    },
    missingEvidence: {
      repositoryConnection: "Connect the repository used by this system.",
      technicalEvidence:
        "Wait for the repository scan to produce accepted technical evidence.",
    },
    actions: {
      backToWorkspace: "Back to workspace",
      openClassification: "Open classification status",
      openDocuments: "Open documents",
    },
  },
  workspaceSelector: {
    metadataTitle: "Select workspace | LCSP",
    metadataDescription: "Select an organization workspace to continue.",
    eyebrow: "Developer account",
    title: "Choose a workspace",
    description:
      "Your account can belong to multiple workspaces managed by different Managers.",
    welcomeBackTitle: "Welcome back!",
    welcomeBackDescription: "Choose from an existing workspace to continue.",
    continueExistingWorkspaces: "OR continue to existing workspaces",
    readyToLaunch: "Ready to launch",
    missingSomething: "Missing something?",
    signInAnotherAccount: "Sign in to another account",
    members: "members",
    lastSignIn: "Last sign-in",
    daysAgo: "days ago",
    dayAgo: "day ago",
    signedInAs: "Signed in as",
    workspaceListLabel: "Workspaces you can access",
    loading: "Loading workspaces",
    submit: "Continue",
    selected: "Selected",
    openWorkspace: "Open workspace",
    signOut: "Sign out of this account",
    noWorkspacesTitle: "No workspaces",
    noWorkspacesDetail:
      "This demo account is not linked to any workspaces yet.",
    errorTitle: "Unable to load workspaces",
    errorDetail: "Sign in again or try later.",
    privacyTerms: "Privacy & Terms",
    contactUs: "Contact Us",
    changeRegion: "Change region",
  },
  reconciliation: {
    metadataTitle: "Conflict resolution | LCSP",
    metadataDescription:
      "Review pending scan conflicts and record a resolution decision.",
    pageTitle: "Conflict resolution",
    pageDescription:
      "Resolve or dismiss each pending conflict. Dismissal requires a reason.",
    loading: "Loading pending conflicts",
    pendingSectionLabel: "Pending conflicts",
    pendingBadge: "Pending",
    scoreLabel: "Conflict score",
    evidenceRefsLabel: "Evidence references",
    resolutionLabel: "Resolution",
    resolutionResolved: "Resolved",
    resolutionDismissed: "Dismissed",
    resolutionNoteLabel: "Resolution note",
    resolutionNotePlaceholder:
      "Add context for this decision. Required when you dismiss a conflict.",
    submitAction: "Submit resolution",
    submitting: "Submitting",
    allResolvedTitle: "All conflicts are resolved",
    allResolvedDetail:
      "There are no pending conflicts for this assessment right now.",
    nextStepHint: "You can continue with the assessment workflow.",
    nextStepAction: "Back to assessments",
    accessRevokedTitle: "Access no longer available",
    accessRevokedDetail:
      "You no longer have permission to view or resolve conflicts for this assessment.",
    errorTitle: "Unable to load conflicts",
    errorDetail: "Please try again in a moment.",
    conflictTypeLabels: {
      evidenceContradiction: "Evidence contradiction",
      scopeMismatch: "Scope mismatch",
      unverifiableFinding: "Unverifiable finding",
      generic: "Conflict",
    },
    errors: {
      dismissReasonRequired: "Enter a reason before dismissing this conflict.",
      alreadyResolved:
        "This conflict was already processed. The list has been refreshed.",
      conflictNotFound:
        "This conflict is no longer available. The list has been refreshed.",
      resolveFailed:
        "The resolution request could not be completed. Please try again.",
    },
  },
  classification: {
    metadataTitle: "Classification status | LCSP",
    metadataDescription:
      "Review the current classification status for this assessment.",
    pageTitle: "Classification status",
    pageDescription:
      "Track the current classification progress and the next step for this assessment.",
    loading: "Loading classification status",
    summaryLabel: "Summary",
    referencesLabel: "Applicable legal references",
    generateFinalReport: "Generate Final Report",
    generateGapAnalysis: "Generate Gap Analysis",
    errorTitle: "Unable to load classification status",
    errorDetail: "Please try again in a moment.",
    states: {
      lockedTitle: "Classification is locked",
      lockedBadge: "Locked",
      lockedDescription:
        "Technical evidence is still required before classification can proceed.",
      lockedNextSteps:
        "Add the missing technical evidence so the classification can continue and the next step can be prepared.",
      processingTitle: "Classification is in progress",
      processingBadge: "Processing",
      processingDescription: "The classification is still being prepared.",
      passedTitle: "Classification is ready",
      passedBadge: "Ready",
      passedDescription:
        "The available legal references were verified and the classification can proceed.",
      passedSummary: "Applicable legal references are ready for the next step.",
      degradedTitle: "Classification needs review",
      degradedBadge: "Needs review",
      degradedDescription: "Some legal references could not be fully verified.",
      degradedSummary:
        "The classification is available, but a few references need review.",
      blockedTitle: "Classification could not be completed",
      blockedBadge: "Blocked",
      blockedDescription:
        "The classification could not be completed because the citation basis was missing.",
      blockedSummary:
        "A valid citation basis is required before the next step can proceed.",
    },
    finalReportRequestedTitle: "Final report request submitted",
    finalReportRequestedDetail:
      "The final report request is queued. You can return later to download it once processing is complete.",
    documentsPageDescription:
      "Request the final report and view the output status for this assessment.",
    finalReportPageHint:
      "Request a guarded final report. This is only available when the classification guardrail has passed.",
    requestFinalReportButton: "Request Final Report",
    gapAnalysisLabel: "Gap analysis",
    gapAnalysisPendingMessage:
      "Gap analysis is generated by the next worker stage after classification. It will be available when the document pipeline is ready.",
    documentGuardrailBlocked:
      "The final report cannot be generated because the classification guardrail has not passed.",
    documentList: {
      title: "Assessment documents",
      description:
        "Track the generation status of available assessment documents.",
    },
    documentMeta: {
      requestedAt: "Requested",
    },
    documentTypes: {
      finalReport: "Final report",
      gapAnalysis: "Gap analysis",
      readinessExport: "Readiness export",
      unknown: "Document",
    },
    documentStates: {
      queued: "Being prepared",
      generating: "Generating",
      ready: "Ready",
      failed: "Generation failed",
      blocked: "Blocked",
      unknown: "Pending",
      failedDetail: "Generation failed. Please try again.",
      permissionDenied: "Download is restricted for your current scope.",
    },
    documentActions: {
      download: "Download",
    },
  },
} as const satisfies PagesMessages;
