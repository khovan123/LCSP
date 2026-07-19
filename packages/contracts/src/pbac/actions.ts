import { ASSESSMENT_ACTIONS } from "../assessment/actions.ts";

export const PBAC_ACTIONS = {
  assessmentCreate: ASSESSMENT_ACTIONS.create,
  assessmentList: "assessment:list",
  assessmentRead: "assessment:read",
  auditRead: "audit:read",
  evidenceRead: "evidence:read",
  evidenceReadRedacted: "evidence:read:redacted",
  githubConnect: "github:connect",
  inviteDeveloper: "invite:developer",
  membershipRevoke: "membership:revoke",
  metadataCheck: "pbac:metadata",
  sessionVerify: "session:verify",
  scanRead: "scan:read",
  scanTrigger: "scan:trigger",
  snapshotCreate: "snapshot:create",
  wizardWrite: "wizard:write",
  workspaceRead: "workspace:read",
} as const;

export type PbacAction = (typeof PBAC_ACTIONS)[keyof typeof PBAC_ACTIONS];
