import type { Policy } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_POLICY_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_POLICY_REPOSITORY",
);

export interface PolicyRepository {
  findByIdAndVersion(id: string, version: string): Promise<Policy | null>;
  findLatestByOrganizationAndRole(
    organizationId: string,
    subjectRole: string,
  ): Promise<Policy | null>;
}
