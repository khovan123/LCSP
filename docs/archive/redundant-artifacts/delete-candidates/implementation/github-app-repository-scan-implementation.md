# GitHub App Repository Scan Implementation

## Purpose

Define the GitHub App repository integration and Repository Scan implementation contract for LCSP MVP.

## Scope

MVP technical evidence is acquired only through Manager-triggered GitHub Repository Scan. Manual evidence, Local/CI uploads, CLI evidence, CI/CD evidence and API probing are not active MVP flows.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Static Analysis Scanner Contract](../specs/static-analysis-scanner-contract.md)
- [Source Code Privacy Policy](../security/source-code-privacy-policy.md)

## Implementation Boundaries

| Capability | Boundary |
| --- | --- |
| OAuth/OIDC Login | Authenticates LCSP user identity |
| GitHub App Connection | Grants read-only repository access for scan |
| Repository Scan | Produces `TechnicalEvidenceReport` from selected repo/branch/commit |

OAuth/OIDC Login does not install GitHub App, does not grant repository access and does not authorize scanning.

## MVP Scan Flow

```text
Manager connects GitHub Repository
-> Manager chooses repository / branch / commit
-> Manager requests Repository Scan
-> API creates RepositoryScanJob
-> Queue delivers scan job
-> Worker scans isolated workspace
-> TechnicalEvidenceReport persisted as structured metadata
-> workspace deleted
```

## GitHub App Installation and Authorization

- Manager initiates GitHub App connection from LCSP.
- API records installation metadata and selected repository access reference.
- Repository access must be least privilege and scoped to selected repositories.
- Branch and commit selection must be pinned before scan.
- Scan authorization must verify LCSP Manager permission and valid GitHub App installation.

## Static Scanner Lifecycle

| Step | Implementation Contract |
| --- | --- |
| Snapshot | Shallow clone selected repository at pinned commit SHA |
| Workspace | Ephemeral isolated container or restricted temporary volume |
| Execution | Static file reads and parsing only; no customer code/scripts/builds/tests/install/Docker/CI/API probes |
| Analysis | Inventory, manifest/config parsing, AST/symbol analysis, AI invocation/input/output/action/review signals |
| Persistence | Structured findings, hashes, graph refs, report metadata, coverage limitations |
| Cleanup | Raw workspace deletion is mandatory and audited |

## Required Inputs and Outputs

| Input | Source | Output |
| --- | --- | --- |
| Assessment id, repository id, branch, commit SHA | Manager/API | RepositoryScanJob |
| GitHub App installation reference | GitHub Integration | Temporary repository access context |
| Scanner/ruleset version | Worker config | Versioned scan metadata |
| Structured findings | Scanner | TechnicalEvidenceReport |

## Idempotency and Re-scan

Use an idempotency key based on repository, commit SHA, scanner version and ruleset version. Re-run is allowed when Manager requests it or evidence is insufficient/stale. Duplicate scan requests with the same key return the existing job/result when safe.

## Failure and Retry Behavior

| Failure | Behavior |
| --- | --- |
| Missing GitHub App installation | Block scan and show repository connection required |
| Token/access failure | Mark scan failed, audit, allow Manager correction/retry |
| Clone failure | Retry if transient, otherwise fail job |
| Scanner failure | Mark report unavailable, classification locked |
| Workspace cleanup failure | Critical security event requiring alert and remediation |
| Report hash mismatch | Reject report and keep classification locked |

## Security and Privacy Considerations

- Non-root scanner execution.
- Restricted filesystem write access.
- Restricted outbound network after repository retrieval.
- File size, count, depth and time limits.
- Skip binaries, generated assets and minified bundles by policy.
- Secrets redacted before persistence.
- Raw source, full prompts, full AST bodies and secrets are not persisted or sent to LLM.

## Audit Requirements

Audit repository connected/disconnected, access denied, scan requested, scan started, scan completed, scan failed, report hash, scanner version, ruleset version, cleanup success/failure and re-scan request.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Exact scanner sandbox technology | Ephemeral isolated container or restricted temporary volume | Implementation |
| GitHub App permission set | Least privilege selected repo read access | Implementation/security review |

