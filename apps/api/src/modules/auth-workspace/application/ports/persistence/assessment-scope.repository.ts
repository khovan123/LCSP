export const AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY",
);

export interface AssessmentScopeRepository {
  belongsToOrganization(
    assessmentId: string,
    organizationId: string,
  ): Promise<boolean>;
}
