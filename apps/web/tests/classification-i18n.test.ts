import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatEngineeringConcept,
  formatEngineeringReason,
} from "@lcsp/i18n";

test("classification concepts render through the selected locale", () => {
  assert.equal(
    formatEngineeringConcept("vi", "CLASSIFICATION_DOSSIER_AND_NOTIFICATION"),
    "Hồ sơ phân loại và thông báo",
  );
  assert.equal(
    formatEngineeringConcept("en", "CLASSIFICATION_DOSSIER_AND_NOTIFICATION"),
    "Classification dossier and notification",
  );
  assert.equal(
    formatEngineeringConcept("vi", "MACHINE_READABLE_AI_MEDIA_MARK"),
    "Đánh dấu nội dung AI ở định dạng máy có thể đọc",
  );
  assert.equal(
    formatEngineeringConcept("en", "MACHINE_READABLE_AI_MEDIA_MARK"),
    "Machine-readable AI media marking",
  );
});

test("unknown machine labels still use a locale-aware fallback", () => {
  assert.equal(
    formatEngineeringConcept("vi", "AI_SECURITY_RISK_ASSESSMENT"),
    "AI bảo mật rủi ro đánh giá",
  );
  assert.equal(
    formatEngineeringConcept("en", "AI_SECURITY_RISK_ASSESSMENT"),
    "AI Security Risk Assessment",
  );
});

test("deterministic evaluator reasons remain localized", () => {
  assert.equal(
    formatEngineeringReason(
      "vi",
      "Repository evidence demonstrates that the engineering requirement is met.",
    ),
    "Bằng chứng trong repository cho thấy yêu cầu kỹ thuật này đã được đáp ứng.",
  );
});
