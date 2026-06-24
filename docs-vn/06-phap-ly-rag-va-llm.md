# 06 — Pháp lý, RAG và LLM

## Legal corpus

Nguồn pháp lý phải là URL chính thức đã được xác minh. Mỗi lần ingest lưu snapshot bất biến trong S3-compatible storage cùng URL, thời điểm lấy và SHA-256 hash.

Dữ liệu được chuẩn hóa theo văn bản, chương, điều, khoản, điểm và phụ lục. Mọi thay đổi nội dung hoặc hiệu lực tạo phiên bản mới; LegalCorpusVersion đã APPROVED không bị sửa.

Quy trình:

```text
LegalSource VALIDATED
-> ingest snapshot và metadata
-> DRAFT corpus
-> Internal Legal Operator review
-> APPROVED
-> build FTS/vector index
-> READY cho retrieval
```

Corpus approval là kiểm soát nội bộ, không phải chứng nhận pháp lý.

## Hybrid retrieval

Cấu hình MVP:

```text
FTS: PostgreSQL simple + unaccent
Vector: vector(1536)
Similarity: cosine
Index: HNSW, m=16, ef_construction=64
Ranking: 0.4 FTS + 0.6 vector
```

Mỗi truy vấn phải lọc theo corpus version đã pin, trạng thái APPROVED, index READY, nguồn đã xác minh, ngày hiệu lực và metadata phù hợp.

Mỗi kết quả quan trọng phải dựng lại được document ID, số/loại/tiêu đề/cơ quan ban hành, điều/khoản/điểm, source URL, content hash, corpus version, ngày hiệu lực, chunk ID và retrieval scores. Candidate thiếu citation không được dùng cho LegalRuleMatch quan trọng.

Retrieval audit chỉ lưu query hash hoặc structured facets đã làm sạch, filters, result refs, scores và correlation ID; không lưu raw source hoặc nội dung nhạy cảm không cần thiết.

## LLM Gateway

Mọi external model call đi qua LLM Gateway. Bài nghiệm thu A-to-Z dùng provider/model thật; mock chỉ dùng cho test hoặc phát triển offline.

Gateway chịu trách nhiệm cấu hình provider/model, secret reference, timeout, retry, output schema validation, token/cost budget, ModelRunMetadata, output hash và fail-closed behavior.

Không gửi raw repository source, credentials, full customer prompt, full AST hoặc unredacted logs sang LLM/embedding service. Classification và document generation không được tạo kết luận vượt quá evidence và citation đã có.
