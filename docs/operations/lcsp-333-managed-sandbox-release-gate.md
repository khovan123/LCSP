# LCSP-333 managed sandbox release gate

LCSP-333 release readiness is blocked until a managed-sandbox proof artifact is
validated. Unit tests, mocked sandbox declarations, GitHub CI alone, or code
review PASS are not sufficient proof.

## Commands

Validate a real managed-sandbox proof:

```bash
pnpm run check:managed-sandbox-release-gate -- \
  --proof artifacts/lcsp333-managed-sandbox-proof.json \
  --out artifacts/lcsp333-managed-sandbox-gate-result.json
```

Validate the gate implementation itself:

```bash
pnpm run test:managed-sandbox-release-gate
```

For pull requests that touch the release-gate surface, CI also requires the
`LCSP-333 managed sandbox proof` job. It runs on a self-hosted runner carrying
the `lcsp-managed-sandbox` label. That runner must provide the
`lcsp-managed-sandbox-proof` executable. The executable is the production
proof producer: it must start the canonical PR-triggered review run, exercise
Scanner → PGE → Interview or governed no-interview → EngineeringRule → Planner
→ Investigator, observe durable runtime/Web evidence and restart
reconciliation, re-check GitHub CI/mergeability and the final PR head, sanitize
the evidence, and write `LCSP333_MANAGED_SANDBOX_PROOF_V1` to the requested
`--out` path. Missing runner capacity, a missing producer executable, or a
missing/invalid proof fails the required job; fixture proof is not accepted by
this CI path.

The privileged producer job is restricted to same-repository pull-request
branches. Fork pull requests never execute on the self-hosted managed-sandbox
runner. The privileged job does not check out PR code, install PR dependencies,
or execute repository lifecycle scripts on the host; it invokes only the
host-managed producer with immutable PR/base/head identifiers and writes into a
fresh runner-temporary proof directory. PR checkout, dependency installation,
and proof validation run afterward on a GitHub-hosted runner. The producer is
responsible for executing the requested exact head inside its disposable,
production-equivalent sandbox boundary and must not reuse PR workspace state or
credentials between runs.

If the managed sandbox is unavailable, release governance may provide a
time-boxed exemption artifact:

```bash
pnpm run check:managed-sandbox-release-gate -- \
  --exemption artifacts/lcsp333-non-sandbox-exemption.json \
  --out artifacts/lcsp333-managed-sandbox-gate-result.json
```

An exemption is not a READY verdict. It records why the sandbox proof was not
available and must be accepted separately by release governance.

## Required proof artifact

The proof JSON must use schema version
`LCSP333_MANAGED_SANDBOX_PROOF_V1` and prove one correlated production-equivalent
execution:

```json
{
  "schemaVersion": "LCSP333_MANAGED_SANDBOX_PROOF_V1",
  "run": {
    "prNumber": 338,
    "runId": "review-run-338-1",
    "generation": 1,
    "baseSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "headSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "triggerType": "webhook:synchronize",
    "triggerId": "delivery-338",
    "status": "COMPLETED",
    "terminalVerdict": "READY"
  }
}
```

The full artifact must also include:

- exact-head evidence: pinned PR head, sandbox checkout SHA, and final head
  re-check;
- one authoritative canonical run for the current PR/head/generation whose
  lifecycle state matches run.status; the run must be terminal, and READY/PASS
  is valid only with run.status=COMPLETED;
- restart reconciliation proving stale/orphaned runs were superseded, cancelled
  or failed with a reason;
- managed sandbox host kind, sanitized log refs and artifact refs;
- exact-head CI check-run IDs, pending checks and GitHub mergeability state;
- completed pipeline stages from PR trigger through terminal verdict, including
  Scanner, PGE, Interview/no-interview branch, EngineeringRule selection and
  evaluation, Planner, Investigator, runtime persistence and Web/SSE
  observability;
- correlation IDs for PR/run/head/assessment/scanner/PGE/runtime/agent/rule/tool
  and check runs;
- persisted UI-visible runtime event classes required to reconstruct the Web
  timeline after reconnect/restart;
- regression evidence for PR #335 duplicate-run cleanup, PR #338 green
  exact-head readiness, PR #336 code-PASS-but-CI-pending non-readiness, and
  selected-run cancellation isolation.

## Privacy invariants

The proof and linked logs/artifacts must already be sanitized before validation.
The validator rejects secret-like values and raw fields named like system
prompts, developer prompts, hidden reasoning, private context, unrestricted
source, credentials, API keys, passwords or access tokens unless they are
explicitly redacted.

Never include:

- credentials, token-bearing URLs or secret environment values;
- raw system/developer prompts;
- hidden chain-of-thought or hidden model reasoning;
- unrestricted customer/private context;
- unrestricted repository source.
