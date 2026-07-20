export type AcceptedInvitationScope =
  | { type: "assessment"; assessment_id: string }
  | { type: "organization"; assessment_id: null };

export function getAcceptedInvitationLocation(
  scope: AcceptedInvitationScope,
): string {
  if (scope.type === "assessment") {
    return `/developer/assessments/${encodeURIComponent(scope.assessment_id)}`;
  }

  return "/developer/assessments";
}
