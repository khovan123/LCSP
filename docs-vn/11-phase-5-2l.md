# 11 — Phase 5.2L: Điều chỉnh phạm vi và runtime

## Project Owner direction

```text
PBAC_REPLACES_RBAC
STRUCTURED_ATTESTATION_REMOVED_FROM_MVP
CERTIFICATION_REGULATOR_SUBMISSION_MANUAL_JSON_REMOVED_FROM_PRODUCT
FR_050_REPLACED_BY_AUTOMATIC_TRUSTED_SCAN_INITIATION
ALL_ASYNC_DOMAIN_WORKERS_USE_PYTHON
SCANNER_TOOLCHAIN_EXPANDED
```

## PBAC

Policy evaluation phải dựa trên subject/service identity, organization, resource, action, context và policy version. Role chỉ là attribute/template. Hệ thống deny-by-default, tenant-scoped và audit mọi quyết định quan trọng.

## Product scope correction

Structured attestation không còn trong MVP. Compliance certification, formal legal opinion, direct regulator submission và manual evidence JSON upload không còn là capability hiện tại hoặc roadmap tương lai.

## Automatic scan initiation

Không upload Local/CI report. Trusted integration context tạo hoặc resume pending scan. Trigger có PBAC decision, idempotency key, mapping outcome và audit. Mapping thiếu/mơ hồ phải dừng an toàn.

## Python Worker Platform

```text
NestJS API = synchronous control plane
Web = customer UI
Python Worker Platform = all async domain workloads
Node CLI = ts-morph adapter only
```

Python consumers sở hữu scan, TechnicalProfile, AIUsageFlow, reconciliation, VerifiedProfile, legal ingestion/index, legal matching, classification, gap analysis, document và async export.

## Scanner toolchain

```text
Syft
+ Knip
+ deptry
+ Semgrep custom rules
+ tree-sitter/custom parser
+ ast/libcst
+ ts-morph
```

Mỗi tool cần pinned version, config/ruleset hash, bounded execution, validated/redacted output, common contracts và severity-based failure behavior.

## Open technical decisions

- PBAC engine/topology.
- Automatic trigger catalog, lifecycle, idempotency và retry/DLQ.
- Python worker package/process/deployment boundaries.
- Tool adapters, versions, schemas và failure severity.

## Current gate

Đây là target direction, chưa phải active baseline đã hoàn tất. Cần proposal approval, active-document remediation và closure review trước `bmad-ux`.
