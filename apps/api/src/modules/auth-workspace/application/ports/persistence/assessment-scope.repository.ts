export const AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_ASSESSMENT_SCOPE_REPOSITORY",
);

export type AssessmentScopeDisplay = {
  id: string;
  organizationId: string;
  name: string;
};

export interface AssessmentScopeRepository {
  belongsToOrganization(
    assessmentId: string,
    organizationId: string,
  ): Promise<boolean>;

  findDisplayByIdAndOrganization(
    assessmentId: string,
    organizationId: string,
  ): Promise<AssessmentScopeDisplay | null>;
}
