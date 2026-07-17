import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  AUTH_INVITATION_STATES,
  AUTH_MEMBERSHIP_STATUSES,
  type ProblemCodeEnvelope,
  type ProblemResult,
} from "@lcsp/contracts/auth";
import { REPOSITORY_CONNECTION_STATUSES } from "@lcsp/contracts/github-integration";
import { OUTBOX_STATUSES } from "@lcsp/contracts/outbox";
import {
  PBAC_DECISION,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";

type Assert<T extends true> = T;
type _ApiProblemIsAcceptedByWebWireContract = Assert<
  ProblemResult extends ProblemCodeEnvelope ? true : false
>;

test("shared contracts expose canonical workflow value sets", () => {
  assert.deepEqual(Object.values(ASSESSMENT_STATUS_CODES), [
    "WIZARD_IN_PROGRESS",
    "WIZARD_SUBMITTED",
    "EVIDENCE_REQUIRED",
    "SCAN_IN_PROGRESS",
    "CLASSIFICATION_LOCKED",
    "READY_FOR_REVIEW",
  ]);
  assert.deepEqual(Object.values(WIZARD_STATUS_CODES), [
    "NOT_STARTED",
    "IN_PROGRESS",
    "SUBMITTED",
  ]);
  assert.deepEqual(Object.values(AUTH_MEMBERSHIP_STATUSES), [
    "invited",
    "active",
    "revoked",
  ]);
  assert.deepEqual(Object.values(AUTH_INVITATION_STATES), [
    "approved",
    "pending",
    "consumed",
  ]);
  assert.deepEqual(Object.values(OUTBOX_STATUSES), [
    "pending",
    "published",
    "failed",
    "dlq",
  ]);
  assert.deepEqual(Object.values(REPOSITORY_CONNECTION_STATUSES), [
    "active",
    "revoked",
  ]);
});

test("decision, role, and state-gate contracts have one canonical source", () => {
  assert.deepEqual(AUDIT_DECISIONS, PBAC_DECISION);
  assert.deepEqual(Object.values(SUBJECT_ROLES), [
    "Manager",
    "Developer",
    "SystemAdmin",
  ]);
  assert.deepEqual(Object.values(PBAC_STATE_GATES), ["membership_active"]);
});
