import type { Organization } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_ORGANIZATION_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_ORGANIZATION_REPOSITORY",
);

export interface OrganizationRepository {
  save(organization: Organization): Promise<void>;
  findById(id: string): Promise<Organization | null>;
}
