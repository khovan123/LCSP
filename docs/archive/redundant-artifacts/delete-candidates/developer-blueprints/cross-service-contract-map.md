# Cross-Service Contract Map

| Contract | Producer | Consumer | Transport | Payload / Model | Guardrail |
|---|---|---|---|---|---|
| OAuth session | Web/Auth API | API guards | HTTP cookie/header | `Session`, `OAuthIdentity` | OAuth/OIDC does not grant GitHub repository access |
| Manager authorization | Auth API | All protected modules | NestJS guard | `AssessmentMember`, role constants | Developer absence must not block MVP workflow |
| Repository snapshot | GitHub API | Scan API/Worker | DB ref + job payload | `GitHubRepositoryConnection`, `RepositorySnapshot` | metadata only, no raw source persisted |
| Repository scan job | Scan API | Worker orchestrator | RabbitMQ | `RepositoryScanJobRequested` | job refs only, no source content |
| Technical evidence | Scanner worker | Evidence gates, AIUsageFlow | DB | `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference` | no raw source/full AST long-term |
| Evidence gates | Worker | TechnicalProfile builder | DB state | `EvidenceGateResult` | Schema/Quality gates cannot be bypassed |
| AIUsageFlow | Worker | Reconciliation, legal eligibility | DB | `AIUsageFlow`, `AIUsageFlowClaim` | material claims require evidence refs |
| Conflict resolution | Web/API | VerifiedProfile builder | REST + DB | `ConflictRecord`, `ConflictResolution` | Manager resolution separate from scanner evidence |
| VerifiedProfile | Worker/API | Classification | DB | `VerifiedProfile` | classification cannot run before VerifiedProfile |
| Legal citation | Legal/RAG worker | Classification/document shells | DB + Chroma | `LegalRule`, `LegalCitation` | no legal conclusion without citation traceability |
| Document artifact | Document worker | Web export | Object storage ref | `ComplianceDocument`, `GeneratedDocumentFile` | prototype readiness warning required |
| LLM metadata | LLM Gateway | Model providers | Gateway adapter | sanitized structured metadata | no raw source, full prompts, secrets, full AST bodies |
