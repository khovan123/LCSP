# LCSP Architecture Review Checklist

## Purpose

Checklist này đánh giá `docs/architecture/architecture.md` trước khi LCSP chuyển sang backlog hoặc implementation planning.

Mục tiêu của checklist:

- Kiểm tra Conditional Architecture Document có giữ đúng product constraints không.
- Kiểm tra architecture có bám các conditional ADR không.
- Kiểm tra evidence-first classification gate, source code boundary, workspace/permission và validation caveats A1-A3.
- Ghi rõ những phần đã đủ điều kiện cho Architecture Review và những phần chưa đủ điều kiện để tạo implementation backlog.

Checklist này **không phải final approval** để tạo backlog vì A1-A3 chưa có validation result.

## Input Documents

| Document | Purpose in review |
| --- | --- |
| `docs/architecture/architecture.md` | Architecture document được review |
| `docs/architecture/architecture-decision-records.md` | Conditional ADR và status của từng quyết định |
| `docs/architecture/architecture-exploration.md` | Trade-off, option comparison và caveat ban đầu |
| `docs/product/prd.md` | Product requirements và acceptance criteria |
| `docs/product/validation-plan.md` | A1-A3 owner, method, threshold và backlog gate |
| `docs/product/product-brief.md` | Product positioning và decision nền |
| `LCSP_Technical_Specification.html` | Technical baseline: web, API, worker, scanner, RAG, document flow |

## Review Scope

In scope:

- Product constraint alignment.
- ADR alignment.
- Validation plan traceability.
- Evidence flow and classification gates.
- Security and source code boundary.
- Manager/Developer workspace and permissions.
- State model coverage.
- Open architecture decisions and premature locking risk.

Out of scope:

- Implementation backlog.
- Sprint plan.
- Code.
- Detailed database schema.
- Final queue, infrastructure, deployment topology or vendor lock-in.

## Product Constraint Alignment

| Product constraint | Architecture support | Review result | Notes |
| --- | --- | --- | --- |
| LCSP is evidence-based compliance platform | Architecture Overview, End-to-End Flow, Evidence Gates and Risk Classification boundary all enforce evidence-first behavior | PASS | Architecture does not position LCSP as chatbot/checklist |
| No technical evidence means no risk level | User Workspaces, End-to-End Flow and State Model explicitly lock classification | PASS | Wizard-only shows readiness/preliminary indicators only |
| Wizard-only only readiness/preliminary indicators | Manager Workspace and flow sections explicitly prohibit HIGH/MEDIUM/LOW | PASS | No “draft risk level” path found |
| Risk Classification only after VerifiedProfile | Risk Classification Agent Boundary and VerifiedProfile Lifecycle enforce this | PASS | Classification receives VerifiedProfile only |
| Conflict Score is the only blocking score | Scoring Architecture states only Conflict Score blocks workflow | PASS | Evidence Confidence and AI Intervention remain supporting signals |
| Human attestation is not bypass | Human Attestation Architecture defines schema, role-bound claims and forbidden metadata replacement | PARTIAL | ADR-008 still Needs Validation through A3 |
| No raw source to LLM | Scanner Boundary, Risk Agent Boundary and Privacy/Security sections state this explicitly | PASS | Worker normalizes evidence before agent/LLM |
| No long-term raw source storage | Scanner Boundary and Privacy/Security sections require temporary workspace cleanup | PASS | Exact TTL remains open |
| No final report with unresolved material/critical conflict | Document Generation and State Model enforce this | PASS | Final report generation is downstream of resolved conflicts |

## ADR Alignment

