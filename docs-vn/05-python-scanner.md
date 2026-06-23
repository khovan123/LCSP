# 05 — Python Scanner

## Vai trò

Scanner thu thập bằng chứng kỹ thuật có thể truy vết; scanner không đưa ra kết luận pháp lý hoặc risk level.

Python Worker là chủ sở hữu duy nhất của Repository Scan lifecycle và consumer duy nhất của:

```text
command.scan.requested.v1
```

## Công nghệ đã khóa

- Python 3.11+.
- Poetry và `pyproject.toml`.
- stdlib `ast` + `libcst` cho Python.
- Python-native scan-local graph.
- Node.js `ts-morph` CLI subprocess cho TypeScript/JavaScript.
- PostgreSQL metadata-only persistence.
- Ephemeral restricted workspace và cleanup verification.

`astroid` và HTTP analyzer service không phải dependency bắt buộc của MVP.

## Pipeline

```text
lock ScanJob
-> tạo workspace
-> materialize commit snapshot
-> inventory và giới hạn file
-> Python AST/CST analysis
-> TS/JS subprocess analysis
-> normalized facts và graph
-> EvidenceReference + TechnicalFinding
-> TechnicalEvidenceReport
-> schema/privacy/quality gates
-> xóa và xác minh workspace
-> terminal state + AuditEvent + OutboxEvent
```

## Khả năng Python

Scanner hỗ trợ có giới hạn nhưng là first-class:

- package, module, import và alias;
- function, class, method, decorator, async call;
- FastAPI, Flask, Django, Celery, Pydantic khi ruleset nhận diện;
- OpenAI, Gemini, Anthropic, Hugging Face, LangChain, LlamaIndex và các pattern ML phổ biến;
- input/output của model;
- branch, threshold, ranking, recommendation, approve/reject, status update;
- human-review step;
- luồng trong function, module và bounded cross-module.

Dynamic import, reflection, runtime-only config, external service boundary hoặc queue break phải tạo uncertainty/coverage limitation; không được đoán.

## Phân tích TS/JS

Python Worker gọi executable cố định bằng `asyncio.create_subprocess_exec`, không qua shell. Request/response dùng versioned JSON schema. stdout được giới hạn và validate; stderr được làm sạch. Subprocess không được cài dependency của repository, chạy customer code, truy cập RabbitMQ hoặc tự ghi scanner tables.

Lỗi subprocess tạo `TS_JS_ANALYZER_FAILED` và coverage limitation cho file liên quan.

## Bằng chứng và finding

Finding chuẩn bao gồm type, path, symbol, line range, evidence refs, evidence hash, confidence, version và metadata đã làm sạch.

Một số finding quan trọng:

- `AI_PROVIDER_USAGE`;
- `AI_FRAMEWORK_USAGE`;
- `AI_MODEL_INVOCATION`;
- `AI_INPUT_SIGNAL`;
- `AI_OUTPUT_SIGNAL`;
- `AI_DECISION_FLOW_SIGNAL`;
- `AUTOMATED_DECISION_SIGNAL`;
- `HUMAN_REVIEW_SIGNAL`;
- `SENSITIVE_DATA_SIGNAL`;
- `DOMAIN_CONTEXT_SIGNAL`;
- `SCAN_COVERAGE_LIMITATION`;
- `UNSUPPORTED_DYNAMIC_FLOW`.

Chỉ import package không đủ để xác nhận model invocation.

## Bảo mật workspace

- Chỉ checkout commit đã chọn.
- Không chạy build, test, Docker, CI, script hoặc source code của khách hàng.
- Có giới hạn số file, kích thước, độ sâu và timeout.
- Hạn chế network sau khi lấy snapshot.
- Không lưu raw source, full AST, secret hoặc full prompt.
- Cleanup phải chạy ở cả success và terminal failure.
- Cleanup thất bại tạo `SCANNER_WORKSPACE_CLEANUP_FAILED` và chặn downstream.

## Điều kiện hoàn tất

`event.scan.completed.v1` chỉ được tạo khi:

1. report đạt `QUALITY_VALID`;
2. ScanJob chuyển `COMPLETED`;
3. workspace cleanup đã được xác minh;
4. AuditEvent và OutboxEvent được ghi trong transaction terminal.
