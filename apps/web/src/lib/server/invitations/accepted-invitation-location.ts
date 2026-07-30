const ACCEPTED_INVITATION_SCOPE_TYPES = {
  assessment: "assessment",
  organization: "organization",
} as const;

export type AcceptedInvitationScope =
  | {
      type: typeof ACCEPTED_INVITATION_SCOPE_TYPES.assessment;
      assessment_id: string;
    }
  | {
      type: typeof ACCEPTED_INVITATION_SCOPE_TYPES.organization;
      assessment_id: null;
    };

export function getAcceptedInvitationLocation(
  scope: AcceptedInvitationScope,
): string {
  if (scope.type === ACCEPTED_INVITATION_SCOPE_TYPES.assessment) {
    return `/developer/assessments/${encodeURIComponent(scope.assessment_id)}`;
  }

  return "/developer/assessments";
}
