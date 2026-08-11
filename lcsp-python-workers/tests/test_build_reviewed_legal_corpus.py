import importlib.util
import json
import sys
from pathlib import Path

import pytest


script_path = Path(__file__).parents[1] / "scripts" / "build_reviewed_legal_corpus.py"
spec = importlib.util.spec_from_file_location("build_reviewed_legal_corpus", script_path)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def reviewed_manifest(tmp_path: Path, document_id: str, text: str) -> Path:
    text_path = tmp_path / f"{document_id}.reviewed.txt"
    review_path = tmp_path / f"{document_id}.hierarchy-review.json"
    manifest_path = tmp_path / f"{document_id}.source.json"
    text_path.write_text(text, encoding="utf-8")
    review_path.write_text(json.dumps({"documentId": document_id, "reviewState": "APPROVED", "reviewedTextSha256": module.sha256(text)}), encoding="utf-8")
    manifest_path.write_text(json.dumps({"documentId": document_id, "title": document_id, "sourceUrl": "https://vbpl.vn/test", "sourceSha256": "sha256:" + "a" * 64, "sourceEffectStatus": "CON_HIEU_LUC", "reviewedTextFile": text_path.name, "hierarchyReviewFile": review_path.name}), encoding="utf-8")
    return manifest_path


def test_fails_closed_without_approved_operator_signoff(tmp_path: Path):
    manifest = reviewed_manifest(tmp_path, "LAW-TEST", "Điều 1. Test\n1. Nội dung\n")
    review = tmp_path / "LAW-TEST.hierarchy-review.json"
    review.write_text(json.dumps({"documentId": "LAW-TEST", "reviewState": "CHANGES_REQUIRED"}), encoding="utf-8")
    with pytest.raises(RuntimeError, match="not APPROVED"):
        module.build_payload([manifest], "DRAFT-1")


def test_builds_chapter_hierarchy_and_expands_law_134_article_33(tmp_path: Path):
    law_134 = reviewed_manifest(tmp_path, module.LAW_134, "Chương VIII\nĐiều 33. Bãi bỏ\n")
    law_71 = reviewed_manifest(tmp_path, module.LAW_71, "\n".join(["Chương I", "Điều 3. Test", "9. Repealed", "Điều 4. Test", "7. Repealed", "Điều 12. Test", "6. Repealed", "Điều 34. Test", "2. Nội dung", "đ) Repealed", "Chương IV", "Điều 41. A", "1. Child", "a) Point", "Điều 42. B", "Điều 45. C", "Điều 46. Active", ""]))
    payload = module.build_payload([law_134, law_71], "DRAFT-1")
    chunks = {item["locator"]: item for item in payload["documents"][1]["chunks"]}
    assert chunks["art-34::cl-2::pt-đ"]["legalStatus"] == "REPEALED"
    assert chunks["art-41::cl-1::pt-a"]["hierarchy"]["repealedByRef"] == {"documentId": module.LAW_134, "locator": "art-33"}
    assert chunks["art-45"]["legalStatus"] == "REPEALED"
    assert chunks["art-46"]["legalStatus"] == "ACTIVE"
    assert chunks["art-41"]["hierarchy"]["chapterNumber"] == "IV"
