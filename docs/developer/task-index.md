# LCSP Module Task Index

Active implementation tasks live under `docs/implementation/tasks/modules/**`. Legacy `module task catalog range` briefs and task handbooks were removed after module task decomposition.

## Quick Routing

- Start with [module catalog](../implementation/tasks/modules/README.md) for task format and dependency order.
- Use [active catalog](../implementation/tasks/README.md) for generated summaries by module and story.
- Use generated Jira CSV files in this directory only when importing or refreshing Jira.

## Next Ready P0 Tasks

| Story | Task | Module | Runtime | Brief |
|---|---|---|---|---|
| `1.1` | `MW-cfg-001` Config Loader — NestJS ConfigModule Bootstrap | `platform/config` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/config/01-config-loader.md) |
| `1.1` | `MW-pyp-001` Python Worker Platform Bootstrap | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/01-worker-platform-bootstrap.md) |
| `1.1` | `MW-pyp-002` Worker API Callback Client | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/02-worker-api-callback-client.md) |
| `1.1` | `MW-pyp-003` Worker Secret Redaction Utility | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/03-worker-secret-redaction.md) |
| `1.1` | `MW-qa-001` Auth Integration Test Suite | `qa` | `nestjs-api` | [brief](../implementation/tasks/modules/qa/01-auth-integration-tests.md) |
| `1.2` | `MW-web-001` Sign-In Page | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/01-auth-sign-in-page.md) |
| `1.2` | `MW-web-007` MFA Verify Page | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/07-mfa-verify-page.md) |
| `1.3` | `MW-auth-008` OAuth/OIDC Start Endpoint | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/08-oauth-oidc-start-endpoint.md) |
| `1.3` | `MW-auth-009` OAuth/OIDC Callback Endpoint | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/09-oauth-oidc-callback-endpoint.md) |
| `1.4` | `MW-web-002` Workspace Dashboard Page | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/02-workspace-dashboard-page.md) |
| `1.5` | `MW-auth-010` Invite Developer Endpoint | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/10-invite-developer-endpoint.md) |
| `1.5` | `MW-auth-011` Accept Developer Invitation Endpoint | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/11-accept-developer-invitation-endpoint.md) |
| `1.5` | `MW-auth-012` Revoke Developer Membership Endpoint | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/12-revoke-developer-membership-endpoint.md) |
| `1.5` | `MW-web-008` Developer Scoped Task Workspace | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/08-developer-scoped-task-workspace.md) |
| `1.6` | `MW-auth-013` PBAC Guard — NestJS Integration | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/13-pbac-guard.md) |
| `1.6` | `MW-pbac-001` PBAC Policy Model — Prisma Schema + Types | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/01-policy-model.md) |
| `1.6` | `MW-pbac-002` PBAC Evaluator Service | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/02-evaluator-service.md) |
| `1.6` | `MW-pbac-003` PBAC NestJS Guard | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/03-nestjs-guard.md) |
| `1.8` | `MW-audit-001` Audit Event Schema — Prisma + Domain Types | `platform/audit-writer` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/audit-writer/01-audit-event-schema.md) |
| `1.8` | `MW-audit-002` Audit Writer Service | `platform/audit-writer` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/audit-writer/02-audit-writer-service.md) |
| `1.8` | `MW-auth-014` Audit Event Writer — Auth Workspace Integration | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/14-audit-event-writer.md) |
| `2.1` | `MW-asmt-001` Create Assessment Endpoint | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/01-create-assessment-endpoint.md) |
| `2.1` | `MW-asmt-003` List Assessments Endpoint | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/03-list-assessments-endpoint.md) |
| `2.1` | `MW-outbox-001` Outbox Model — Prisma Schema | `platform/outbox` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/outbox/01-outbox-model.md) |
| `2.1` | `MW-outbox-002` Outbox Publisher — Poller + RabbitMQ Relay | `platform/outbox` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/outbox/02-outbox-publisher.md) |
| `2.2` | `MW-web-003` Wizard Form Page | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/03-wizard-form-page.md) |
| `2.2` | `MW-wiz-001` Save Wizard Draft Endpoint | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/01-save-wizard-draft-endpoint.md) |
| `2.2` | `MW-wiz-002` Submit Wizard Endpoint | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/02-submit-wizard-endpoint.md) |
| `2.3` | `MW-asmt-002` Get Assessment Endpoint | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/02-get-assessment-endpoint.md) |
| `2.3` | `MW-wiz-003` Wizard Readiness State Endpoint | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/03-wizard-readiness-state-endpoint.md) |
| `3.1` | `MW-gh-001` GitHub App OAuth Start Endpoint | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/01-github-app-oauth-start-endpoint.md) |
| `3.1` | `MW-gh-002` GitHub App Callback Endpoint | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/02-github-app-callback-endpoint.md) |
| `3.2` | `MW-gh-003` Pin Commit Snapshot Endpoint | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/03-pin-commit-snapshot-endpoint.md) |
| `3.3` | `MW-gh-004` Scan Trigger Endpoint | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/04-scan-trigger-endpoint.md) |
| `3.3` | `MW-scan-001` Scan Job Status Endpoint | `scan` | `nestjs-api` | [brief](../implementation/tasks/modules/scan/01-scan-job-status-endpoint.md) |
| `3.3` | `MW-scan-002` Scan Job Callback Endpoint | `scan` | `nestjs-api` | [brief](../implementation/tasks/modules/scan/02-scan-job-callback-endpoint.md) |
| `3.4` | `MW-scan-py-001` Scanner Workspace Setup and Materialization | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/01-scanner-workspace-setup.md) |
| `3.5` | `MW-evid-001` Get Technical Evidence Report Endpoint | `evidence` | `nestjs-api` | [brief](../implementation/tasks/modules/evidence/01-get-technical-evidence-endpoint.md) |
| `3.5` | `MW-qa-002` Python Scanner Unit Tests | `qa` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/qa/02-scanner-unit-tests.md) |
| `3.5` | `MW-scan-py-002` Syft SBOM Tool Wrapper | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/02-syft-sbom-tool.md) |
| `3.5` | `MW-scan-py-003` Semgrep AI Usage Rules Tool | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/03-semgrep-ai-rules-tool.md) |
| `3.5` | `MW-scan-py-004` Evidence Report Assembly and Callback | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/04-evidence-report-assembly.md) |

