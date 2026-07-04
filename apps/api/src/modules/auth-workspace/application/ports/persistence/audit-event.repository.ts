import type { AuditEvent } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_AUDIT_EVENT_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_AUDIT_EVENT_REPOSITORY",
);

export interface AuditEventRepository {
  append(event: AuditEvent): Promise<void>;
}
