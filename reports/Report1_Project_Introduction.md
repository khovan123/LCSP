**Capstone Project Report**

**Report 1 – Project Introduction**

– [Institution / Organization Logo] –

**Table of Contents**

[I. Record of Changes 3](#_Toc83330272)

[II. Project Introduction 4](#_Toc83330273)

[1. Overview 4](#_Toc83330274)

[1.1 Project Information 4](#_Toc83330275)

[1.2 Project Team 4](#_Toc83330276)

[2. Product Background 4](#_Toc83330277)

[3. Existing Systems 4](#_Toc83330278)

[3.1 System name1 4](#_Toc83330279)

[3.2 System name2 4](#_Toc83330280)

[4. Business Opportunity 4](#_Toc83330281)

[5. Software Product Vision 5](#_Toc83330282)

[6. Project Scope & Limitations 5](#_Toc83330283)

[6.1 Major Features 5](#_Toc83330284)

[6.2 Limitations & Exclusions 6](#_Toc83330285)

# I. Record of Changes

|  |  |  |  |
| --- | --- | --- | --- |
| Date | A\* M, D | In charge | Change Description |
| 2026-07-06 | A | Project Team | Initial authored version of Report 1 grounded in `docs/product/`, `docs/architecture/`, and `docs/specs/` (Phase 5.2L/5.2M canonical baseline). |
|  |  |  |  |
|  |  |  |  |

\*A - Added M - Modified D - Deleted

# II. Project Introduction

## 1. Overview

### 1.1 Project Information

* Project name: **LCSP – Legal Compliance Support Platform**
* Project code: **LCSP**
* Group name: **[Group / Class Name]**
* Software type: Web application (Manager-facing workspace) with an asynchronous Python worker platform and a Vietnamese legal-corpus retrieval subsystem (ChromaDB, structure-first/vectorless)

### 1.2 Project Team

|  |  |  |  |
| --- | --- | --- | --- |
| **Full Name** | **Role** | **Email** | **Mobile** |
| [Team Member Name] | Project Owner / Product | [email] | [mobile] |
| [Team Member Name] | Technical Lead | [email] | [mobile] |
| [Team Member Name] | Backend (NestJS / API) | [email] | [mobile] |
| [Team Member Name] | Python Worker Platform | [email] | [mobile] |
| [Team Member Name] | Frontend (Next.js) | [email] | [mobile] |
| [Supervisor / Mentor Name] | Supervisor | [email] | [mobile] |

## 2. Product Background

Vietnamese organizations that build, integrate, or operate AI-driven features are increasingly subject to a fast-moving legal framework — most notably **Luật AI 134/2025** together with related data-protection and cybersecurity instruments such as **Luật Bảo vệ dữ liệu cá nhân 91/2025** and its predecessor decree, and cross-referencing amendments under **Luật 71/2025**. These instruments impose obligations that vary by AI risk tier, use case, and the categories of data and subjects involved.

In practice, the organizations responsible for this compliance burden — typically a non-technical **Manager** (compliance officer, legal counsel, or product owner) — do not have a reliable way to answer a simple question: *"What does our system actually do with AI, and what does the law require as a result?"* Two weak approaches are common today:

1. **Self-declared questionnaires** capture what a Manager believes the system does, but the declaration can silently drift from what the codebase actually implements (undeclared providers, forgotten integrations, decommissioned features left partially active).
2. **Manual legal review** of a codebase by outside counsel or consultants is accurate but slow, expensive, and not repeatable each time the code changes.

LCSP (Legal Compliance Support Platform) was initiated to close this gap: to let a Manager get a **citation-backed compliance risk classification** that is grounded in **technical evidence extracted directly from source code**, reconciled against business context, and never disconnected from an approved, versioned legal text.

## 3. Existing Systems

### 3.1 Generic GRC / compliance questionnaire platforms

Commercial Governance-Risk-Compliance (GRC) tools (e.g., enterprise trust/compliance-management platforms) let an organization answer structured questionnaires and track evidence documents against a control framework (SOC 2, ISO 27001, GDPR, etc.). They are mature at workflow, evidence storage, and audit-trail management.

* **Actors:** Compliance officer, auditor, control owner.
* **Strengths:** Broad framework coverage, strong document/evidence management, mature audit export.
* **Gaps relevant to LCSP:** Evidence is uploaded and self-attested by humans; there is no static analysis of the organization's own source code, and none of these platforms map findings to **Vietnamese** AI-specific statutes at the article/clause level.

### 3.2 Static code analysis / SAST tooling

Static analysis and SAST tools (e.g., Semgrep, SonarQube, dependency/SBOM scanners such as Syft) detect code patterns, vulnerable dependencies, and rule violations directly from source code.

* **Actors:** Developer, security engineer.
* **Strengths:** Direct, reproducible, evidence-grade technical findings; no reliance on human self-report.
* **Gaps relevant to LCSP:** Findings are technical signals (an LLM SDK import, an HTTP call pattern) with **no legal interpretation layer** — they do not know what "Điều 12, Luật AI 134/2025" requires, and they cannot reconcile a technical finding against a Manager's declared business purpose.

LCSP's approach is to combine both worlds: it reuses the same class of static-analysis technique used by SAST tools (Syft, Knip, deptry, `ast`/`libcst`, `ts-morph`, tree-sitter, Semgrep custom rules) as its **primary evidence source**, and adds a citation-backed legal-matching layer over a structure-first, vectorless Vietnamese legal corpus (ChromaDB) — something neither category of existing system provides today.

## 4. Business Opportunity

The enactment of Luật AI 134/2025 and the surrounding data-protection framework creates a compliance obligation for any Vietnamese organization operating AI-driven systems, but there is no existing product that connects **what the code actually does** to **what the applicable law requires**, with a defensible citation trail. This leaves organizations with two unattractive options: pay for slow, expensive, non-repeatable manual legal review, or rely on self-declared questionnaires that can be wrong the moment the codebase changes and nobody updates the declaration.

LCSP is attractive because it removes the weakest link in that chain — the assumption that declared business context matches actual system behavior — by making static technical evidence the **primary** input, and treating Manager-declared business context (the WizardProfile) as optional, corroborating information rather than a blocking gate. Classification is never produced without a citation to an approved, versioned legal source, and the platform fails closed (blocks or degrades output with a clear reason) whenever evidence, reconciliation, or legal citation is insufficient, rather than guessing.

## 5. Software Product Vision

For Managers accountable for AI compliance at organizations operating in Vietnam, **LCSP** is a Manager-led, evidence-first compliance assessment platform that connects a read-only snapshot of an organization's codebase to a static-analysis pipeline, reconciles the resulting technical findings with optional business context, and produces a **citation-backed risk classification and gap analysis** mapped to the applicable Vietnamese legal corpus (Luật AI 134/2025 and related instruments).

Unlike generic GRC questionnaires or unaided manual legal review, LCSP never reports a risk conclusion without either (a) a technical evidence reference from its scanner pipeline, or (b) a citation to an approved, immutable legal corpus version — and it explicitly shows a blocked or degraded state, with a plain-language reason, whenever either basis is missing, rather than overclaiming certainty it does not have.

## 6. Project Scope & Limitations

### 6.1 Major Features

FE-01: Manager account authentication (password/MFA/OAuth-OIDC), organization membership, and PBAC (policy-based access control) policy-scope management for optional Developer collaborators. *(UC-001, UC-002)*

FE-02: Assessment creation and optional WizardProfile business-context capture (purpose, sector, data categories, affected people, oversight, external LLM usage) — readiness state only, never a risk level on its own. *(UC-003, UC-004)*

FE-03: Read-only GitHub repository connection (separate from login) and commit-pinned, immutable repository snapshot creation. *(UC-005, UC-006)*

FE-04: Automatic trusted static repository scan (no manual upload) through a sandboxed Python Scanner Worker using Syft, Knip, deptry, `ast`/`libcst`, bounded `ts-morph`, tree-sitter/custom parsers, and Semgrep custom rules, with verified workspace cleanup. *(UC-007, UC-016, UC-017)*

FE-05: Evidence-backed TechnicalProfile and claim-level AIUsageFlow generation, each claim carrying confidence and evidence references — no claim is asserted without a traceable evidence pointer. *(UC-008, UC-009)*

FE-06: Manager reconciliation of conflicts between declared business context and technical evidence, producing an immutable VerifiedProfile (`TECHNICAL_ONLY` or `TECHNICAL_PLUS_WIZARD`). *(UC-010, UC-011)*

FE-07: Citation-backed legal rule matching against an approved, versioned Vietnamese legal corpus using a structure-first, vectorless ChromaDB retrieval index (no dense embeddings required for MVP). *(UC-012)*

FE-08: Risk classification that is blocked or degraded — never guessed — whenever a required legal citation, evidence basis, or unresolved conflict is missing. *(UC-013)*

FE-09: Gap analysis and guarded final compliance-support document generation (and an earlier readiness-only export containing no risk level). *(UC-014)*

FE-10: Full, redacted audit trail review and export across authentication, PBAC decisions, evidence, conflicts, legal matching, classification, and document events. *(UC-015)*

### 6.2 Limitations & Exclusions

LI-1: The Python Scanner Worker performs **static analysis only** — it never executes customer application code, and cross-module tracing stops hard at dynamic imports, reflection, and runtime configuration boundaries.

LI-2: There is **no manual technical evidence JSON upload** path (`FR-051`, removed from product scope) and **no local/CI scanner report upload** — the only supported evidence path is the automatic trusted scan (`FR-050`).

LI-3: Historical **structured technical attestation** (`FR-045`/`FR-046`) is superseded for the active MVP and is not an available input, screen, or API.

LI-4: **Delegated free-form clarification** (`FR-052`) is deferred post-MVP; Developer collaboration is limited to independently scoped, valuable technical tasks.

LI-5: Legal corpus ingestion, review, and approval, and legal-rule-catalog authoring/approval, are **internal Internal-Legal-Operator API/CLI operations only** for MVP — there is no customer-facing legal corpus administration console.

LI-6: Legal retrieval for MVP uses a **structure-first, vectorless ChromaDB index**; dense embedding / semantic nearest-neighbor retrieval is explicitly out of scope unless separately approved in a future phase.

LI-7: LCSP produces a **compliance-support report**, not a formal legal opinion, compliance certification, or direct regulator submission — all such framings are guarded against in generated output.

LI-8: Raw source code, secrets, full prompts, and full AST bodies are never sent to an LLM provider or persisted long-term; only redacted metadata, evidence references, and hashes are retained.
