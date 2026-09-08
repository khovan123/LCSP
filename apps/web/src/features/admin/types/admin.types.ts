import {
  AUTH_MEMBERSHIP_STATUSES,
  type AuthUserRole,
} from "@lcsp/contracts/auth";
import type { LegalRuleLifecycleStatus } from "@lcsp/contracts/legal-rule-catalog";
import {
  AGENTIC_TOOL_STATUSES,
  type AgenticToolStatus,
} from "@lcsp/contracts/evidence";

export const ADMIN_USER_STATUSES = {
  active: AUTH_MEMBERSHIP_STATUSES.active,
  suspended: AUTH_MEMBERSHIP_STATUSES.revoked,
} as const;

export type AdminUserStatus =
  (typeof ADMIN_USER_STATUSES)[keyof typeof ADMIN_USER_STATUSES];

export const ADMIN_READINESS_STATUSES = {
  ready: AGENTIC_TOOL_STATUSES.ready,
  blocked: AGENTIC_TOOL_STATUSES.blocked,
  failed: AGENTIC_TOOL_STATUSES.failed,
} as const;

export type AdminCorpusReadiness = AgenticToolStatus;

export interface AdminUser {
  id: string;
  email: string;
  role: AuthUserRole;
  status: AdminUserStatus;
  isLastAdmin?: boolean;
}

export interface AdminCorpusVersion {
  id: string;
  version: string;
  readiness: AdminCorpusReadiness;
  status: LegalRuleLifecycleStatus;
}
