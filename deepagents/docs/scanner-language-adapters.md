# Scanner language adapter extension point

The semantic scanner keeps file classification and basic/fallback analysis
in `inventory/language`, while semantic analyzers are exposed through
`analyzers.registry.LanguageAnalyzerRegistry`. The default registry contains
only the existing Python and TypeScript/JavaScript adapters.

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

Project discovery, framework adapters, cross-language resolution and new
language support are intentionally outside this phase.
