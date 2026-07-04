---
lastSaved: '2026-06-25'
status: BLOCKED
requestedWorkflows:
  - bmad-testarch-atdd
  - bmad-testarch-automate
blockingReason: TEST_FRAMEWORK_SCAFFOLDING_MISSING
---

# ATDD and Automation Preflight Blocker

## Result

```text
ATDD_HALTED
AUTOMATION_HALTED
TEST_FRAMEWORK_SCAFFOLDING_MISSING
RUN_FRAMEWORK_WORKFLOW_FIRST
```

## Requested Scope

Run ATDD for 44 P0 acceptance criteria first, then automate coverage for P1/API/worker/authz/error/UI journeys.

## Preflight Findings

The repository currently has clear formal acceptance criteria and trace output:

- `docs/specs/acceptance-criteria-catalog.md`
- `docs/planning-artifacts/epics.md`
- `docs/test-artifacts/traceability-matrix.md`
- `docs/test-artifacts/e2e-trace-summary.json`
- `docs/test-artifacts/gate-decision.json`

However, no executable test framework scaffolding was found.

Missing framework indicators include:

- `package.json`
- `playwright.config.*`
- `cypress.config.*`
- `pyproject.toml`
- `pytest.ini`
- `conftest.py`
- `tests/`
- `*.spec.*`
- `*.test.*`

## Workflow Rule Applied

`bmad-testarch-atdd` Step 1 requires:

```text
Story approved with clear acceptance criteria
Test framework configured
Development environment available
If any are missing: HALT
```

`bmad-testarch-automate` Step 1 requires:

```text
Verify framework exists
If missing: HALT with message "Run framework workflow first."
```

## Required Next Step

Run the test framework setup workflow before ATDD or automation can generate executable scaffolds.

Recommended framework direction for LCSP based on current docs:

- backend/API and worker contract tests first;
- Playwright APIRequest or equivalent API integration layer for route contracts;
- Python worker tests if the implementation runtime is Python;
- UI/E2E scaffolding only after frontend app/framework exists.

## After Framework Setup

Re-run:

```text
1. bmad-testarch-atdd for P0 ACs.
2. bmad-testarch-automate for P1/API/worker/authz/error/UI gaps.
3. bmad-testarch-trace to update gate status.
```
