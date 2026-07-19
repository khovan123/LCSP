import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  ASSESSMENT_ACTIONS,
  ASSESSMENT_ERROR_CODES,
  ASSESSMENT_EVENT_TYPES,
  ASSESSMENT_LOCK_REASONS,
  ASSESSMENT_MISSING_EVIDENCE_CODES,
  ASSESSMENT_NEXT_ACTION_KEYS,
  ASSESSMENT_STATUS_CODES,
  WIZARD_STATUS_CODES,
} from "@lcsp/contracts/assessment";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_AUDIT_EVENT_TYPES,
  AUTH_ERROR_CODES,
  AUTH_INVITATION_STATES,
  AUTH_LEGACY_AUDIT_EVENT_TYPES,
  AUTH_MEMBERSHIP_STATUSES,
  INVITE_DEVELOPER_ERROR_CODES,
  ORGANIZATION_SCOPE_ERROR_CODES,
  REQUIRED_ACTIONS,
  REVOKE_MEMBERSHIP_ERROR_CODES,
  WORKSPACE_CAPABILITY_SOURCES,
} from "@lcsp/contracts/auth";
import {
  GITHUB_INTEGRATION_EVENT_TYPES,
  GITHUB_INTEGRATION_ERROR_CODES,
  GITHUB_REPOSITORY_PERMISSION_LEVELS,
  REPOSITORY_CONNECTION_STATUSES,
  REPOSITORY_SCAN_JOB_STATUSES,
  REPOSITORY_SCAN_TRIGGER_SOURCES,
  REPOSITORY_SNAPSHOT_STATUSES,
} from "@lcsp/contracts/github-integration";
import {
  OUTBOX_AUDIT_EVENT_TYPES,
  OUTBOX_STATUSES,
} from "@lcsp/contracts/outbox";
import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  PBAC_REASON_CODE,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { SERVICE_HEALTH_STATUSES } from "@lcsp/contracts/shared";
import {
  SCAN_CALLBACK_STATUSES,
  SCAN_ERROR_CODES,
  SCAN_EVENT_TYPES,
  SCAN_JOB_GUIDANCE,
  TECHNICAL_EVIDENCE_REPORT_STATUSES,
} from "@lcsp/contracts/scan";
import { WIZARD_EVENT_TYPES } from "@lcsp/contracts/wizard";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["apps/api/src", "apps/api/test", "apps/web/src"];
const extensions = new Set([".ts", ".tsx"]);
const canonicalValues = new Set(
  [
    ACCEPT_INVITATION_ERROR_CODES,
    ASSESSMENT_ACTIONS,
    ASSESSMENT_ERROR_CODES,
    ASSESSMENT_EVENT_TYPES,
    ASSESSMENT_LOCK_REASONS,
    ASSESSMENT_MISSING_EVIDENCE_CODES,
    ASSESSMENT_NEXT_ACTION_KEYS,
    ASSESSMENT_STATUS_CODES,
    AUDIT_DECISIONS,
    AUTH_AUDIT_EVENT_TYPES,
    AUTH_ERROR_CODES,
    AUTH_INVITATION_STATES,
    AUTH_LEGACY_AUDIT_EVENT_TYPES,
    AUTH_MEMBERSHIP_STATUSES,
    GITHUB_INTEGRATION_ERROR_CODES,
    GITHUB_INTEGRATION_EVENT_TYPES,
    GITHUB_REPOSITORY_PERMISSION_LEVELS,
    INVITE_DEVELOPER_ERROR_CODES,
    ORGANIZATION_SCOPE_ERROR_CODES,
    OUTBOX_AUDIT_EVENT_TYPES,
    OUTBOX_STATUSES,
    PBAC_ACTIONS,
    PBAC_DECISION,
    PBAC_REASON_CODE,
    PBAC_STATE_GATES,
    REPOSITORY_CONNECTION_STATUSES,
    REPOSITORY_SCAN_JOB_STATUSES,
    REPOSITORY_SCAN_TRIGGER_SOURCES,
    REPOSITORY_SNAPSHOT_STATUSES,
    REQUIRED_ACTIONS,
    REVOKE_MEMBERSHIP_ERROR_CODES,
    SCAN_CALLBACK_STATUSES,
    SCAN_ERROR_CODES,
    SCAN_EVENT_TYPES,
    SCAN_JOB_GUIDANCE,
    SERVICE_HEALTH_STATUSES,
    SUBJECT_ROLES,
    TECHNICAL_EVIDENCE_REPORT_STATUSES,
    WIZARD_EVENT_TYPES,
    WIZARD_STATUS_CODES,
    WORKSPACE_CAPABILITY_SOURCES,
  ].flatMap(Object.values),
);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path === join(root, "apps/web/src/components/ui")) continue;
      files.push(...(await collectFiles(path)));
    } else if (extensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const violations = [];

for (const sourceRoot of sourceRoots) {
  for (const file of await collectFiles(join(root, sourceRoot))) {
    const source = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const isTestFile = file.endsWith(".spec.ts") || file.endsWith(".test.ts");

    function visit(node) {
      if (
        (ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)) &&
        canonicalValues.has(node.text)
      ) {
        if (!(
          isTestFile &&
          node.text === SERVICE_HEALTH_STATUSES.ok &&
          !file.includes(`${join("modules", "health")}`)
        )) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          );
          violations.push(`${relative(root, file)}:${line + 1}: ${node.text}`);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

if (violations.length > 0) {
  console.error(
    "Canonical contract values must be referenced through @lcsp/contracts:",
  );
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Contract literal policy passed.");
}
