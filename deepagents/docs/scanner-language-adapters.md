# Scanner language adapter extension point

The semantic scanner keeps file classification and basic/fallback analysis
in `inventory/language`, while semantic analyzers are exposed through
`analyzers.registry.LanguageAnalyzerRegistry`. The default registry registers
Python, TypeScript/JavaScript, Ruby, and C#. Ruby uses Tree-sitter
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
Dynamic dispatch is retained as limited/unresolved evidence. Cross-language
resolution and additional language adapters remain outside this phase.

C# uses the Tree-sitter C# grammar in the worker's existing Python runtime. It
extracts bounded syntax facts (namespaces, classes, interfaces, records, enums,
methods, attributes, usings, and calls), safe `.csproj` PackageReference and
ProjectReference metadata, and conservative AI-call evidence. It never runs
`dotnet restore`, `dotnet build`, MSBuild, or repository code. Type resolution,
reflection, and runtime configuration remain partial or unresolved.

Tree-sitter was selected over Roslyn for this pilot because it supplies
deterministic syntax/source locations without requiring a .NET runtime,
`dotnet restore`, MSBuild, or repository-controlled build execution. Roslyn
remains a future option if type-aware resolution is required, but would need a
separate runtime and dependency-isolation design.

ASP.NET Core is a separate registered framework adapter. It requires static
web-project evidence (`Microsoft.NET.Sdk.Web` or ASP.NET package references),
then enriches existing C# symbols with controller roles, attribute routes,
minimal API routes, and bounded DI registrations. It does not create
ASP.NET-specific graph nodes, execute the application, or infer dynamic route
targets. Non-web .NET projects remain C# projects without ASP.NET semantics.

## Framework adapter extension point

Framework semantics are a separate, project-scoped layer over language facts.
`frameworks.registry.FrameworkAdapterRegistry` runs registered detectors first,
then invokes an adapter only for a project with evidence for that framework.
`FrameworkAdapter` returns a `FrameworkAnalysisResult` containing the existing
canonical `SemanticProgram`, capabilities, provenance, and explicit
`SUCCESS`/`PARTIAL`/`FAILED`/`UNSUPPORTED` status. A framework adapter must not
create a parallel graph or duplicate language symbols.

The Rails pilot is registered by default. Detection requires a safely parsed
`Gemfile` declaration for the `rails` gem; a `.rb` file or directory name is
not sufficient. The static adapter reuses Ruby symbols, recognizes bounded
controller/model/job roles, and extracts statically resolvable route
declarations without executing Rails or repository Ruby code. Dynamic routes,
metaprogramming, and unsupported framework behavior remain explicit
limitations. A Rails failure preserves the Ruby language result and other
project results.

### Adding a future framework adapter

1. Add evidence-based detection for the framework and keep it separate from
   semantic analysis.
2. Implement the language-neutral `FrameworkAdapter` protocol and declare
   only capabilities that are actually extracted.
3. Reuse canonical language symbol keys and existing node/edge vocabulary;
   report unresolved behavior instead of guessing relationships.
4. Register the adapter deterministically and isolate operational failures
   from language facts and other projects.
5. Add project-scoped, negative-detection, provenance, determinism, and
   failure-isolation tests before documenting capability levels.
