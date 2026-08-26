import { ASSESSMENT_ACTIONS } from "@lcsp/contracts/assessment/actions";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import { AUTH_USER_ROLES, type AuthUserRole } from "@lcsp/contracts/auth";
import { DOCUMENT_ACTIONS } from "@lcsp/contracts/document/actions";

import { LOCAL_RBAC_REASON_CODES } from "./rbac-reason-codes.js";

export const RBAC_ACTIONS = {
  assessmentCreate: ASSESSMENT_ACTIONS.create,
  assessmentList: "assessment:list",
  assessmentRead: "assessment:read",
  assessmentSettingsManage: "assessment:settings:manage",
  auditExport: "audit:export",
  auditRead: "audit:read",
  classificationRun: "classification:run",
  complianceDossierExport: "compliance-dossier:export",
  conflictFinalize: "conflict:finalize",
  conflictRead: "conflict:read",
  conflictResolve: "conflict:resolve",
  evidenceRead: "evidence:read",
  evidenceReadRedacted: "evidence:read:redacted",
  finalReportGenerate: "final-report:generate",
  documentGenerate: DOCUMENT_ACTIONS.generate,
  documentRead: DOCUMENT_ACTIONS.read,
  documentReadRedacted: DOCUMENT_ACTIONS.readRedacted,
  githubConnect: "github:connect",
  legalRuleCatalogAuthor: "legal-rule-catalog:author",
  legalRuleCatalogApprove: "legal-rule-catalog:approve",
  legalCorpusIngest: "legal-corpus:ingest",
  legalCorpusActivate: "legal-corpus:activate",
  legalCorpusApprove: "legal-corpus:approve",
  legalCorpusRead: "legal-corpus:read",
  legalCitationValidate: "legal-citation:validate",
  gapMatrixEvaluate: "gap-matrix:evaluate",
  gapEvidenceTraceRead: "gap-evidence-trace:read",
  gapRemediationPropose: "gap-remediation:propose",
  gapRequirementsRead: "gap-requirements:read",
  managerDecisionChange: "manager-decision:change",
  metadataCheck: "rbac:metadata",
  outboxReplay: "outbox:replay",
  sessionVerify: "session:verify",
  scanRead: "scan:read",
  scanTrigger: "scan:trigger",
  technicalEvidenceReanalyze: "technical-evidence:reanalyze",
  snapshotCreate: "snapshot:create",
  wizardWrite: "wizard:write",
  wizardSubmit: "wizard:submit",
  wizardExport: "wizard:export",
  workspaceRead: "workspace:read",
} as const;

export type RbacAction = (typeof RBAC_ACTIONS)[keyof typeof RBAC_ACTIONS];

export const RBAC_DECISION = AUDIT_DECISIONS;
export type RbacDecisionValue =
  (typeof RBAC_DECISION)[keyof typeof RBAC_DECISION];

export const RBAC_REASON_CODE = LOCAL_RBAC_REASON_CODES;
export type RbacReasonCode =
  (typeof RBAC_REASON_CODE)[keyof typeof RBAC_REASON_CODE];

export const RBAC_METADATA_TYPES = {
  action: "ACTION",
  actionAny: "ACTION_ANY",
  session: "SESSION",
} as const;

export type RbacMetadataType =
  (typeof RBAC_METADATA_TYPES)[keyof typeof RBAC_METADATA_TYPES];

export const SUBJECT_ROLES = {
  admin: AUTH_USER_ROLES.admin,
  manager: AUTH_USER_ROLES.customer,
} as const;

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
  RBAC_ACTIONS.gapRequirementsRead,
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

export interface RbacSubject {
  role: AuthUserRole;
}

export interface RbacEvaluationContext {
  action: string;
  subject: RbacSubject;
  grantedActions: readonly string[];
}

export interface RbacDecisionResult {
  decision: RbacDecisionValue;
  reasonCode?: RbacReasonCode;
}
