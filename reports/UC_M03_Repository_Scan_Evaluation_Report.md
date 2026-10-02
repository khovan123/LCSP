# BÁO CÁO ĐÁNH GIÁ TÀI LIỆU USE CASE & THỰC THI HỆ THỐNG
## Module: M03 — REPOSITORY SCAN & TECHNICAL EVIDENCE
*(Đối chiếu trực tiếp giữa Tài liệu UC M03, Module M02 Assessment Setup và Hiện trạng Codebase)*

**Hệ thống:** LCSP (Legal Compliance Software Platform)  
**Tài liệu đánh giá:** [Business Use Case Specification · M03](https://docs.google.com/document/d/1lRlXre0lzsCljufEHTvIZoRFeJG8JJ-LbIxqZHuiDlc/edit?tab=t.0)  
**Ngày đánh giá & Cập nhật:** 02/10/2026  
**Trạng thái Code:** **ĐÃ SỬA VÀ KIỂM THỬ HOÀN TẤT (VERIFIED)**

---

## 1. TỔNG QUAN ĐÁNH GIÁ

Tài liệu đặc tả Use Case **M03 — REPOSITORY SCAN & TECHNICAL EVIDENCE** đã định hướng đúng các nguyên tắc nghiệp vụ cốt lõi:
- Kích hoạt lần quét đầu tiên tự động sau khi hoàn tất thiết lập tại **M02 (Assessment Setup & Repository Connection)**.
- Quản lý và theo dõi tiến trình quét dựa trên trạng thái/checkpoint thực tế (không dùng % giả lập).
- Bảo toàn tính toàn vẹn và khả năng truy vết của Technical Evidence theo từng Repository, Branch, Commit và lần quét.

Tuy nhiên, qua quá trình kiểm tra chéo (cross-audit) giữa **Tài liệu UC M03** và **Hiện trạng mã nguồn thực tế (Codebase NestJS API, Next.js Web, Contracts, Prisma Layer)**, phát hiện nhiều điểm mâu thuẫn nghiêm trọng giữa đặc tả nghiệp vụ và code thực thi (CODE-01 đến CODE-06), cùng các khoảng trống trong tài liệu UC.

Toàn bộ các lỗi mã nguồn (CODE-01 đến CODE-06) đã được khắc phục triệt để và kiểm thử hồi quy thành công.

---

## 2. CHI TIẾT CÁC VẤN ĐỀ XUNG ĐỘT CODEBASE & TÀI LIỆU (ROOT CAUSE & FIX)

### 🔴 CODE-01 — P0: Rerun đang xóa lịch sử mà UC yêu cầu giữ lại

#### 1. Root cause (Nguyên nhân)
- **Vị trí:** [`apps/api/src/modules/scan/application/commands/rerun-scan/rerun-scan.handler.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/scan/application/commands/rerun-scan/rerun-scan.handler.ts#L316-L500)
- **Cơ chế lỗi:** Handler gọi hàm `replaceSameSnapshotScanArtifacts()` trước khi tạo scan job mới. Hàm này không chỉ dọn dẹp dữ liệu tạm mà thực hiện `deleteMany` (dòng 427–499) xóa sạch toàn bộ các bản ghi của những lần scan trước trên cùng snapshot (gồm: Evidence Reports, Technical Profiles, kết quả downstream, Runtime Events và Scan Jobs). Thậm chí một nhánh còn xóa cả `readinessExport` của Assessment.
- **Bằng chứng test:** File [`rerun-scan.handler.spec.ts:400–434`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/scan/application/commands/rerun-scan/rerun-scan.handler.spec.ts#L400-L434) trước đây viết test khẳng định hành vi xóa này: *"deletes prior scan and evidence artifacts for the same snapshot before rerun"*.
- **Mâu thuẫn:** Tài liệu UC M03 (tại **Luồng thay thế A4** và **Quy tắc nghiệp vụ BR-62**) quy định rõ: *"Lần quét mới dùng phiên bản source code tương ứng và không ghi đè lịch sử của lần quét trước"* & *"Evidence và lịch sử của lần quét trước vẫn được giữ để truy vết"*.

#### 2. Fix (Đã xử lý)
- Đã loại bỏ lời gọi xóa cứng `replaceSameSnapshotScanArtifacts()` trong `rerun-scan.handler.ts`.
- Khi Rerun, hệ thống tạo `scanJob` mới với trạng thái `QUEUED`, liên kết `replacesScanJobId` tới job trước đó, và bảo toàn toàn bộ `scanJob` cũng như `technicalEvidenceReport` cũ trong CSDL.
- Cập nhật unit test `rerun-scan.handler.spec.ts` sang: *"preserves prior scan and evidence artifacts for the same snapshot upon rerun"*, xác nhận `technicalEvidenceReport.deleteMany` và `repositoryScanJob.deleteMany` không bao giờ bị gọi.

---

### 🔴 CODE-02 — P0: Kiểm tra quyền truy cập chưa đồng nhất giữa các API

#### 1. Root cause (Nguyên nhân)
Tồn tại sự thiếu nhất quán trong việc kiểm tra phân quyền sở hữu Assessment (PBAC / Ownership check) trên các endpoint:
- **`GET .../evidence`** ([`evidence.controller.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/evidence/presentation/http/evidence.controller.ts)): Controller chỉ truyền `assessmentId` và `role` vào query, không truyền danh tính người dùng (`userId`) để verify ownership. 
- **`GET .../scan-jobs/:scanJobId`** ([`scan.controller.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/scan/presentation/http/scan.controller.ts), [`get-scan-job.handler.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/scan/application/queries/get-scan-job/get-scan-job.handler.ts)): Query handler trước đây dùng điều kiện `if (query.subjectRole !== AUTH_USER_ROLES.admin && query.userId)`: nếu caller non-admin không truyền `userId`, bước kiểm tra ownership bị bỏ qua thay vì từ chối yêu cầu.
- **Replay Idempotency của Rerun** ([`rerun-scan.handler.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/scan/application/commands/rerun-scan/rerun-scan.handler.ts)): Nhánh trả về scan job đã có chạy trước bước kiểm tra ownership. Nhánh xử lý race condition cũng trả về job tìm được mà chưa kiểm tra lại phạm vi dữ liệu yêu cầu.

#### 2. Fix (Đã xử lý)
- **`evidence.controller.ts`:** Bổ sung bước kiểm tra ownership trong `getEvidence`: nếu caller là Customer và không sở hữu Assessment (`ownerId !== context.userId`), trả về HTTP 404 `ASSESSMENT_ERROR_CODES.notFound`.
- **`get-scan-job.handler.ts` & `scan.controller.ts`:** Bắt buộc danh tính người dùng đối với non-admin: nếu `query.subjectRole !== AUTH_USER_ROLES.admin`, thiếu `query.userId` hoặc `assessment.ownerId !== query.userId` sẽ lập tức ném lỗi 404 `notFound`, không bao giờ bỏ qua bước kiểm tra ownership. Bổ sung test case xác nhận non-admin thiếu `userId` bị từ chối 404 và admin được phép truy cập.
- **`rerun-scan.handler.ts`:** Đảo thứ tự xử lý: thực hiện xác thực Snapshot và kiểm tra quyền sở hữu Assessment (`isManagerOwner`) **trước** khi kiểm tra và replay idempotency key. Trong nhánh bắt lỗi race condition, bổ sung kiểm tra bắt buộc `raced.assessmentId === command.assessmentId && raced.snapshotId === command.snapshotId`.

---

### 🟡 CODE-03 — P1: Trạng thái Scanner đang bị suy diễn không chính xác

#### 1. Root cause (Nguyên nhân)
- **Frontend Runtime:** Trong [`assessment-flow-runtime.ts`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/web/src/features/assessment-flow/utils/assessment-flow-runtime.ts): Bất kỳ scan job nào chưa `COMPLETED` hoặc `FAILED` đều bị gán `TOOL_ACTIVITY_STATUSES.running`, kể cả khi job đang ở trạng thái chờ (`QUEUED`). Ngoài ra, activity `buildGraph` trước đây tự động hoàn tất chỉ từ `scanCompleted || evidenceAccepted || evidenceRejected` mà chưa có căn cứ độc lập xác nhận graph thực sự sẵn sàng.
- **Frontend UI:** Trong [`scanner-step.tsx`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/web/src/features/assessment-flow/components/organisms/scanner-step.tsx): Logic hiển thị chỉ phân nhánh theo `scanFailed` và `evidenceReady`. Khi job ở trạng thái `QUEUED`, giao diện vẫn rơi vào nhánh fallback hiển thị thông điệp "Tôi đang quét source...", gây mâu thuẫn trực tiếp với trạng thái pending của activity quét source.
- **Dữ liệu mẫu i18n:** Trong `vi/pages.ts:1589` và `en/pages.ts:1586`, trường `completeThinking` bị hardcode cố định "Đã suy nghĩ trong 18 giây" / "Thought for 18s" dù hệ thống không có dữ liệu đo lường thời lượng này.
- **Evidence Page:** Trong [`technical-evidence-runtime-page.tsx`](file:///Users/nguyenanh/Documents/Capstone/LCSP/apps/web/src/features/evidence/components/organisms/technical-evidence-runtime-page.tsx): Trạng thái `BLOCKED_MAPPING` chưa được mapping mà bị rơi về nhãn mặc định `pending`.

#### 2. Fix (Đã xử lý)
- Trong `assessment-flow-runtime.ts`:
  - Cập nhật logic để activity `SCAN_SOURCE_CODE` chỉ chuyển sang `running` khi `scanJob.status === REPOSITORY_SCAN_JOB_STATUSES.running`. Khi job ở trạng thái `QUEUED`, activity giữ nguyên `pending`.
  - Hỗ trợ tham số `evidenceGraphReady?: boolean`: khi truyền vào, `buildGraph` chỉ đánh dấu `completed` khi graph thực sự sẵn sàng; nếu scan hoàn tất nhưng graph đang build thì chuyển sang trạng thái `running`.
- Trong `scanner-step.tsx`:
  - Bổ sung prop `isQueued?: boolean` (truyền từ `assessment-overview.tsx` khi `scanJob.status === REPOSITORY_SCAN_JOB_STATUSES.queued`).
  - Đồng bộ thông báo: khi `isQueued = true`, hiển thị thinking `queuedThinking` ("Đang chờ xử lý...") và mô tả `queuedDescription` ("Yêu cầu quét đang nằm trong hàng đợi. Đang chờ bắt đầu quét repository...") thay vì nói đang quét.
- Trong `packages/i18n`:
  - Thay thế số liệu mẫu hardcode "18 giây" thành "Đã hoàn tất suy nghĩ" (VI) và "Thought completed" (EN).
- Trong `technical-evidence-runtime-page.tsx`: Map `BLOCKED_MAPPING` cùng với `BLOCKED` về nhãn chuẩn `pages.technicalEvidence.scanStatuses.blocked`.

---

### 🟡 CODE-04 — P1: Rerun chưa bảo đảm Concurrency & Retry Idempotency

#### 1. Root cause (Nguyên nhân)
- **Client Idempotency:** Trong `assessment-overview.tsx` (dòng 199) và `technical-evidence-runtime-page.tsx` (dòng 523), caller chỉ truyền `{ snapshotId }`, không truyền `idempotencyKey`. Do đó mỗi lần bấm retry khi gặp sự cố mạng/mất phản hồi, client tự động sinh một UUID mới tại `repository-analysis-client.ts`, làm mất tác dụng của cơ chế idempotency replay trên server.
- **Server Race Protection & Concurrency:** Trong `rerun-scan.handler.ts`, chuỗi kiểm tra active scan (`tx.repositoryScanJob.findFirst`) và tạo job mới (`tx.repositoryScanJob.create`) chưa có cơ chế khóa mức CSDL trên Assessment. Hai yêu cầu rerun đồng thời với hai idempotency key khác nhau có thể cùng vượt qua kiểm tra và tạo 2 active scan job song song trên cùng một Assessment.

#### 2. Fix (Đã xử lý)
- **Phía Client (UI):**
  - Cả `assessment-overview.tsx` và `technical-evidence-runtime-page.tsx` bổ sung quản lý `retryKeyRef` / `rerunKeyRef` (`useRef<string | null>`).
  - Khi bắt đầu yêu cầu retry/rerun, nếu chưa có key thì sinh `crypto.randomUUID()`. Nếu yêu cầu thất bại (lỗi mạng, ngắt kết nối), key được giữ nguyên để lần retry tiếp theo gửi đúng key đó.
  - Khi yêu cầu thành công (`onSuccess`), key được xóa (`null`) để lần rerun chủ động tiếp theo của Customer được cấp key mới.
- **Phía Server (API Concurrency Lock):**
  - Trong transaction của `rerun-scan.handler.ts`, bổ sung khóa hàng bi quan (pessimistic row lock):
    ```ts
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Assessment" WHERE "id" = ${command.assessmentId} FOR UPDATE`,
    );
    ```
  - Khóa này tuần tự hóa mọi yêu cầu rerun trên cùng một Assessment, triệt tiêu race condition giữa 2 request khác key.
  - Bổ sung unit test concurrency trong `rerun-scan.handler.spec.ts` chứng minh request đồng thời thứ hai bị chặn với HTTP 409 Conflict (`SCAN_ERROR_CODES.jobWrongState`).

---

### 🟡 CODE-05 — P1: Chưa nhất quán giữa Evidence hiện tại và Evidence lịch sử

#### 1. Root cause (Nguyên nhân)
- **Thiếu kết nối bộ lọc xuyên suốt Frontend ➔ BFF ➔ API:**
  - API đã hỗ trợ `snapshotId` và `scanJobId`, nhưng hai BFF route (`evidence-graph/route.ts` và `overview/route.ts`) không chuyển tiếp query string lên upstream.
  - `evidence-graph-detail-client.ts` và `evidence-graph-overview-client.ts` chỉ nhận `assessmentId`, bỏ qua ngữ cảnh snapshot/job.
  - Overview client trước đó chỉ bóc tách 4 metrics cơ bản, bỏ mất `report_id`, `snapshot_id`, `scan_job_id` trả về từ API.
  - TanStack Query key cho Graph Overview và Detail chỉ phân biệt theo `assessmentId`, gây cache lẫn lộn giữa các lần chạy khác nhau.
- **Quy tắc `index === 0` sai lệch trong việc xác định "Current":**
  - Trong `technical-evidence-runtime-page.tsx`, code dùng `index === 0 ? "Current" : "Historical"` độc lập cho cả danh sách job và danh sách report.
  - Khi Customer rerun tạo Job B (đang chạy, chưa có Report B), Job B đứng đầu danh sách job (Current), trong khi Report A của Job A cũ đứng đầu danh sách report cũng bị gắn nhãn Current.
  - Ngoài ra, hai nhãn "Current" và "Historical" bị hardcode chuỗi trong TSX thay vì sử dụng `@lcsp/i18n`.

#### 2. Fix (Đã xử lý)
- **Nối bộ lọc xuyên suốt Frontend ➔ BFF ➔ API:**
  - Cập nhật hai BFF route (`evidence-graph/route.ts` và `evidence-graph/overview/route.ts`): Sử dụng `upstreamUrl` và chuyển tiếp đầy đủ `snapshotId`, `scanJobId` lên backend API.
  - Cập nhật `evidence-graph-detail-client.ts` và `evidence-graph-overview-client.ts`: Nhận `filters?: EvidenceGraphFilters`, truyền params lên BFF và lưu giữ `report_id`, `snapshot_id`, `scan_job_id`.
  - Cập nhật `query-keys.ts` và `assessment-queries.ts`: Bổ sung `filters?.snapshotId` và `filters?.scanJobId` vào query key để phân tách cache theo từng lần chạy.
  - Cập nhật `assessment-overview.tsx`: Truyền chính xác `{ snapshotId: snapshot.id, scanJobId: scanJob?.id }` vào `useProgramEvidenceGraphOverviewQuery`.
- **Xác định Current bằng liên kết thực tế với scan job:**
  - Trong `technical-evidence-runtime-page.tsx`:
    - Scan job: `scanJob.id === latestScan?.id ? currentBadge : historicalBadge`.
    - Evidence report: `Boolean(latestScan?.id && report.scanJobId === latestScan.id) ? currentBadge : historicalBadge`.
    - Khi Job B mới được tạo và chưa có report, toàn bộ report cũ (như Report A) hiển thị chính xác là `Historical`.
  - Bổ sung `currentBadge` ("Hiện tại" / "Current") và `historicalBadge` ("Lịch sử" / "Historical") vào `@lcsp/i18n` và thay thế toàn bộ chuỗi hardcode.

---

### 🟡 CODE-06 — P1: Màn hình Scanner cần thể hiện trạng thái mất kết nối cập nhật

#### 1. Root cause (Nguyên nhân)
- SSE Provider (`workspace-runtime-provider.tsx`) có sẵn thông tin `connectionState`, nhưng màn hình chính `ScannerStep` chưa tiếp nhận thông tin này để cảnh báo khi luồng stream sự kiện realtime bị đứt đoạn.

#### 2. Fix (Đã xử lý)
- Bổ sung prop `isReconnecting?: boolean` cho `ScannerStep`.
- Truyền `isReconnecting={workspaceRuntime.connectionState === WORKSPACE_RUNTIME_CONNECTION_STATES.disconnected}` từ `assessment-overview.tsx`.
- Thêm i18n keys đa ngôn ngữ (`reconnecting`) cho tiếng Việt và tiếng Anh.
- Khi mất kết nối, hiển thị indicator cảnh báo tinh tế: *"Đang kết nối lại luồng cập nhật trực tiếp..."* mà không làm mất dữ liệu hiện tại và không làm gián đoạn trải nghiệm của người dùng.

---

## 3. CÁC ĐIỂM CẦN CẢI THIỆN TRONG TÀI LIỆU USE CASE (M03 SPEC)

| STT | Khoảng trống trong tài liệu UC | Hướng điều chỉnh trong Tài liệu |
| :--- | :--- | :--- |
| **1** | **Khớp nối Hand-off M02 ➔ M03:** Chưa làm rõ trường hợp mở lại Assessment bị dở dang (chưa có Snapshot/Job). | Quy định rõ: Nếu `needsRepositorySetupResume = true`, hệ thống mở lại giao diện Setup của M02. Chỉ kích hoạt UC-M03 khi đã có đủ `connectionId`, `snapshotId` và `scanJobId`. |
| **2** | **Chuẩn hóa 5 Scanner Activities:** Tài liệu mô tả chung chung các hoạt động. | Cập nhật bảng Normal Flow trong UC-M03-01 với 5 stage chuẩn: `CONNECT_REPOSITORY` ➔ `CLONE_SOURCE_ARCHIVE` ➔ `SCAN_SOURCE_CODE` ➔ `BUILD_PROGRAM_EVIDENCE_GRAPH` ➔ `COLLECT_EVIDENCE`. |
| **3** | **Tiêu chí Gate chuyển sang Interview:** Ghi chung chung "đáp ứng điều kiện sử dụng". | Định nghĩa rõ điều kiện Gate: Phải thỏa mãn đồng thời: `scanJob.status = COMPLETED` VÀ `evidenceReport.status = ACCEPTED` khớp với scan job hiện tại. |
| **4** | **Mã lỗi giả định `[MSG-xxx]`:** Dùng `[MSG-030]` đến `[MSG-038]`. | Thay thế toàn bộ bằng mã lỗi `SCREAMING_SNAKE_CASE` trong `packages/contracts/src/scan/codes.ts` và ánh xạ i18n keys tương ứng. |
| **5** | **Đặc tả Concurrency & Idempotency Key:** Chưa nêu rõ vòng đời key. | Bổ sung quy định: Lần quét đầu và mỗi lần rerun mới do Customer chủ động khởi tạo một `idempotencyKey` mới; các lần retry tự động hoặc thủ công do lỗi mất phản hồi mạng phải tái sử dụng cùng một `idempotencyKey`. |
| **6** | **Quy tắc gắn nhãn Current / Historical:** Chưa quy định logic phân định khi có rerun. | Quy định rõ: Bản ghi Report chỉ được coi là "Current" khi khớp trực tiếp với `scanJobId` của phiên quét hiện hành. Khi một phiên quét mới đang chạy mà chưa ra báo cáo, các báo cáo cũ phải chuyển thành "Historical". |

---

## 4. KẾT QUẢ THỰC HIỆN & BẰNG CHỨNG KIỂM THỬ (VERIFICATION)

| Hạng mục | Trạng thái Code | Bằng chứng Kiểm thử (Test Suites) |
| :--- | :---: | :--- |
| **CODE-01** (Giữ lịch sử Rerun) | ✅ Hoàn thành | `rerun-scan.handler.spec.ts` (12/12 passed, xác nhận bảo toàn artifact) |
| **CODE-02** (Phân quyền PBAC & Idempotency) | ✅ Hoàn thành | `get-scan-job.handler.spec.ts` (11/11 passed, test missing userId 404, non-owner 404, admin bypass), `evidence-runtime.controller.spec.ts` (21/21 passed) |
| **CODE-03** (Scanner QUEUED/RUNNING/Lỗi, i18n & Graph Ready) | ✅ Hoàn thành | `assessment-repository-flow.test.ts` (12/12 passed), xóa 18s i18n, `@lcsp/i18n` build passed |
| **CODE-04** (Idempotency Key reuse UI & Concurrency Row Lock) | ✅ Hoàn thành | `rerun-scan.handler.spec.ts` (test concurrency 409 conflict passed), `assessment-repository-flow.test.ts` (idempotency key passed) |
| **CODE-05** (Lọc Graph Snapshot xuyên suốt & Badge Current/Historical) | ✅ Hoàn thành | `program-evidence*.test.ts` (34/34 passed), BFF routes, clients, và query keys updated |
| **CODE-06** (Cảnh báo kết nối Reconnecting) | ✅ Hoàn thành | `scanner-step.tsx`, `assessment-overview.tsx`, i18n build passed |
| **Toàn bộ Web Tests (Repository/Evidence Flow)** | ✅ Hoàn thành | `assessment-repository-flow.test.ts` (12/12 passed), `program-evidence*.test.ts` (34/34 passed), `readiness-repository-component.test.ts` (12/12 passed), `repository-scan-state.test.ts` (1/1 passed) |
| **Toàn bộ Unit Tests Scan & Evidence API** | ✅ Hoàn thành | `src/modules/scan` (60/60 passed across 7 suites), `src/modules/evidence` (98/98 passed across 13 suites) |
| **Typecheck TypeScript** | ✅ Hoàn thành | `pnpm --filter @lcsp/web exec tsc --noEmit` (0 errors), `pnpm --filter @lcsp/api exec tsc --noEmit` (0 errors) |
