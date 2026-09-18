# Scanner language adapter extension point

The semantic scanner keeps file classification and basic/fallback analysis
in `inventory/language`, while semantic analyzers are exposed through
`analyzers.registry.LanguageAnalyzerRegistry`. The default registry registers
Python, TypeScript/JavaScript, and the Ruby pilot adapter. Ruby uses Tree-sitter
Ruby for non-executing syntax analysis.

Each adapter implements the `LanguageAnalyzer` protocol and returns a
`CanonicalAnalyzerResult`. The result is an execution envelope around the
existing native analyzer output; it reports `SUCCESS`, `PARTIAL`, `FAILED`,
or `UNSUPPORTED`, explicit `AnalyzerCapability` flags, skipped files and
coverage/dynamic-flow limitations. Native results remain available so the
existing evidence and graph contracts are unchanged.

Adapter registration is deterministic (the registry sorts by adapter
language and rejects duplicates). Adapters must preserve the existing
semantic fact identity/key contract: keys are deterministic, include enough
path/project/language context to avoid collisions, and must not contain
timestamps or temporary paths. ProgramGraphBuilder remains responsible for
canonical graph IDs and deduplication.

## Adding a future language adapter

1. Implement `LanguageAnalyzer` for the language's existing parser/tool.
2. Translate native output into `CanonicalAnalyzerResult` without creating a
   parallel graph model or recalculating evidence downstream.
3. Declare only capabilities the analyzer actually provides and report
   unsupported/partial files explicitly.
4. Register the adapter in the default registry after focused contract,
   determinism, and compatibility tests are in place.

Ruby supports modules, classes, instance/singleton methods, static requires,
Gemfile declarations, visible calls, and conservative provider-call evidence.
Dynamic dispatch is retained as limited/unresolved evidence. Rails semantics,
cross-language resolution, and additional language adapters remain outside
this phase.
