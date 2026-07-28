# LCSP - Source Tree Analysis

**Ngày quét:** 2026-06-26T11:32:20+07:00

## Tổng quan

Repository được tổ chức như một workspace tài liệu với automation support gắn kèm. Thư mục `docs/` là lõi authority; `docs-vn/` là lớp tóm lược; `_bmad/` và các file rule ở root là lớp điều phối agent/tooling. Không có application source tree đầy đủ cho web/api/workers ở thời điểm quét này.

## Complete Directory Structure

```text
LCSP/
├── .github/                 # Tooling instructions for Copilot
├── .ruler/                  # Rule aggregation config
├── _bmad/                   # BMAD modules, config, scripts, manifests
│   ├── scripts/             # Python config/customization resolvers + tests
│   ├── wds/                 # WDS config, data, scripts
│   ├── bmm/ bmb/ cis/ tea/  # Module-specific config/help
│   └── custom/              # Human-authored overrides
├── demo /                   # Placeholder prototype area with trailing-space folder name
│   ├── rag/                 # Empty placeholder
│   └── scanner/             # Placeholder with empty tools/ subtree
├── design-artifacts/        # Reserved area for design outputs
├── docs/                    # Active authoritative documentation
│   ├── architecture/        # System architecture and ADRs
│   ├── implementation/      # Build/planning specs, tasks, handoffs, runbooks
│   ├── planning-artifacts/  # Planning and readiness reports
│   ├── product/             # Product brief, PRD, business rules, system context
│   ├── specs/               # Canonical requirements and domain specs
│   ├── test-artifacts/      # Traceability and test evidence docs
│   └── archive/             # Historical/non-authoritative artifacts
├── docs-vn/                 # Vietnamese summaries and review notes
├── AGENTS.md                # Workspace instructions
├── CLAUDE.md                # Mirrored instruction file
└── RTK.md                   # Shell execution convention
```

## Critical Directories

### `docs/`

Trung tâm authority của repo.

**Purpose:** Nơi định nghĩa hành vi, scope, architecture target và implementation planning của LCSP.
**Contains:** Product, specs, architecture, implementation, planning artifacts, test artifacts, archive.
**Entry Points:** `docs/README.md`, `docs/index.md`

### `docs/product/`

Chứa định nghĩa sản phẩm ở mức business.

**Purpose:** Mô tả actor, scope, product intent, business rules.
**Contains:** `system-context.md`, `product-brief.md`, `prd.md`, `business-rules.md`

### `docs/specs/`

Chứa canonical requirements và domain behavior.

**Purpose:** Khóa behavior và gate logic của hệ thống mục tiêu.
**Contains:** FR/NFR, use cases, state machines, event catalog, domain model, traceability.

### `docs/architecture/`

Chứa kiến trúc hệ thống mục tiêu và ADRs active.

**Purpose:** Trả lời “LCSP sẽ được xây như thế nào”.
**Contains:** `architecture.md`, `multi-agent-system-architecture.md`, `adr/`

### `docs/implementation/`

Chứa implementation planning/build specs.

**Purpose:** Trả lời “nếu được phép code thì sẽ build thế nào”.
**Contains:** build specs, decisions, tasks, handoffs, runbooks, templates.

### `docs-vn/`

Lớp summary tiếng Việt.

**Purpose:** Onboarding, review nhanh, đồng bộ ngôn ngữ cho team.
**Contains:** 12 tài liệu tóm lược theo chủ đề + `README.md`

### `_bmad/scripts/`

Lớp Python utility cho BMAD.

**Purpose:** Resolve config/customization theo merge rules có thể tái lập.
**Contains:** `resolve_customization.py`, `resolve_config.py`, `tests/`
**Entry Points:** `resolve_customization.py`, `resolve_config.py`

### `_bmad/wds/scripts/`

Lớp Node.js utility cho WDS.

**Purpose:** Tạo scaffold và validate page specs thay vì cho agent tự viết cấu trúc tự do.
**Contains:** `wds-init-scenario.js`, `wds-init-page.js`, `wds-nav.js`, `wds-add-object.js`, `wds-add-spacing.js`, `wds-validate.js`
**Entry Points:** `README.md`, `wds-validate.js`

### `demo /`

Vùng prototype chưa được triển khai.

**Purpose:** Placeholder cho `rag/` và `scanner/`.
**Contains:** Thư mục rỗng hoặc gần như rỗng, chưa có entry point thực thi
**Integration:** Hiện không có integration thực chất với phần còn lại của repo

## Entry Points

- **Main human entry:** `docs/README.md`
- **Main brownfield AI entry:** `docs/index.md`
- **Vietnamese summary entry:** `docs-vn/README.md`
- **BMAD config entry:** `_bmad/scripts/resolve_config.py`
- **Skill customization entry:** `_bmad/scripts/resolve_customization.py`
- **WDS validation entry:** `_bmad/wds/scripts/wds-validate.js`

## Mẫu tổ chức file

- **Authority first:** file active nằm trong `docs/`; archive bị tách riêng.
- **Separation by concern:** product/specs/architecture/implementation/test-artifacts được phân vùng rõ.
- **Automation support isolated:** script utilities sống trong `_bmad/`, không trộn vào `docs/`.
- **Instruction layering:** `AGENTS.md`, `CLAUDE.md`, `RTK.md`, `.github/copilot-instructions.md` kiểm soát cách agent làm việc với repo.

## Các loại file chính

### Markdown documentation

- **Pattern:** `**/*.md`
- **Purpose:** Tài liệu authority, summaries, tasks, handoffs, runbooks, review reports
- **Examples:** `docs/README.md`, `docs/product/prd.md`, `docs/implementation/dev-compendium.md`

### Python utility scripts

- **Pattern:** `_bmad/scripts/*.py`
- **Purpose:** Resolve configuration/customization
- **Examples:** `_bmad/scripts/resolve_customization.py`, `_bmad/scripts/resolve_config.py`

### JavaScript utility scripts

- **Pattern:** `_bmad/wds/scripts/*.js`
- **Purpose:** Scaffold và validate WDS specs
- **Examples:** `_bmad/wds/scripts/wds-init-page.js`, `_bmad/wds/scripts/wds-validate.js`

### Configuration files

- **Pattern:** `*.yaml`, `*.toml`, `*.json`
- **Purpose:** Module config, tool manifests, overrides, metadata
- **Examples:** `_bmad/bmm/config.yaml`, `_bmad/config.toml`, `.mcp.json`

## Asset Locations

Không phát hiện inventory asset đáng kể ở lần quét này. `design-artifacts/` hiện đóng vai trò thư mục dự phòng cho output thiết kế tương lai.

## Configuration Files

- **`_bmad/bmm/config.yaml`**: Cấu hình module BMM, bao gồm output folders và language settings
- **`_bmad/config.toml`**: Cấu hình BMAD gốc do installer quản lý
- **`_bmad/custom/config.toml`**: Override config do con người commit
- **`.ruler/ruler.toml`**: Cấu hình rule concatenation
- **`.github/copilot-instructions.md`**: Gợi ý instruction cho Copilot

## Ghi chú phát triển

- Thư mục `demo /` có khoảng trắng ở cuối tên path; cần cẩn thận khi thao tác shell.
- Không nên suy luận rằng planned runtime trong `docs/README.md` đã tồn tại dưới dạng source code.
- Khi chỉnh sửa authority docs, luôn ưu tiên `docs/` active thay vì `docs/archive/`.

---

_Tạo bởi workflow `bmad-document-project` để phục vụ brownfield AI context._
