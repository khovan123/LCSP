# Evidence Graph Implementation Plan

Tài liệu này trình bày kế hoạch chi tiết để chuyển đổi hệ thống LCSP hiện tại sang kiến trúc **System Evidence Graph** hỗ trợ Monorepo và Multi-repo, dựa trên đặc tả `repository_monorepo_evidence_graph_direction.md`.

*Lưu ý: Phase 1 và Phase 2 (Cải thiện UX kết nối Repository & Scope Setting) đã hoàn thành.*

---

## Phase 3: Thiết kế lại Database & Data Model (Backend)

Hệ thống cần lưu trữ dữ liệu dưới dạng đồ thị (Graph) thay vì bảng phẳng.

**3.1. Schema Graph Storage:**
Dùng PostgreSQL (hoặc Neo4j nếu cần mở rộng) để lưu trữ các Node và Edge:
- Thêm model `GraphNode`: `id`, `type` (Service, Event, DB, Controller), `properties` (JSONB), `snapshotId`.
- Thêm model `GraphEdge`: `id`, `sourceId`, `targetId`, `type` (CALLS, PUBLISHES, CONSUMES, READS, WRITES), `properties` (JSONB), `confidence`.

**3.2. Evidence Model Cải tiến:**
- Cập nhật model `Evidence` hoặc tạo model mới `IntegrationEvidence`.
- Bổ sung `evidenceType` (`STATIC`, `CONTRACT`, `CONFIG`, `DOCUMENTATION`, `RUNTIME`).
- Thêm `commitSha` (quan trọng để xác thực snapshot).
- Thêm `hash` và `canonicalAnchor` (ví dụ: `HTTP:POST:/payments/{id}`).

**3.3. Tách biệt Observed và Declared Graph:**
- `ObservedGraphNode` / `ObservedGraphEdge`: Sinh ra từ Code Scanner & Runtime.
- `DeclaredGraphNode` / `DeclaredGraphEdge`: Sinh ra từ tài liệu thiết kế hệ thống, Assessment Wizard.

---

## Phase 4: Tái cấu trúc Scanner Worker (Data Collection)

Thay đổi cách thức Scanner Worker (Python/TS) hoạt động, chuyển từ việc tìm lỗi (SAST) sang việc khai phá cấu trúc (Structure Discovery).

**4.1. Workspace Discovery & Language Detection:**
- Tự động nhận diện cấu trúc Monorepo (Nx, Lerna, Turbo) hoặc Multi-repo.
- Tách biệt từng **Deployable Unit** (Project/Service) thông qua Dockerfile, k8s manifests, `package.json`.

**4.2. Tree-sitter AST & Static Analysis:**
- Quét và trích xuất các Framework Metadata (NestJS Controllers, Spring Boot REST, Laravel Routes).
- Trích xuất các Message Broker events (RabbitMQ publish/consume, Kafka topics).
- Sử dụng Data Flow và Constant Propagation để resolve các URL/Topics động thay vì chỉ đọc string cứng.

**4.3. Contract & Schema Fingerprinting:**
- Ưu tiên parse OpenAPI, AsyncAPI, Protobuf.
- Hash các schema (`sha256(normalized_schema)`) để so khớp Producer và Consumer.

**4.4. Output: Repo Subgraph:**
- Thay vì trả về một mảng `findings`, Worker sẽ trả về một `Repo Subgraph` (`nodes` và `edges`) đại diện cho nội tại của repository đó.

---

## Phase 5: Cập nhật API Backend & Cross-Project Resolver (Graph Builder)

Backend API cần tiếp nhận Subgraph từ Worker và ghép chúng thành một **System Evidence Graph** hoàn chỉnh.

**5.1. Tiếp nhận & Chuẩn hoá (Evidence Normalizer):**
- Tại `InternalScanController` (hoặc Controller mới `GraphController`), nhận payload Subgraph.
- Chuẩn hoá các endpoint (ví dụ: chuyển `POST /payments/:id` thành `HTTP:POST:/payments/{param}`).

**5.2. Service Identity Resolution (Alias Grouping):**
- Nhận diện `payment-backend` trong Github và `payment-service` trong k8s là cùng một Logical Node.

**5.3. Xây dựng Integration Index:**
- Index lại toàn bộ endpoints của hệ thống.
- Khi Repo A cập nhật, chỉ rebuild `Repo A Subgraph` và cập nhật lại các integration edge liên quan (Incremental Scanning).

---

## Phase 6: Engine Phân tích & Đối chứng (Two-Graph Reconciliation)

Đây là giá trị cốt lõi của hệ thống để phân tích khoảng cách (Gap Analysis) kiến trúc.

**6.1. Thuật toán Matching (3 tầng):**
- **Tầng 1 (Deterministic):** So khớp chính xác qua protocol, method, path, topic, grpc method.
- **Tầng 2 (Structural Matching):** So khớp theo context (Jaccard Similarity, Common Neighbors). Ra kết quả `PROBABLE`.
- **Tầng 3 (LLM Assisted):** Dùng AI để giải thích conflict hoặc map các alias ngữ nghĩa.

**6.2. Các trạng thái Reconciliation:**
- `CONFIRMED`: Trùng khớp giữa Declared (Tài liệu) và Observed (Code).
- `MISSING_IMPLEMENTATION`: Có trong Tài liệu nhưng chưa code.
- `UNDOCUMENTED`: Có code nhưng thiếu trong Tài liệu.
- `CONFLICT`: Sai lệch thông số (Tài liệu nói Kafka, Code dùng RabbitMQ).

---

## Phase 7: Cập nhật Frontend Giao diện Graph & Runtime (Presentation)

**7.1. Cập nhật Technical Evidence Runtime Page:**
- Thay vì chỉ hiển thị logs chạy, tích hợp một thư viện vizualization (như `React Flow`, `Sigma.js` hoặc `Cytoscape.js`).
- Render Graph UI cho phép người dùng xem luồng giao tiếp.

**7.2. Giao diện Gap Analysis:**
- Liệt kê các `MISSING_IMPLEMENTATION`, `UNDOCUMENTED`, `CONFLICT`.
- Cho phép người dùng click vào một node để xem Evidence chi tiết (dòng code, file cấu hình) chứng minh cho node đó.

**7.3. Cải tiến Architecture Graph thành Dashboard Tổng hợp (Single Dashboard):**
- Gộp chung việc setup, khai báo, hiển thị graph và logs vào cùng 1 tab `Architecture Graph`.
- **Top Panel (Setup & Declaration):** Giao diện cho phép chọn nhiều repository từ danh sách repository đã kết nối trong Workspace (Multi-repo Dropdown). Cung cấp một Textarea để người dùng nhập Khai báo kỹ thuật (Technical Declaration / System Context). Thao tác thêm repo tạm thời lưu lại log ở Backend để chờ Phase xử lý logic thực tế.
- **Middle Panel (Visualization):** Component `<GraphVisualization />` hiển thị kiến trúc hệ thống sau khi map data từ API.
- **Bottom Panel (Runtime Logs):** Di chuyển component `<RuntimeConsole />` và danh sách Scan Jobs xuống bên dưới Graph để người dùng có thể xem log quét ngay tại chỗ.

---

## Các bước triển khai tiếp theo (Next Steps for Execution):
1. **Thực thi Phase 3:** Bắt đầu bằng việc sửa đổi `schema.prisma` trong `apps/api/prisma` để hỗ trợ Graph Storage (Nodes, Edges, Subgraphs).
2. **Cập nhật DTOs:** Thêm các contract mới trong `apps/api/src/modules/scan/application/contracts/` để hứng dữ liệu Graph từ Worker.