| ADR | Status | Architecture support | Remaining caveat | Review result |
| --- | --- | --- | --- | --- |
| ADR-001 - Monolith-first modular backend for MVP | Conditionally Accepted | Architecture uses modular API backend and avoids full microservices | Final service boundary deferred; A1-A3 may change contracts | PASS |
| ADR-002 - Separate Python worker for scanner and agent workloads | Conditionally Accepted | Python Scanner/Agent Worker owns scanner, normalization and agent workload | Worker packaging and queue technology deferred | PASS |
| ADR-003 - Manager-led workflow with task-based Developer participation | Accepted for MVP | Manager/Developer Workspace and permission model support task-based Developer participation | None blocking; exact UI flow depends A1 | PASS |
| ADR-004 - Evidence-first classification gate | Accepted for MVP | Evidence gates, VerifiedProfile lifecycle and Risk Agent boundary enforce gate | None blocking | PASS |
| ADR-005 - Hybrid evidence collection strategy | Conditionally Accepted | GitHub App, Local/CI upload and manual technical JSON are modeled | Local/CI provenance and manual evidence trust policy need final detail | PASS |
| ADR-006 - No raw source to LLM and no long-term raw source storage | Accepted for MVP | Scanner/source code boundary and privacy architecture enforce the rule | Retention TTL and cleanup verification need final design | PASS |
| ADR-007 - Conflict Score as the only blocking score | Accepted for MVP | Scoring Architecture separates all 3 scores and blocks only via Conflict Score | Exact score formulas can be tuned later | PASS |
| ADR-008 - Controlled human technical attestation | Needs Validation | Architecture includes attestation schema, role-bound claims, dual confirmation and forbidden metadata replacement | A3 must validate allowed claims and unlock policy | PARTIAL |

## Validation Plan Traceability

### A1 - Wizard Simplicity vs Completeness

| A1 affected area | Covered in architecture? | Evidence in architecture | Review result |
| --- | --- | --- | --- |
| WizardProfile schema | Yes | Architecture Overview, Wizard Module, Open Architecture Questions | PASS |
| Wizard UI | Yes | Manager Workspace, Wizard Module, Product caveat | PASS |
| Manager Workspace | Yes | User Workspaces and permission model | PASS |
| Reconciliation input | Yes | Reconciliation Architecture and VerifiedProfile Lifecycle | PASS |
| State model | Yes | State Model includes readiness/evidence/classification states | PASS |

Review note: architecture correctly treats Wizard question design and final WizardProfile field set as conditional. It does not lock the Wizard schema prematurely.

### A2 - Legal Corpus / Rule Reliability

| A2 affected area | Covered in architecture? | Evidence in architecture | Review result |
| --- | --- | --- | --- |
| Legal corpus versioning | Yes | Legal Corpus/RAG Architecture | PASS |
| Rule id | Yes | Risk Classification Agent Boundary and RAG section | PASS |
| Citation trace | Yes | Legal Corpus/RAG, Reporting, Audit | PASS |
| RAG boundary | Yes | RAG retrieves/grounds, does not invent legal rules | PASS |
| Risk Classification Agent output | Yes | Output must include rule trace and degrade/block when missing citation | PASS |

Review note: architecture correctly blocks unsupported legal conclusions and keeps legal rule/citation format open until A2 validation.

### A3 - Human Attestation Abuse Risk

| A3 affected area | Covered in architecture? | Evidence in architecture | Review result |
| --- | --- | --- | --- |
| Attestation schema | Yes | Human Attestation Architecture | PASS |
| Role-bound claims | Yes | Manager vs Developer claim matrix | PASS |
| Dual confirmation | Yes | Reconciliation and Attestation sections | PASS |
| Audit trail | Yes | Audit Trail Architecture | PASS |
| Evidence gate | Yes | Evidence Gates mention supplemental attestation only where allowed | PASS |
| Forbidden metadata replacement | Yes | Human Attestation Architecture table | PASS |

Review note: architecture covers the control surface, but final readiness is blocked because ADR-008 is still `Needs Validation` and A3 has no validation result yet.

## Evidence Flow Review

Target flow:

```text
WizardProfile
+ TechnicalEvidence
-> Schema Gate
-> Quality Gate
-> Reconciliation
-> VerifiedProfile
-> Risk Classification
-> Gap Analysis
-> Document Generation
-> Audit Trail
```

| Step | Owner module | Gate/block behavior | Review result |
| --- | --- | --- | --- |
| WizardProfile creation | Wizard Module | Produces readiness only when evidence missing | PASS |
| TechnicalEvidence collection | Evidence Module + Python Worker | Requires source/provenance/privacy metadata | PASS |
| Schema Gate | Evidence Module | Accept/reject report | PASS |
| Quality Gate | Evidence Module / Scoring support | Ready vs insufficient; no automatic unlock on weak evidence | PASS |
| Reconciliation | Reconciliation Module | Creates conflict and routes resolution | PASS |
| VerifiedProfile | Reconciliation / Assessment | Cannot exist with unresolved material/critical conflict | PASS |
| Risk Classification | Risk Classification Module / Worker | Runs only after VerifiedProfile and legal rule trace | PASS |
| Gap Analysis | Risk/Document pipeline | Downstream of valid risk result | PASS |
| Document Generation | Document Module | No final report while blocked conflict remains | PASS |
| Audit Trail | Audit Module | Records gate, conflict, attestation, classification, document | PASS |

