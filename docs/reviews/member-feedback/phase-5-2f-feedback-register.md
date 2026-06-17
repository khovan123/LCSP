# Phase 5.2F Feedback Register

## Repository Snapshot

| Item | Value |
|---|---|
| Current commit SHA | `b41987bf9b78b2a2e1cc253c5ef752f474c6f71c` |
| Current branch | `main` |
| Feedback source files | `/mnt/data/anh.txt`, `/mnt/data/thuy.txt`, `/mnt/data/tu.txt` were unavailable in this sandbox. Member-specific extraction was not fabricated. |
| Verification basis | Active repository docs plus required baseline findings provided in the Phase 5.2F prompt. |

## Feedback Items

| Feedback ID | Source | Document | Section | Problem | Verified Against Repo | Priority | Category | Proposed Disposition |
|---|---|---|---|---|---|---|---|---|
| FB-ANH-001 | `/mnt/data/anh.txt` | N/A | N/A | Source file unavailable; no member-specific statement could be extracted without fabrication. | NOT_REPRODUCED | P2 | Source availability | DEFER |
| FB-THUY-001 | `/mnt/data/thuy.txt` | N/A | N/A | Source file unavailable; no member-specific statement could be extracted without fabrication. | NOT_REPRODUCED | P2 | Source availability | DEFER |
| FB-TU-001 | `/mnt/data/tu.txt` | N/A | N/A | Source file unavailable; no member-specific statement could be extracted without fabrication. | NOT_REPRODUCED | P2 | Source availability | DEFER |
| FB-OWNER-001 | Project Owner feedback | Active docs | Cross-document references | Active docs referenced archived or nonexistent implementation blueprints after archive moves. | VERIFIED | P0 | Reference integrity | ACCEPT |
| FB-OWNER-002 | Required baseline P0 | `event-catalog.md`, `queue-implementation.md`, `worker-code-map.md`, `end-to-end-execution.md` | Runtime orchestration | Gap Analysis existed in architecture/domain but was missing as a first-class command/event/worker step. | VERIFIED | P0 | Runtime choreography | ACCEPT |
| FB-OWNER-003 | Required baseline P0 | `end-to-end-execution.md` | Execution Trace | End-to-end execution jumped from Classification directly to Document Generation. | VERIFIED | P0 | Runtime choreography | ACCEPT |
| FB-OWNER-004 | Required baseline P0 | `queue-implementation.md`, `event-catalog.md` | Queue topology | Queue choreography lacked Gap Analysis command/event chain. | VERIFIED | P0 | Queue contract | ACCEPT |
| FB-OWNER-005 | Required baseline P0 | `end-to-end-execution.md` | Rule Execution Walkthrough | `AUF-019` was used for bounded-path human-review absence; canonical rule is `AUF-018`. | VERIFIED | P0 | Rule reference | ACCEPT |
| FB-OWNER-006 | Required baseline P0 | `end-to-end-execution.md`, `assessment-lifecycle-spec.md` | Rule catalog | `AUF-042` was referenced but absent from canonical rule catalog. | VERIFIED | P0 | Rule catalog | ACCEPT |
| FB-OWNER-007 | Required baseline P0 | `scanner-implementation.md`, `scanner-data-journey.md` | Scanner completion | Scanner completion event could be read as occurring before cleanup verification. | VERIFIED | P0 | Security / cleanup | ACCEPT |
| FB-OWNER-008 | Required baseline P0 | `scanner-spec.md`, `assessment-lifecycle-spec.md` | EvidenceRef | Scanner and lifecycle specs had incompatible `EvidenceRef` structures. | VERIFIED | P0 | Shared contract | ACCEPT |
| FB-OWNER-009 | Required baseline P0 | `scanner-spec.md` | Required Scanner Pipeline | Scanner pipeline included downstream TechnicalProfile and AIUsageFlow stages. | VERIFIED | P0 | Component boundary | ACCEPT |
| FB-OWNER-010 | Required baseline P0 | `scanner-spec.md`, `scanner-implementation.md`, `document-generation-spec.md` | Runtime references | Active scanner/document docs referenced old blueprint paths that no longer exist as canonical active docs. | VERIFIED | P0 | Reference integrity | ACCEPT |
| FB-OWNER-011 | Required baseline P1 | `scanner-spec.md` | Confidence | Scanner confidence bands existed but deterministic calculation was missing. | VERIFIED | P1 | Algorithm clarity | ACCEPT |
| FB-OWNER-012 | Required baseline P1 | `assessment-lifecycle-spec.md` | AIUsageFlow confidence | `confidenceBreakdown.final` lacked explicit equality, rounding, clamp and aggregation rules. | VERIFIED | P1 | Rule engine | ACCEPT |
| FB-OWNER-013 | Required baseline P1 | `legal-matching-domain-spec.md` | Claim eligibility | Legal Matching lacked a technical eligibility threshold for low-confidence material claims. | VERIFIED | P1 | Legal matching boundary | ACCEPT |
| FB-OWNER-014 | Required baseline P1 | `developer-execution-blueprints/` | Runtime blueprint | No active dedicated blueprint existed for Gap Analysis. | VERIFIED | P1 | Runtime flow | ACCEPT |
| FB-OWNER-015 | Required baseline P1 | `scanner-spec.md` | Finding semantics | `AI_MODEL_USAGE`, `AI_PROVIDER_USAGE`, and `AI_MODEL_INVOCATION` boundaries were unclear. | VERIFIED | P1 | Finding taxonomy | ACCEPT |
| FB-OWNER-016 | Required baseline P1 | `scanner-spec.md` | Harm signal ownership | `HARM_POTENTIAL_SIGNAL` ownership was unclear. | VERIFIED | P1 | Finding taxonomy | ACCEPT |
| FB-OWNER-017 | Required baseline P1 | `scanner-spec.md` | BASIC_SIGNAL_ONLY | BASIC_SIGNAL_ONLY languages mapped to unsupported adapter without explaining where basic signals come from. | VERIFIED | P1 | Scanner behavior | ACCEPT |
| FB-OWNER-018 | Required baseline P1 | `end-to-end-execution.md` | Database Journey | Database Journey omitted several downstream objects. | VERIFIED | P1 | Runtime trace | ACCEPT |
| FB-OWNER-019 | Required baseline P2 | `README.md`, active docs | Navigation | Active/archive reference labeling needed clearer MVP/source-of-truth routing. | VERIFIED | P2 | Documentation usability | ACCEPT |

## Notes

- The three named member feedback files must be reprocessed if they become available in the workspace.
- No archived document was promoted to canonical source.
- Remediation was limited to active docs and the required review/decision/report artifacts.
