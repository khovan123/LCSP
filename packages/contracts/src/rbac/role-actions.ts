import { AUTH_USER_ROLES } from "../auth/roles.ts";
import { RBAC_ACTIONS } from "./actions.ts";
import { GAP_REQUIREMENTS_CUSTOMER_ACTION_VALUES } from "./gap-requirements-role-actions.ts";
import type { AuthUserRole } from "./policy.types.ts";

export const CUSTOMER_ACTION_VALUES = [
  RBAC_ACTIONS.workspaceRead,
  RBAC_ACTIONS.assessmentCreate,
  RBAC_ACTIONS.assessmentList,
  RBAC_ACTIONS.assessmentRead,
  RBAC_ACTIONS.wizardWrite,
  RBAC_ACTIONS.wizardSubmit,
  RBAC_ACTIONS.wizardExport,
  RBAC_ACTIONS.githubConnect,
  RBAC_ACTIONS.snapshotCreate,
  RBAC_ACTIONS.scanRead,
  RBAC_ACTIONS.scanTrigger,
  RBAC_ACTIONS.evidenceRead,
  RBAC_ACTIONS.technicalEvidenceReanalyze,
  RBAC_ACTIONS.conflictFinalize,
  RBAC_ACTIONS.conflictRead,
  RBAC_ACTIONS.conflictResolve,
  RBAC_ACTIONS.classificationRun,
  RBAC_ACTIONS.documentGenerate,
  RBAC_ACTIONS.documentRead,
  RBAC_ACTIONS.finalReportGenerate,
  RBAC_ACTIONS.complianceDossierExport,
  RBAC_ACTIONS.managerDecisionChange,
  RBAC_ACTIONS.assessmentSettingsManage,
  RBAC_ACTIONS.gapMatrixEvaluate,
  RBAC_ACTIONS.gapEvidenceTraceRead,
  RBAC_ACTIONS.gapRemediationPropose,
  ...GAP_REQUIREMENTS_CUSTOMER_ACTION_VALUES,
] as const;

export const ADMIN_ACTION_VALUES = [
  RBAC_ACTIONS.workspaceRead,
  RBAC_ACTIONS.assessmentList,
  RBAC_ACTIONS.assessmentRead,
  RBAC_ACTIONS.auditRead,
  RBAC_ACTIONS.auditExport,
  RBAC_ACTIONS.outboxReplay,
  RBAC_ACTIONS.evidenceReadRedacted,
  RBAC_ACTIONS.documentReadRedacted,
  RBAC_ACTIONS.legalRuleCatalogAuthor,
  RBAC_ACTIONS.legalRuleCatalogApprove,
  RBAC_ACTIONS.legalCorpusIngest,
  RBAC_ACTIONS.legalCorpusActivate,
  RBAC_ACTIONS.legalCorpusApprove,
  RBAC_ACTIONS.legalCorpusRead,
  RBAC_ACTIONS.legalCitationValidate,
  RBAC_ACTIONS.scanRead,
] as const;

export const RBAC_ROLE_ACTIONS = {
  [AUTH_USER_ROLES.admin]: ADMIN_ACTION_VALUES,
  [AUTH_USER_ROLES.customer]: CUSTOMER_ACTION_VALUES,
} as const satisfies Record<AuthUserRole, readonly string[]>;

export function actionsForRole(role: AuthUserRole): readonly string[] {
  return RBAC_ROLE_ACTIONS[role] ?? [];
}

export function roleCanUseAction(role: AuthUserRole, action: string): boolean {
  return actionsForRole(role).includes(action);
}