## All Module Tasks

| Story | Task | Priority | Status | Module | Runtime | Brief |
|---|---|---|---|---|---|---|
| `1.1` | `MW-auth-001` Sign-In Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/01-sign-in-endpoint.md) |
| `1.1` | `MW-auth-002` Register via Approved Path Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/02-register-approved-path-endpoint.md) |
| `1.1` | `MW-cfg-001` Config Loader — NestJS ConfigModule Bootstrap | `P0` | `READY_FOR_DEV` | `platform/config` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/config/01-config-loader.md) |
| `1.1` | `MW-pyp-001` Python Worker Platform Bootstrap | `P0` | `READY_FOR_DEV` | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/01-worker-platform-bootstrap.md) |
| `1.1` | `MW-pyp-002` Worker API Callback Client | `P0` | `READY_FOR_DEV` | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/02-worker-api-callback-client.md) |
| `1.1` | `MW-pyp-003` Worker Secret Redaction Utility | `P0` | `READY_FOR_DEV` | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/03-worker-secret-redaction.md) |
| `1.1` | `MW-pyp-004` Worker Health Check HTTP Server | `P1` | `READY_FOR_DEV` | `python-workers/platform` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/platform/04-worker-health-check.md) |
| `1.1` | `MW-qa-001` Auth Integration Test Suite | `P0` | `READY_FOR_DEV` | `qa` | `nestjs-api` | [brief](../implementation/tasks/modules/qa/01-auth-integration-tests.md) |
| `1.2` | `MW-auth-003` MFA Enroll Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/03-mfa-enroll-endpoint.md) |
| `1.2` | `MW-auth-004` MFA Verify OTP Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/04-mfa-verify-otp-endpoint.md) |
| `1.2` | `MW-auth-005` Session Revoke Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/05-session-revoke-endpoint.md) |
| `1.2` | `MW-auth-007` Update Profile Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/07-update-profile-endpoint.md) |
| `1.2` | `MW-web-001` Sign-In Page | `P0` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/01-auth-sign-in-page.md) |
| `1.2` | `MW-web-007` MFA Verify Page | `P0` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/07-mfa-verify-page.md) |
| `1.3` | `MW-auth-008` OAuth/OIDC Start Endpoint | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/08-oauth-oidc-start-endpoint.md) |
| `1.3` | `MW-auth-009` OAuth/OIDC Callback Endpoint | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/09-oauth-oidc-callback-endpoint.md) |
| `1.4` | `MW-auth-006` Get Workspace Endpoint | `P0` | `DONE` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/06-get-workspace-endpoint.md) |
| `1.4` | `MW-web-002` Workspace Dashboard Page | `P0` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/02-workspace-dashboard-page.md) |
| `1.5` | `MW-auth-010` Invite Developer Endpoint | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/10-invite-developer-endpoint.md) |
| `1.5` | `MW-auth-011` Accept Developer Invitation Endpoint | `P0` | `REVIEW` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/11-accept-developer-invitation-endpoint.md) |
| `1.5` | `MW-auth-012` Revoke Developer Membership Endpoint | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/12-revoke-developer-membership-endpoint.md) |
| `1.5` | `MW-web-008` Developer Scoped Task Workspace | `P1` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/08-developer-scoped-task-workspace.md) |
| `1.6` | `MW-auth-013` PBAC Guard — NestJS Integration | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/13-pbac-guard.md) |
| `1.6` | `MW-pbac-001` PBAC Policy Model — Prisma Schema + Types | `P0` | `READY_FOR_DEV` | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/01-policy-model.md) |
| `1.6` | `MW-pbac-002` PBAC Evaluator Service | `P0` | `READY_FOR_DEV` | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/02-evaluator-service.md) |
| `1.6` | `MW-pbac-003` PBAC NestJS Guard | `P0` | `READY_FOR_DEV` | `platform/pbac` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/pbac/03-nestjs-guard.md) |
| `1.7` | `MW-pbac-004` PBAC Worker Preflight — Python Worker Authorization Check | `P1` | `READY_FOR_DEV` | `platform/pbac` | `nestjs-api + python-workers` | [brief](../implementation/tasks/modules/platform/pbac/04-worker-preflight.md) |
| `1.8` | `MW-audit-001` Audit Event Schema — Prisma + Domain Types | `P0` | `READY_FOR_DEV` | `platform/audit-writer` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/audit-writer/01-audit-event-schema.md) |
| `1.8` | `MW-audit-002` Audit Writer Service | `P0` | `READY_FOR_DEV` | `platform/audit-writer` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/audit-writer/02-audit-writer-service.md) |
| `1.8` | `MW-auth-014` Audit Event Writer — Auth Workspace Integration | `P0` | `READY_FOR_DEV` | `auth-workspace` | `nestjs-api` | [brief](../implementation/tasks/modules/auth-workspace/14-audit-event-writer.md) |
| `2.1` | `MW-asmt-001` Create Assessment Endpoint | `P0` | `READY_FOR_DEV` | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/01-create-assessment-endpoint.md) |
| `2.1` | `MW-asmt-003` List Assessments Endpoint | `P0` | `READY_FOR_DEV` | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/03-list-assessments-endpoint.md) |
| `2.1` | `MW-outbox-001` Outbox Model — Prisma Schema | `P0` | `READY_FOR_DEV` | `platform/outbox` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/outbox/01-outbox-model.md) |
| `2.1` | `MW-outbox-002` Outbox Publisher — Poller + RabbitMQ Relay | `P0` | `READY_FOR_DEV` | `platform/outbox` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/outbox/02-outbox-publisher.md) |
| `2.1` | `MW-outbox-003` DLQ Handler — Dead Letter Queue Management | `P1` | `READY_FOR_DEV` | `platform/outbox` | `nestjs-api` | [brief](../implementation/tasks/modules/platform/outbox/03-dlq-handler.md) |
| `2.1` | `MW-qa-003` E2E Manager Golden Path Test | `P1` | `READY_FOR_DEV` | `qa` | `all` | [brief](../implementation/tasks/modules/qa/03-e2e-manager-golden-path.md) |
| `2.2` | `MW-web-003` Wizard Form Page | `P0` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/03-wizard-form-page.md) |
| `2.2` | `MW-wiz-001` Save Wizard Draft Endpoint | `P0` | `READY_FOR_DEV` | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/01-save-wizard-draft-endpoint.md) |
| `2.2` | `MW-wiz-002` Submit Wizard Endpoint | `P0` | `READY_FOR_DEV` | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/02-submit-wizard-endpoint.md) |
| `2.3` | `MW-asmt-002` Get Assessment Endpoint | `P0` | `READY_FOR_DEV` | `assessment` | `nestjs-api` | [brief](../implementation/tasks/modules/assessment/02-get-assessment-endpoint.md) |
| `2.3` | `MW-wiz-003` Wizard Readiness State Endpoint | `P0` | `READY_FOR_DEV` | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/03-wizard-readiness-state-endpoint.md) |
| `2.4` | `MW-wiz-004` Wizard Readiness Export Endpoint | `P1` | `READY_FOR_DEV` | `wizard` | `nestjs-api` | [brief](../implementation/tasks/modules/wizard/04-wizard-readiness-export-endpoint.md) |
| `3.1` | `MW-gh-001` GitHub App OAuth Start Endpoint | `P0` | `READY_FOR_DEV` | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/01-github-app-oauth-start-endpoint.md) |
| `3.1` | `MW-gh-002` GitHub App Callback Endpoint | `P0` | `READY_FOR_DEV` | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/02-github-app-callback-endpoint.md) |
| `3.2` | `MW-gh-003` Pin Commit Snapshot Endpoint | `P0` | `READY_FOR_DEV` | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/03-pin-commit-snapshot-endpoint.md) |
| `3.3` | `MW-gh-004` Scan Trigger Endpoint | `P0` | `READY_FOR_DEV` | `github-integration` | `nestjs-api` | [brief](../implementation/tasks/modules/github-integration/04-scan-trigger-endpoint.md) |
| `3.3` | `MW-scan-001` Scan Job Status Endpoint | `P0` | `READY_FOR_DEV` | `scan` | `nestjs-api` | [brief](../implementation/tasks/modules/scan/01-scan-job-status-endpoint.md) |
| `3.3` | `MW-scan-002` Scan Job Callback Endpoint | `P0` | `READY_FOR_DEV` | `scan` | `nestjs-api` | [brief](../implementation/tasks/modules/scan/02-scan-job-callback-endpoint.md) |
| `3.3` | `MW-scan-003` Re-Run Scan Endpoint | `P1` | `READY_FOR_DEV` | `scan` | `nestjs-api` | [brief](../implementation/tasks/modules/scan/03-rerun-scan-endpoint.md) |
| `3.4` | `MW-scan-py-001` Scanner Workspace Setup and Materialization | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/01-scanner-workspace-setup.md) |
| `3.5` | `MW-evid-001` Get Technical Evidence Report Endpoint | `P0` | `READY_FOR_DEV` | `evidence` | `nestjs-api` | [brief](../implementation/tasks/modules/evidence/01-get-technical-evidence-endpoint.md) |
| `3.5` | `MW-qa-002` Python Scanner Unit Tests | `P0` | `READY_FOR_DEV` | `qa` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/qa/02-scanner-unit-tests.md) |
| `3.5` | `MW-scan-py-002` Syft SBOM Tool Wrapper | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/02-syft-sbom-tool.md) |
| `3.5` | `MW-scan-py-003` Semgrep AI Usage Rules Tool | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/03-semgrep-ai-rules-tool.md) |
| `3.5` | `MW-scan-py-004` Evidence Report Assembly and Callback | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/04-evidence-report-assembly.md) |
| `3.5` | `MW-scan-py-005` Knip + deptry Dependency Usage Analysis Tool | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/05-knip-deptry-dependency-tool.md) |
| `3.5` | `MW-scan-py-006` Python AST/CST Analyzer (Bounded L0–L3) | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/06-python-ast-cst-analyzer.md) |
| `3.5` | `MW-scan-py-007` TS/JS Subprocess Bridge (ts-morph) | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/07-ts-js-subprocess-bridge.md) |
| `3.5` | `MW-scan-py-008` Semgrep Full AI Ruleset | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/08-semgrep-full-ai-ruleset.md) |
| `3.5` | `MW-scan-py-009` AI Invocation Detector (Signal Fusion + 20 Finding Types + Confidence) | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/09-ai-invocation-detector.md) |
| `3.5` | `MW-scan-py-010` Decision Flow Tracer | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/10-decision-flow-tracer.md) |
| `3.5` | `MW-scan-py-011` Evidence Graph Assembler | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/11-evidence-graph-assembler.md) |
| `3.5` | `MW-scan-py-012` Schema, Privacy, and Quality Gates | `P0` | `READY_FOR_DEV` | `python-workers/scanner` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/scanner/12-schema-privacy-quality-gates.md) |
| `3.6` | `MW-evid-002` TechnicalProfile Callback Endpoint | `P0` | `READY_FOR_DEV` | `evidence` | `nestjs-api` | [brief](../implementation/tasks/modules/evidence/02-technical-profile-callback-endpoint.md) |
| `3.6` | `MW-intel-001` TechnicalProfile Worker | `P0` | `READY_FOR_DEV` | `python-workers/intelligence` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/intelligence/01-technical-profile-worker.md) |
| `4.1` | `MW-llm-001` LLM Gateway Client | `P0` | `READY_FOR_DEV` | `python-workers/llm` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/llm/01-llm-gateway-client.md) |
| `4.2` | `MW-aiuf-001` AIUsageFlow Callback Endpoint | `P0` | `READY_FOR_DEV` | `ai-usage-flow` | `nestjs-api` | [brief](../implementation/tasks/modules/ai-usage-flow/01-ai-usage-flow-callback-endpoint.md) |
| `4.2` | `MW-intel-002` AIUsageFlow Worker | `P0` | `READY_FOR_DEV` | `python-workers/intelligence` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/intelligence/02-ai-usage-flow-worker.md) |
| `5.1` | `MW-intel-003` Conflict Detection Worker | `P0` | `READY_FOR_DEV` | `python-workers/intelligence` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/intelligence/03-conflict-detection-worker.md) |
| `5.1` | `MW-rec-001` Conflict Detection Callback Endpoint | `P0` | `READY_FOR_DEV` | `reconciliation` | `nestjs-api` | [brief](../implementation/tasks/modules/reconciliation/01-conflict-detection-callback-endpoint.md) |
| `5.2` | `MW-rec-002` List Conflicts Endpoint | `P0` | `READY_FOR_DEV` | `reconciliation` | `nestjs-api` | [brief](../implementation/tasks/modules/reconciliation/02-list-conflicts-endpoint.md) |
| `5.3` | `MW-rec-003` Resolve Conflict Endpoint | `P0` | `READY_FOR_DEV` | `reconciliation` | `nestjs-api` | [brief](../implementation/tasks/modules/reconciliation/03-resolve-conflict-endpoint.md) |
| `5.3` | `MW-web-004` Conflict Resolution Page | `P0` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/04-conflict-resolution-page.md) |
| `5.4` | `MW-intel-004` VerifiedProfile Worker | `P0` | `READY_FOR_DEV` | `python-workers/intelligence` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/intelligence/04-verified-profile-worker.md) |
| `5.4` | `MW-rec-004` VerifiedProfile Callback Endpoint | `P0` | `READY_FOR_DEV` | `reconciliation` | `nestjs-api` | [brief](../implementation/tasks/modules/reconciliation/04-verified-profile-callback-endpoint.md) |
| `6.1` | `MW-cls-001` LegalRuleMatch Callback Endpoint | `P0` | `READY_FOR_DEV` | `classification` | `nestjs-api` | [brief](../implementation/tasks/modules/classification/01-legal-rule-match-callback-endpoint.md) |
| `6.1` | `MW-legal-001` ChromaDB Legal Retrieval Worker | `P0` | `READY_FOR_DEV` | `python-workers/legal` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/legal/01-chromadb-legal-retrieval-worker.md) |
| `6.2` | `MW-cls-002` Classification Result Callback Endpoint | `P0` | `READY_FOR_DEV` | `classification` | `nestjs-api` | [brief](../implementation/tasks/modules/classification/02-classification-result-callback-endpoint.md) |
| `6.2` | `MW-cls-py-001` Classification Worker | `P0` | `READY_FOR_DEV` | `python-workers/classification` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/classification/01-classification-worker.md) |
| `7.1` | `MW-doc-001` Generate Gap Analysis Document | `P1` | `READY_FOR_DEV` | `document` | `nestjs-api` | [brief](../implementation/tasks/modules/document/01-generate-gap-analysis-endpoint.md) |
| `7.1` | `MW-rep-001` Gap Analysis Report Worker | `P1` | `READY_FOR_DEV` | `python-workers/reporting` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/reporting/01-gap-analysis-report-worker.md) |
| `7.2` | `MW-doc-002` Generate Final Report Document | `P1` | `READY_FOR_DEV` | `document` | `nestjs-api` | [brief](../implementation/tasks/modules/document/02-generate-final-report-endpoint.md) |
| `7.2` | `MW-rep-002` Final Report Worker | `P1` | `READY_FOR_DEV` | `python-workers/reporting` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/reporting/02-final-report-worker.md) |
| `7.3` | `MW-doc-003` Get Document Status and Download Endpoint | `P1` | `READY_FOR_DEV` | `document` | `nestjs-api` | [brief](../implementation/tasks/modules/document/03-get-document-status-endpoint.md) |
| `7.3` | `MW-web-005` Classification Status Page | `P1` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/05-classification-status-page.md) |
| `7.3` | `MW-web-006` Document Download Page | `P1` | `READY_FOR_DEV` | `web` | `nextjs` | [brief](../implementation/tasks/modules/web/06-document-download-page.md) |
| `8.1` | `MW-aud-001` List Audit Events Endpoint | `P1` | `READY_FOR_DEV` | `audit` | `nestjs-api` | [brief](../implementation/tasks/modules/audit/01-list-audit-events-endpoint.md) |
| `8.2` | `MW-aud-002` Export Audit Trail Endpoint | `P1` | `READY_FOR_DEV` | `audit` | `nestjs-api` | [brief](../implementation/tasks/modules/audit/02-export-audit-trail-endpoint.md) |
| `8.2` | `MW-rep-003` Audit Export Worker | `P1` | `READY_FOR_DEV` | `python-workers/reporting` | `lcsp-python-workers` | [brief](../implementation/tasks/modules/python-workers/reporting/03-audit-export-worker.md) |
