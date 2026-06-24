# 05 — Python Scanner và toolchain

## Vai trò

Python Scanner Worker thu thập bằng chứng kỹ thuật có provenance; scanner không đưa ra kết luận pháp lý hoặc risk level.

## Toolchain mục tiêu

| Tool | Mục đích |
|---|---|
| Syft | SBOM, package và dependency inventory |
| Knip | unused JS/TS dependencies, exports và files khi an toàn |
| deptry | unused, missing và transitive Python dependencies |
| Semgrep custom rules | AI provider/framework/invocation, data, decision, review và risky patterns |
| tree-sitter/custom parser | structural facts, import graph, call graph và ngôn ngữ bổ sung |
| `ast` + `libcst` | first-class bounded Python semantic analysis |
| `ts-morph` | first-class bounded TS/JS semantic analysis qua Node CLI |

## Pipeline mục tiêu

```text
ScanJob lock
-> restricted workspace
-> commit-pinned snapshot
-> file inventory và bounds
-> Syft SBOM/dependencies
-> Knip và deptry dependency usage
-> ast/libcst và ts-morph semantic facts
-> tree-sitter/custom parser augmentation
-> Semgrep custom AI rules
-> import/call/data-flow graph fusion
-> normalized evidence, findings và coverage limitations
-> TechnicalEvidenceReport gates
-> cleanup verification
-> terminal state + AuditEvent + OutboxEvent
```

## Common contracts

Tool output phải được normalize thành các nhóm object như:

- `SBOMComponent`;
- `PackageDependency`;
- `DependencyUsageFact`;
- `ImportGraphNode/Edge`;
- `CallGraphNode/Edge`;
- `EvidenceReference`;
- `TechnicalFinding`;
- `CoverageLimitation`;
- `TechnicalEvidenceReport`.

Dependency status phải phân biệt `declared`, `discovered`, `used/reachable`, `unused`, `missing`, `transitive` và `uncertain`.

## Provenance và guardrails

Mỗi tool result phải ghi tool name/version, config hoặc ruleset hash, repository snapshot, file/package reference, evidence/content hash, confidence và correlation ID.

Các tool:

- chạy trong restricted workspace;
- không cài repository dependencies;
- không chạy customer application code;
- có CPU, memory, timeout, file và output limits;
- validate và redact stdout/stderr;
- không gửi raw source hoặc secret sang external model;
- failure tạo coverage limitation hoặc terminal failure theo severity policy.

Không một tool nào tự đủ để chứng minh active AI use, automated decision hoặc legal classification.

## Python và TS/JS

Python dùng `ast` + `libcst` cho import, function, class, call, model I/O, bounded cross-module path, downstream action và human review. TS/JS dùng `ts-morph` CLI do Python Worker gọi bằng executable/arguments cố định, JSON schema versioned và không qua shell.

## Điều kiện hoàn tất scan

`event.scan.completed.v1` chỉ được tạo khi report đạt quality gate, tool coverage được ghi rõ, ScanJob ở trạng thái hợp lệ và workspace cleanup đã được xác minh.

## Gap hiện tại

Active scanner specs trên `main` mới khóa `ast`/`libcst` và `ts-morph`; chưa định nghĩa Syft, Knip, deptry, Semgrep hoặc tree-sitter/custom parser. Do đó scanner baseline chưa sẵn sàng làm đầu vào UX/story Phase 5.2L.
