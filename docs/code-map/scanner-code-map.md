# Scanner Code Map

## Purpose

Define planned Scanner package and worker code ownership before creating files.

## Folder Layout

```text
packages/scanner/src/
  index.ts
  parsers/
    parser-registry.ts
    language-mapper.ts
    tree-sitter-ast-extractor.ts
  semantic/
    typescript-project-factory.ts
    typescript-semantic-analyzer.ts
  graph/
    dependency-graph-builder.ts
    graph-persistence.mapper.ts
    node-key-factory.ts
    edge-key-factory.ts
  detectors/
    detector.interface.ts
    openai.detector.ts
    anthropic.detector.ts
    gemini.detector.ts
    langchain.detector.ts
    vercel-ai.detector.ts
    custom-wrapper.detector.ts
    ai-detector-engine.ts
  evidence/
    evidence-ref-factory.ts
    secret-redactor.ts
  reports/
    technical-evidence-report-builder.ts
    evidence-schema-gate.ts
    evidence-quality-gate.ts
  persistence/
    scanner.repository.ts
  workers/
    scan.worker.ts
```

## Ownership

| Component | Purpose | Dependencies | Owned DTOs | Owned Tables | Owned Queues |
|---|---|---|---|---|---|
| `parsers` | Convert source files into AST-backed facts. | Tree-sitter. | `ParsedFile`, `ImportFact`, `CallFact` | `SourceFile` metadata | None |
| `semantic` | Resolve imports, symbols, calls for supported languages. | ts-morph for TS/JS later stage; Tree-sitter Python syntax-only support. | `SymbolFact`, enriched `CallFact` | normalized semantic metadata | None |
| `graph` | Build dependency/evidence graph. | graphology, parsed/semantic facts. | `CodeGraphNode`, `CodeGraphEdge` | `CodeGraphNode`, `CodeGraphEdge` | None |
| `detectors` | Convert graph/facts into AI technical signals. | parser/graph outputs. | `DetectionResult` | draft `TechnicalFinding` | None |
| `evidence` | Create redacted evidence refs. | source locations, hashes. | `EvidenceRef` | evidence metadata | None |
| `reports` | Build and gate TechnicalEvidenceReport. | findings/evidence. | `TechnicalEvidenceReport` | `TechnicalEvidenceReport`, `TechnicalFinding` | emits through worker |
| `workers` | Consume scan jobs and orchestrate scanner stages. | RabbitMQ, persistence. | `ScanRequestedPayload`, `ScanCompletedPayload`, `ScanFailedPayload` | `RepositoryScanJob`, evidence tables | consumes `command.scan.requested.v1`, emits `event.scan.completed.v1` or `event.scan.failed.v1` |

## Authoritative Split

| Concern | Source |
|---|---|
| Finding taxonomy and signal rules | `docs/specs/scanner-spec.md` |
| Runtime object lifecycle | `docs/developer-execution-blueprints/scanner-data-journey.md` |
| Package/file structure | `docs/implementation/scanner-implementation.md` and this Code Map |


## Controlled MVP Scanner Foundation

`ParserRegistry`, `LanguageMapper` and `TreeSitterAstExtractor` are implemented under `packages/scanner/src/parsers/` using the interfaces in `docs/specs/scanner-spec.md`. They are the parser foundation for the full controlled MVP scanner path. The scanner package uses Node.js/TypeScript, Tree-sitter, `ts-morph`, `graphology` and PostgreSQL metadata persistence. Python worker, NetworkX, and Python semantic import resolution are not active controlled MVP implementation behavior.