Bypass check:

| Potential bypass | Architecture response | Review result |
| --- | --- | --- |
| Wizard-only runs classification | Explicitly prohibited | PASS |
| Weak evidence unlocks classification automatically | Prohibited; needs additional evidence or valid controlled attestation | PASS |
| Human attestation replaces machine metadata | Explicitly forbidden | PASS |
| Developer generates final report | Permission model forbids | PASS |
| Final report with unresolved material conflict | Document gate forbids | PASS |
| LLM receives raw source code | Source boundary forbids | PASS |

## Security & Privacy Review

| Security/privacy concern | Architecture coverage | Review result | Notes |
| --- | --- | --- | --- |
| GitHub App least privilege | GitHub read-only path documented | PASS | Exact permission manifest deferred |
| Source code temporary workspace | Scanner boundary requires cleanup | PASS | TTL/cleanup verification still open |
| Raw source not sent to LLM | Hard boundary in scanner and agent sections | PASS | Applies to GitHub and Local/CI modes |
| Raw source not stored long-term | Explicitly prohibited | PASS | Audit stores metadata/report refs only |
| Secret redaction | Scanner responsibilities include redaction | PASS | Exact redaction tool/rules deferred |
| Evidence report hashing | Evidence contract and privacy/security include report_hash | PASS | Hash algorithm/detail deferred |
| Audit trail metadata only | Audit section avoids raw source | PASS | Append-only implementation not finalized |
| Object storage boundary | Stores generated docs/non-source artifacts | PASS | No raw source storage |
| Role-based access | Manager/Developer RBAC and task policy modeled | PASS | Final enforcement design deferred |
| Developer task policy | Listed explicitly | PASS | Exact policy data model deferred |

## Workspace & Permission Review

| Permission/workspace requirement | Architecture support | Review result |
| --- | --- | --- |
| Manager owns assessment | Manager Workspace and Assessment Module support owner model | PASS |
| Manager can create assessment, fill Wizard, invite Developer, assign policy | Covered in Manager Workspace | PASS |
| Manager tracks progress and resolves business/legal conflicts | Covered in Manager Workspace and Reconciliation | PASS |
| Manager approves VerifiedProfile and generates report | Covered, with gates | PASS |
| Developer sees only assigned technical tasks | Covered in Developer Workspace and RBAC module | PASS |
| Developer can connect repo/upload evidence/review findings/confirm technical truth | Covered in Developer Workspace | PASS |
| Developer cannot approve final report | Explicitly forbidden | PASS |
| Manager cannot confirm technical truth alone for material technical conflict | Dual-confirmation model covers material conflicts | PASS |
| Material conflict requires Manager + Developer | Covered in Reconciliation and Attestation sections | PASS |

## State Model Review

| Required state coverage | Present in architecture? | Review result |
| --- | --- | --- |
| evidence missing | `TECHNICAL_EVIDENCE_MISSING` | PASS |
| evidence rejected | `TECHNICAL_EVIDENCE_REJECTED` | PASS |
| evidence insufficient | `TECHNICAL_EVIDENCE_INSUFFICIENT` | PASS |
| evidence ready | `TECHNICAL_EVIDENCE_READY` | PASS |
| reconciliation required | `RECONCILIATION_REQUIRED` | PASS |
| developer confirmation required | `DEVELOPER_CONFIRMATION_REQUIRED` | PASS |
| manager confirmation required | `MANAGER_CONFIRMATION_REQUIRED` | PASS |
| verified profile ready | `VERIFIED_PROFILE_READY` | PASS |
| ready for classification | `READY_FOR_CLASSIFICATION` | PASS |
| blocked by conflict | `BLOCKED_BY_CONFLICT` | PASS |
| report ready | `REPORT_READY` | PASS |

Additional useful states present:

| State | Purpose |
| --- | --- |
| `WIZARD_IN_PROGRESS` | Manager filling Wizard |
| `SELF_DECLARED_READINESS` | Wizard submitted without evidence; no risk level |
| `TECHNICAL_EVIDENCE_REQUIRED` | Technical evidence needed |
| `DEVELOPER_INVITED` | Developer invited |
| `EVIDENCE_COLLECTION_IN_PROGRESS` | Evidence collection active |
| `CLASSIFICATION_COMPLETED` | Classification completed with rule trace |
| `GAP_ANALYZED` | Gap analysis completed |

