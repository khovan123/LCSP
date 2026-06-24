# 12 — Review trước UX cho Phase 5.2L

## Phạm vi review

- Repository: `khovan123/LCSP`.
- Base `main`: `73f47560a075fe7991ba2611a87f52abbe2e0496`.
- Branch review trước khi cập nhật tệp này: `docs/add-vietnamese-condensed-guide` tại `aa641ef1489a5659721dd166d9d18deb7074089d`.
- Review toàn bộ inventory thay đổi của PR #2 và các active source-of-truth liên quan.
- Loại trừ `docs/archive/` khỏi authority review.

## Kết luận

```text
NOT_READY_FOR_CANONICAL_UX
PHASE_5_2L_REMEDIATION_SUBSTANTIAL_BUT_NOT_CLOSED
PROJECT_OWNER_APPROVAL_PENDING
ACTIVE_DOCUMENT_CONTRADICTIONS_REMAIN
```

PR #2 đã propagate phần lớn target Phase 5.2L, nhưng chưa đạt cross-document closure. Không nên tạo canonical UX từ baseline này vì UX có thể kế thừa attestation, traceability và authority marker không nhất quán.

## Những phần đã đồng bộ tốt

- PBAC đã thay RBAC trong NFR, architecture, event/queue và phần lớn implementation/code maps.
- `FR-050` đã được định nghĩa lại thành Automatic Trusted Scan Initiation.
- `FR-051` đã được đánh dấu `REMOVED_FROM_PRODUCT`.
- Python Worker Platform đã được đặt làm owner của các asynchronous domain workloads.
- Scanner specs đã bổ sung Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast`/`libcst` và `ts-morph`.
- Trigger mapping states, domain objects, commands/events và negative paths đã được đưa vào nhiều tài liệu.
- Readiness report đã ghi đúng kết quả `NOT READY` vì thiếu UX, epics/stories và technical decisions.

## Blocker P0 trước UX

### P0-1 — Chưa có Project Owner approval

Sprint Change Proposal đã tồn tại nhưng approval section còn `[yes/no]` và chưa có approver/date/conditions. Trong khi đó nhiều tài liệu khác đã tuyên bố `PHASE_5_2L_ACTIVE_DOCS_SYNCHRONIZED` và `CANONICAL_UX_AUTHORIZED`.

Yêu cầu đóng:

- Project Owner approve/revise proposal;
- ghi commit/ref và điều kiện approval;
- chỉ sau đó mới gắn closure marker.

### P0-2 — Validation Plan vẫn giữ structured attestation active

`docs/product/validation-plan.md` vẫn định nghĩa A3 là Human Attestation Abuse Risk, gồm schema, allowed claims, forbidden claims, Manager review, report disclosure và acceptance threshold. Nội dung này trái với quyết định loại structured attestation khỏi MVP.

Yêu cầu đóng:

- thay A3 bằng PBAC/trusted-trigger abuse validation;
- xóa active attestation schema, claim matrix và disclosure requirements;
- cập nhật source paths và validation dependencies.

### P0-3 — PRD và Business Rules còn nội dung cũ

PRD có marker supersession nhưng vẫn lặp block hậu quả attestation cũ. Business Rules vẫn giữ Human Attestation category, A3 dependencies và nhiều rule statement mang semantics role-based cũ.

Yêu cầu đóng:

- chỉ giữ attestation dưới historical/superseded register, không giữ active consequences;
- đổi rule semantics từ role authority sang PBAC subject/policy semantics;
- sửa các dependency A3 và đường dẫn tài liệu lỗi/thừa.

### P0-4 — UC/AC/traceability chưa sạch

- `UC-015` vẫn gom `FR-042..FR-045` dù `FR-045` đã superseded.
- `AC-020` vẫn chứa `FR-045`.
- `AC-025/AC-026` hoặc các trace cũ vẫn có thể tham chiếu `UC-018`.
- Matrix/summary tuyên bố no-orphan và synchronized dù historical references còn nằm trong active rows.

Yêu cầu đóng:

- tách historical AC/FR khỏi active rows;
- rebuild active UC/FR/AC/NFR counts và crosswalk;
- chỉ gắn `NO_ORPHAN_*` sau validation thực tế.

### P0-5 — Readiness và authority markers mâu thuẫn

`docs/README.md`, `implementation-readiness-certification.md` và traceability summary tuyên bố active docs synchronized/UX authorized, trong khi readiness report mới là `NOT READY` và proposal chưa được phê duyệt.

Yêu cầu đóng:

- dùng marker `DOCUMENT_REMEDIATION_PENDING_CLOSURE` trước approval;
- chỉ dùng `READY_FOR_CANONICAL_UX` sau closure pass;
- không dùng implementation readiness như UX approval nếu artifact tự ghi `NOT READY`.

## P1 cần carry forward trước stories/readiness

### ADR và technical decisions

Proposal yêu cầu dedicated ADRs cho PBAC, Automatic Trusted Scan Initiation, Python Worker Platform và expanded scanner toolchain, nhưng PR hiện chủ yếu sửa ADR index/ADR-022/ADR-023.

Các decision sau có thể chưa cần chọn implementation cụ thể để bắt đầu UX, nhưng phải được ghi là constraint/dependency rõ:

- PBAC engine, storage, cache, invalidation, topology và failure behavior;
- trigger idempotency key, retry/DLQ, replay authority và recovery;
- scanner tool failure severity và version/config/ruleset policy;
- Python Worker Platform package/process/deployment boundary.

### Residual implementation wording

Backend, delivery plan và ADR relationship tables còn một số wording như role/grants, Developer Post-MVP hoặc downstream workers retained. Cần sửa trước khi tạo stories và chạy readiness lại.

## Checklist closure

```text
[ ] Project Owner approval record completed
[ ] validation-plan A3 remediated
[ ] PRD attestation duplicate consequences removed
[ ] business-rules active semantics converted to PBAC
[ ] active UC/FR/AC/NFR crosswalk rebuilt
[ ] historical UC-018/FR-045/FR-046/AC-013 separated from active coverage
[ ] docs/README and readiness markers corrected
[ ] dedicated ADRs added or explicit pre-story decision records created
[ ] backend/delivery/ADR residual wording closed
[ ] repository-wide active-doc search returns no unclassified residue
[ ] closure report states READY_FOR_CANONICAL_UX
```

## Trình tự hợp lệ

```text
1. Project Owner approves or revises Phase 5.2L proposal.
2. Run a short documentation closure pass for the P0 findings.
3. Revalidate all active non-archive documents and traceability.
4. Set READY_FOR_CANONICAL_UX.
5. Run bmad-ux.
6. Run bmad-create-epics-and-stories.
7. Resolve technical decisions and rebuild story traceability.
8. Re-run bmad-check-implementation-readiness.
```

## Final marker

```text
UX_HANDOFF_BLOCKED_PENDING_PHASE_5_2L_CLOSURE
```
