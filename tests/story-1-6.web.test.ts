import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  CUSTOMER_ACTION_VALUES,
  RBAC_ACTIONS,
  roleCanUseAction,
} from "@lcsp/contracts/rbac";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { canCreateAssessment } from "@lcsp/web";

test("Story 1.6 customer action set covers accountable customer authority", () => {
  assert.deepEqual(CUSTOMER_ACTION_VALUES, [
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
  ]);
});

test("Story 1.6 customer capability helper hides unavailable actions", () => {
  assert.equal(
    roleCanUseAction(
      AUTH_USER_ROLES.customer,
      RBAC_ACTIONS.assessmentCreate,
    ),
    true,
  );
  assert.equal(
    roleCanUseAction(
      AUTH_USER_ROLES.admin,
      RBAC_ACTIONS.assessmentCreate,
    ),
    false,
  );
  assert.equal(canCreateAssessment([RBAC_ACTIONS.assessmentCreate]), true);
  assert.equal(canCreateAssessment([RBAC_ACTIONS.assessmentRead]), false);
});
