# Phase 5.5A Scanner Foundation Canonicalization Report

## Scope

Mode: `SCANNER_FOUNDATION_CANONICALIZATION_ONLY`.

Goal: make the allowed read set sufficient and non-contradictory for implementing only:

- `ParserRegistry`
- `LanguageMapper`
- `TreeSitterAstExtractor`

Allowed read set fixed:

- `docs/README.md`
- `docs/specs/scanner-spec.md`
- `docs/developer-execution-blueprints/scanner-data-journey.md`
- `docs/implementation/scanner-implementation.md`
- `docs/code-map/scanner-code-map.md`

No application code, tests, CI/CD, Docker, infrastructure, PRD, story, backlog, validation document, architecture document, playbook, manual, or new blueprint was created.

## Before / After Issue Table

| Previous Issue | Severity Before | Fix Applied | Status After |
|---|---|---|---|
| `scanner-data-journey.md` used non-canonical route `POST /api/assessments/:assessmentId/scans`. | Critical | Replaced with `POST /api/v1/assessments/:assessmentId/scans`. | Resolved |
| `scanner-data-journey.md` used `scan.requested`, `scan.completed`, and `ScanWorker.complete()`. | Critical | Replaced with canonical exchanges, queue, DLQ, `command.scan.requested.v1`, `event.scan.completed.v1`, `event.scan.failed.v1`, `ScanWorker.handleScanRequested()`, and `ScanWorker.publishScanCompletedEvent()`. | Resolved |
| `ParsedFile` JSON examples used `file.fileId`, `file.filePath`, `importId`, `callId`, and `decisionPointId`. | Critical | Rewrote examples to canonical `sourceFile.sourceFileId`, `sourceFile.relativePath`, `factId`, and `evidenceRef`. | Resolved |
| Old implementation path used `SyntaxNodeDto[]`, `parserRegistry.get(language)`, `extractSyntaxNodes(...)`, and `persistMetadataOnly(nodes)`. | High | Replaced with `SourceFileRef -> LanguageMapper.map -> ParserRegistry.getOrUnsupported -> ParserAdapter.parse -> TreeSitterAstExtractor.extract -> ParsedFile`. | Resolved |
| `LanguageMappingResult` was referenced but undefined. | High | Added `LanguageMappingResult` and `ParserAdapterKey` to scanner spec. | Resolved |
| `EvidenceRefFactory` was referenced but undefined. | High | Added `EvidenceRefFactory` and `EvidenceRef` contracts plus hash/redaction rules. | Resolved |
| Parser adapter responsibility overlapped AST extraction. | High | Split responsibilities: `ParserAdapter` parses only; `TreeSitterAstExtractor` traverses parse tree and creates facts/evidence refs. | Resolved |
| Unsupported language behavior lacked concrete adapter contract. | High | Added `UnsupportedParserAdapter` behavior and file-level evidence ref rule. | Resolved |
| Registry model implied separate grammar registration for TSX/JSX/MJS/CJS. | High | Canonicalized registry to adapter keys: `typescript`, `javascript`, `python`, `unsupported`. | Resolved |
| Generated/minified detection required content data but mapper only accepted `SourceFileRef`. | High | Added `SourceContentSample` and `LanguageMapper.map({ sourceFile, contentSample })`. | Resolved |
| Extraction rules for imports/calls/functions/classes/decision points/prompts/data fields were too vague. | High | Added minimal scanner foundation extraction contract. | Resolved |
| Severity mapping for parse issues was undefined. | Medium | Added canonical severity mapping. | Resolved for first task |
| Prompt redaction and condition summary were underdefined. | Medium | Added deterministic redaction/summary rules. | Resolved for first task |
| Data category hints were underdefined. | Medium | Added minimal deterministic keyword map. | Resolved for first task |
| `syntaxTreeHash` could imply raw source or full AST hashing. | Medium | Made `syntaxTreeHash` optional and limited hash input to normalized structural node kinds and line ranges. | Resolved for first task |
| Python syntax-only behavior conflicted with `python-ast-analyzer.ts`. | High | Removed `python-ast-analyzer.ts` from scanner code map and documented Python syntax-only behavior. | Resolved |
| README reading path could push devs toward unrelated historical docs. | Medium | Added implementation task reading rule and excluded archive/workflow reports as implementation authority. | Resolved |

## Final Adversarial Recheck

Question: Can a senior TypeScript engineer implement `ParserRegistry`, `LanguageMapper`, and `TreeSitterAstExtractor` from the allowed read set without asking another human?

| Category | Count | Result |
|---|---:|---|
| Critical | 0 | No contradiction remains in route names, queue names, `ParsedFile` shape, parser flow, or required class responsibilities. |
| High | 0 | Missing contracts for `LanguageMappingResult`, `EvidenceRefFactory`, `ParserAdapterParseResult`, `UnsupportedParserAdapter`, content sampling, extraction scope, and Python syntax-only behavior are now defined. |
| Medium | 0 blocking | Remaining work is normal package API research for Tree-sitter runtime APIs and future extractor expansion beyond the foundation task. |
| Low | 0 blocking | No low-severity item blocks first implementation. |

## Remaining Non-Blocking Engineering Notes

- The developer still needs to consult package APIs for exact Tree-sitter parser initialization syntax. This is normal library usage research, not an architectural or contract ambiguity.
- Expanded semantic analysis, graph construction, AI detectors, and persistence implementation remain outside this foundation task.

## Explicit Non-Changes

- No source code created.
- No test source created.
- No CI/CD, Docker, infrastructure, or deployment artifact created.
- No new playbook, manual, blueprint, PRD, story, backlog, validation document, or architecture document created.
- No runtime scanner accuracy, production readiness, formal legal reliability, compliance certification, or A2-b2 completion claimed.

## Final Decision

SCANNER_FOUNDATION_CANONICALIZATION_COMPLETED

ALLOWED_READ_SET_CONFLICTS_REMOVED

PARSER_REGISTRY_READY_FOR_BMAD_AGENT_DEV

LANGUAGE_MAPPER_READY_FOR_BMAD_AGENT_DEV

TREE_SITTER_AST_EXTRACTOR_READY_FOR_BMAD_AGENT_DEV

NO_APPLICATION_CODE_CREATED