## Open Architecture Questions

Decisions not locked:

| Area | Decision not locked |
| --- | --- |
| Database | Final schema, audit immutability model, versioning model |
| Queue | Final queue technology, retry/dead-letter semantics |
| Deployment topology | VPS/Docker vs managed infrastructure vs enterprise deployment |
| Scanner packaging | GitHub App runner, CLI packaging, CI integration details |
| Legal rule engine | Rule schema, rule execution mechanism, rule_id format |
| Legal corpus/RAG | Chunking, citation validation, legal corpus version pinning |
| Document generation | Final template engine and export formats |
| On-prem/enterprise mode | Network/security model and data residency |
| Human attestation | Final allowed claims, enforcement and unlock policy after A3 |
| Evidence thresholds | Context-aware quality thresholds and tuning dataset |
| Validation impact | How A1-A3 results change PRD, ADR and architecture |

Premature locking check:

| Potential premature decision | Current architecture behavior | Review result |
| --- | --- | --- |
| Full microservices | Deferred; modular monolith selected conditionally | PASS |
| Final DB schema | Deferred | PASS |
| Final deployment topology | Conceptual only | PASS |
| Final queue tech | Deferred | PASS |
| Final legal rule engine implementation | Deferred | PASS |
| Final attestation unlock policy | Deferred pending A3 | PASS |

## Review Result Summary

| Area | Result | Notes | Required Action |
| --- | --- | --- | --- |
| Product Constraint Alignment | PASS | Core product constraints are reflected in architecture | Keep as review baseline |
| ADR Alignment | PARTIAL | ADR-008 remains Needs Validation; others are aligned | Validate A3 before backlog |
| Validation Plan Traceability | PASS | A1-A3 dependencies are visible and tied to architecture areas | Track validation results |
| Evidence Flow Review | PASS | No bypass path found for classification/report gates | Preserve gates in final architecture |
| Security & Privacy Review | PASS | Source boundary is explicit | Define cleanup/retention details later |
| Workspace & Permission Review | PASS | Manager-led and Developer task policies are clear | Finalize policy data model later |
| State Model Review | PASS | Required states are covered | Align naming in final architecture if needed |
| Open Architecture Questions | BLOCKED_BY_VALIDATION | Several decisions depend on A1-A3 | Do not create implementation backlog yet |

## Readiness Recommendation

| Recommendation level | Result | Reason |
| --- | --- | --- |
| READY_FOR_ARCHITECTURE_REVIEW | Yes | Architecture is coherent, bám PRD/ADR and exposes conditional caveats |
| READY_FOR_ARCHITECTURE_REVISION | Not required now | No immediate contradiction found that requires editing architecture before review |
| READY_FOR_BACKLOG | No | A1-A3 validation results are missing |
| BLOCKED_BY_A1_A3_VALIDATION | Yes, for implementation backlog | Validation plan has owner/method/threshold, but no validation result yet |

Formal recommendation:

```text
READY_FOR_ARCHITECTURE_REVIEW.
BLOCKED_BY_A1_A3_VALIDATION for implementation backlog.
```

## Required Follow-up Actions

| Action | Owner | Required before |
| --- | --- | --- |
| Run A1 Wizard validation with Manager-like users and scenarios | Product Manager / UX / Domain Reviewer | Backlog |
| Validate A2 legal rule/citation trace with representative scenarios | Product Manager / Legal Rule Owner | Backlog |
| Validate A3 attestation abuse cases and role-bound claim policy | Product Manager / Governance Reviewer | Backlog |
| Update PRD if any A1-A3 validation fails | Product Manager | Final architecture/backlog |
| Revisit ADR-001/004/005/007/008 if A1-A3 change core contracts | Architect | Final architecture/backlog |
| Revisit `architecture.md` after validation results | Architect | Backlog |
| Define implementation-level schema/queue/deployment only after validation gate | Architect/Engineering | Implementation planning |

## Required Conclusion

Architecture hiện tại sẵn sàng cho **Architecture Review**.

Architecture hiện tại **chưa sẵn sàng cho implementation backlog** nếu A1-A3 chưa có validation result.

Nếu A1-A3 fail, cần cập nhật PRD, ADR và Architecture trước khi backlog.

Không được tạo implementation backlog từ architecture này cho đến khi review result cho phép.
