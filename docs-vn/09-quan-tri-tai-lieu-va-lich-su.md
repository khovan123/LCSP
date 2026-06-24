# 09 — Quản trị tài liệu và lịch sử

## Lớp tài liệu

```text
docs/product/                        product scope và business rules
docs/specs/                          UC/FR/NFR/AC, domain và state
docs/architecture/                   architecture và ADR
docs/developer-execution-blueprints/ runtime/data journeys
docs/implementation/                 build/configuration contracts
docs/code-map/                       module/table/queue ownership
docs/planning-artifacts/             proposal, readiness và remediation reports
docs/change-control/                 quyết định đã phê duyệt
docs/reviews/                        feedback và remediation evidence
docs/archive/                        historical evidence only
```

## Thứ tự authority

1. Project Owner decision và change-control đã duyệt.
2. Product scope cùng canonical UC/FR/NFR/AC.
3. ADR đang hiệu lực và supersession register.
4. Domain specs/state machines.
5. Implementation specs/code maps.
6. Planning và review artifacts.
7. Archive chỉ dùng để hiểu lịch sử.

Một proposal chưa được Project Owner phê duyệt không tự động thay thế active docs.

## Lịch sử chính

### Phase 5.2J/5.2K

Đã chuyển sang A-to-Z runnable MVP, Python-owned scan lifecycle, real providers, provenance-preserving legal corpus và hybrid retrieval. Tuy nhiên downstream workers vẫn Node.js, authorization vẫn RBAC, attestation vẫn active và FR-050/FR-051 vẫn giữ dạng upload/deferred.

### Phase 5.2L

Project Owner yêu cầu:

- PBAC thay RBAC;
- loại structured attestation khỏi MVP;
- loại certification, regulator submission và manual evidence JSON khỏi product direction;
- thay manual Local/CI upload bằng automatic trusted scan initiation;
- chuyển mọi async domain workload sang Python Worker Platform;
- bổ sung Syft, Knip, deptry, Semgrep và tree-sitter/custom parser cho scanner.

## Kết quả review hiện tại

GitHub `main` vẫn ở commit `73f47560a075fe7991ba2611a87f52abbe2e0496`. Hai artifact ngày 2026-06-24 mà agent báo cáo chưa có trên `main` hoặc PR #2 tại thời điểm review. Active docs chưa phản ánh Phase 5.2L và không thể được coi là synchronized for UX.

## Archive

Không sửa `docs/archive/` để làm cho baseline mới trông nhất quán. Các quyết định cũ phải được giữ và đánh dấu `HISTORICAL_ONLY`, `SUPERSEDED_FOR_ACTIVE_MVP` hoặc `REMOVED_FROM_PRODUCT` trong active authority artifacts.

## Gate hiện tại

```text
SPRINT_CHANGE_PROPOSAL_REQUIRES_PROJECT_OWNER_APPROVAL
ACTIVE_DOCUMENT_REMEDIATION_REQUIRED
CANONICAL_UX_NOT_AUTHORIZED_YET
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
```

## Vai trò của docs-vn

`docs-vn/` mô tả target direction và các gaps đã kiểm chứng. Nó không tự thay đổi authority của `docs/` và không thay thế remediation bắt buộc.
