import { ASSESSMENT_ACTIONS } from "../assessment/actions.ts";

export const PBAC_ACTIONS = {
  assessmentCreate: ASSESSMENT_ACTIONS.create,
  assessmentList: "assessment:list",
  assessmentRead: "assessment:read",
  assessmentSettingsManage: "assessment:settings:manage",
  auditRead: "audit:read",
  classificationRun: "classification:run",
  complianceDossierExport: "compliance-dossier:export",
  conflictFinalize: "conflict:finalize",
  evidenceRead: "evidence:read",
  evidenceReadRedacted: "evidence:read:redacted",
  finalReportGenerate: "final-report:generate",
  githubConnect: "github:connect",
  inviteDeveloper: "invite:developer",
  managerDecisionChange: "manager-decision:change",
  membershipRevoke: "membership:revoke",
  metadataCheck: "pbac:metadata",
  sessionVerify: "session:verify",
  scanRead: "scan:read",
  scanTrigger: "scan:trigger",
  snapshotCreate: "snapshot:create",
  verifiedProfileApprove: "verified-profile:approve",
  wizardWrite: "wizard:write",
  workspaceRead: "workspace:read",
} as const;

export type PbacAction = (typeof PBAC_ACTIONS)[keyof typeof PBAC_ACTIONS];
