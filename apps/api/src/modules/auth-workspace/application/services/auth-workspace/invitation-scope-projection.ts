import {
  DEVELOPER_ALLOWED_ACTIONS,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";

export type InvitationScope =
  | { type: "assessment"; assessmentId: string }
  | { type: "organization"; assessmentId: null };

export type InvitationScopeProjection = {
  scope: InvitationScope;
  allowedActions: string[];
};

type PolicyProjectionInput = {
  organizationId: string;
  subjectRole: string;
  stateGate: string;
  actions: readonly string[];
};

type AssessmentProjectionInput = {
  id: string;
  organizationId: string;
};

export function invitationAssessmentId(
  subjectAttributes: unknown,
): string | null {
  if (!isRecord(subjectAttributes)) {
    return null;
  }
  const scope = subjectAttributes.scope;
  return typeof scope === "string" && scope.trim().length > 0 ? scope : null;
}

export function projectInvitationScope(input: {
  organizationId: string;
  subjectAttributes: unknown;
  policy: PolicyProjectionInput;
  assessment: AssessmentProjectionInput | null;
}): InvitationScopeProjection | null {
  if (!isRecord(input.subjectAttributes)) {
    return null;
  }

  const attributes = input.subjectAttributes;
  if (attributes.role !== SUBJECT_ROLES.developer) {
    return null;
  }
  if (
    input.policy.organizationId !== input.organizationId ||
    input.policy.subjectRole !== SUBJECT_ROLES.developer ||
    input.policy.stateGate !== PBAC_STATE_GATES.membershipActive
  ) {
    return null;
  }

  const storedActions = attributes.allowed_actions;
  if (!Array.isArray(storedActions)) {
    return null;
  }
  const policyActions = new Set(input.policy.actions);
  const developerActions = new Set(DEVELOPER_ALLOWED_ACTIONS);
  const allowedActions = storedActions.filter(
    (action): action is string =>
      typeof action === "string" &&
      policyActions.has(action) &&
      developerActions.has(action),
  );

  if (!("scope" in attributes)) {
    return {
      scope: { type: "organization", assessmentId: null },
      allowedActions: [...new Set(allowedActions)],
    };
  }

  const assessmentId = invitationAssessmentId(attributes);
  if (
    !assessmentId ||
    !input.assessment ||
    input.assessment.id !== assessmentId ||
    input.assessment.organizationId !== input.organizationId
  ) {
    return null;
  }

  return {
    scope: { type: "assessment", assessmentId },
    allowedActions: [...new Set(allowedActions)],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
