# LCSP Development Guide

**Ngày quét:** 2026-06-26T11:32:20+07:00
**Phạm vi:** Hướng dẫn làm việc với workspace hiện tại

## Mục tiêu

File này mô tả cách làm việc với repo LCSP ở trạng thái hiện tại: một workspace tài liệu + tooling support. Nó không mô tả cách chạy ứng dụng LCSP end-to-end, vì ứng dụng đó chưa được bootstrap trong repo này.

## Điều kiện tiên quyết

- `python3` 3.11+
  Cần cho các script `_bmad/scripts/*.py` vì chúng dùng `tomllib`.
- `node`
  Cần cho các script `_bmad/wds/scripts/*.js`.
- `rtk`
  Theo rule của workspace, shell commands nên đi qua `rtk`.
- Trình soạn thảo hỗ trợ Markdown
  Để chỉnh sửa tập tài liệu lớn trong `docs/` và `docs-vn/`.

## Cách tiếp cận repo

### Nếu bạn sửa authority docs

1. Bắt đầu ở `docs/README.md`.
2. Xác định concern thuộc `product/`, `specs/`, `architecture/` hay `implementation/`.
3. Tránh dùng `docs/archive/` làm source of truth.
4. Nếu cần summary tiếng Việt, cập nhật `docs-vn/` sau khi authority docs đã đúng.

### Nếu bạn sửa BMAD/WDS automation

1. Đọc `_bmad/config.toml` và `_bmad/custom/config.toml`.
2. Đọc trực tiếp script liên quan trong `_bmad/scripts/` hoặc `_bmad/wds/scripts/`.
3. Giữ nguyên boundary hiện tại: Python cho resolver, Node stdlib cho WDS scaffold.

## Lệnh hữu ích

### Resolve BMAD config

```bash
rtk python3 _bmad/scripts/resolve_config.py --project-root /home/khovan/Workplaces/LCSP
```

### Resolve skill customization

```bash
rtk python3 _bmad/scripts/resolve_customization.py --skill /abs/path/to/skill
```

### Xem hướng dẫn WDS scripts

```bash
rtk sed -n '1,220p' _bmad/wds/scripts/README.md
```

### Validate WDS page specs

```bash
rtk node _bmad/wds/scripts/wds-validate.js --all
```

Lưu ý: lệnh validate ở trên chỉ hữu ích khi repo có WDS page specs theo đúng cấu trúc mà script mong đợi.

## Build, run, test ở trạng thái hiện tại

### Có thể chạy thực tế trong repo

- Python resolver scripts trong `_bmad/scripts/`
- Node WDS scripts trong `_bmad/wds/scripts/`
- Test Python hiện có: `_bmad/scripts/tests/test_resolve_customization.py`

### Chưa có trong repo

- `package.json`, `requirements.txt`, `pyproject.toml` hoặc manifest tương đương cho application runtime
- Web app entry points
- Backend API entry points
- Worker runtime entry points
- Database migrations/schema thật

## Kiểm thử hiện có

### Python

Repo hiện có tối thiểu một test file:

- `_bmad/scripts/tests/test_resolve_customization.py`

### JavaScript

WDS scripts tự chứa logic validate cấu trúc qua `wds-validate.js`, nhưng repo chưa cho thấy suite test riêng cho các script này.

## Quy ước và guardrails

- Ưu tiên active docs trong `docs/`.
- Không trình bày planned commands như bằng chứng code đã có.
- Không đưa lịch sử trong `docs/archive/` vào quyết định mới nếu mâu thuẫn active docs.
- Cẩn thận với path `demo ` vì tên thư mục có khoảng trắng ở cuối.

## CI/CD và deployment

Không phát hiện cấu hình CI/CD hay deployment runtime đáng kể ngoài `.github/copilot-instructions.md`. Đây không phải deployment guide và không đủ cơ sở để kết luận repo đã có pipeline build/deploy cho sản phẩm LCSP.

## Quy trình làm việc đề xuất

1. Đồng bộ vấn đề cần sửa với authority section đúng trong `docs/`.
2. Sửa tài liệu active trước.
3. Cập nhật `docs-vn/` nếu thay đổi ảnh hưởng đến summary cho team.
4. Nếu sửa script, chạy kiểm tra cục bộ phù hợp với file bị chạm.
5. Giữ phân tách rõ giữa tài liệu mô tả hệ thống mục tiêu và code thực sự tồn tại trong workspace.

## Khoảng trống cần lưu ý

- Thiếu bootstrap implementation cho các runtime LCSP đã được mô tả.
- Thiếu dependency manifests cho phần utility scripts.
- Thiếu contribution guide riêng và deployment guide riêng cho repo.

---

_File này được tạo để giúp AI agents và contributors làm việc đúng với trạng thái thực của workspace._
