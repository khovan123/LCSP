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


def reviewed_manifest(
    tmp_path: Path,
    document_id: str,
    text: str,
    *,
    chapters: list[dict] | None = None,
) -> Path:
    text_path = tmp_path / f"{document_id}.reviewed.txt"
    review_path = tmp_path / f"{document_id}.hierarchy-review.json"
    manifest_path = tmp_path / f"{document_id}.source.json"
    snapshot_path = tmp_path / f"{document_id}.pdf"

    text_path.write_text(text, encoding="utf-8")
    snapshot_path.write_bytes(f"pdf:{document_id}".encode())
    source_sha = module.file_sha256(snapshot_path)

    review_path.write_text(
        json.dumps(
            {
                "documentId": document_id,
                "reviewState": "APPROVED",
                "reviewedTextSha256": module.sha256(text),
                "reviewedSourceSha256": source_sha,
                "sourceReview": {"sourceSnapshotReviewed": snapshot_path.name},
                "chapters": chapters or [],
            }
        ),
        encoding="utf-8",
    )
    manifest_path.write_text(
        json.dumps(
            {
                "documentId": document_id,
                "title": document_id,
                "sourceUrl": "https://vbpl.vn/test",
                "sourceSha256": source_sha,
                "sourceEffectStatus": "CON_HIEU_LUC",
                "reviewedTextFile": text_path.name,
                "hierarchyReviewFile": review_path.name,
            }
        ),
        encoding="utf-8",
    )
    return manifest_path


def test_fails_closed_without_approved_operator_signoff(tmp_path: Path):
    manifest = reviewed_manifest(tmp_path, "LAW-TEST", "Điều 1. Test\n1. Nội dung\n")
    review = tmp_path / "LAW-TEST.hierarchy-review.json"
    review.write_text(
        json.dumps({"documentId": "LAW-TEST", "reviewState": "CHANGES_REQUIRED"}),
        encoding="utf-8",
    )
    with pytest.raises(RuntimeError, match="not APPROVED"):
        module.build_payload([manifest], "DRAFT-1")


def test_fails_closed_when_reports_pdf_hash_changes(tmp_path: Path):
    manifest = reviewed_manifest(tmp_path, "LAW-TEST", "Điều 1. Test\n1. Nội dung\n")
    (tmp_path / "LAW-TEST.pdf").write_bytes(b"tampered")
    with pytest.raises(RuntimeError, match="reports PDF hash"):
        module.build_payload([manifest], "DRAFT-1")


def test_structure_first_chunking_and_law_134_article_33_repeal(tmp_path: Path):
    law_134 = reviewed_manifest(
        tmp_path,
        module.LAW_134,
        "\n".join(
            [
                "NOTE",
                "Điều 9–15, the Chapter VI–VIII hierarchy boundary around Điều 28–35, and Điều 33.",
                "Chương VIII",
                "ĐIỀU KHOẢN THI HÀNH",
                "Điều 33. Bãi bỏ một số chương, điều, khoản, điểm",
                "Bãi bỏ khoản 9 Điều 3, khoản 7 Điều 4, khoản 6 Điều 12, điểm đ khoản 2 Điều 34 và Chương IV của Luật Công nghiệp công nghệ số.",
                "",
            ]
        ),
        chapters=[
            {
                "chapter": "VIII",
                "title": "ĐIỀU KHOẢN THI HÀNH",
                "articles": {"from": 33, "to": 35},
            }
        ],
    )
    law_71 = reviewed_manifest(
        tmp_path,
        module.LAW_71,
        "\n".join(
            [
                "Điều 3. Test",
                "9. Repealed",
                "Điều 4. Test",
                "7. Repealed",
                "Điều 12. Test",
                "6. Repealed",
                "Điều 34. Test",
                "2. Nội dung",
                "đ) Repealed point",
                "Điều 40. Boundary before",
                "[Boundary sentinel: outside repeal.]",
                "Chương IV",
                "TRÍ TUỆ NHÂN TẠO",
                "Điều 41. A",
                "1. Clause with points:",
                "a) First point",
                "continued point text",
                "b) Second point",
                "Điều 42. B",
                "Điều 45. C",
                "Chương V",
                "TÀI SẢN SỐ",
                "Điều 46. Active",
                "",
            ]
        ),
        chapters=[
            {
                "chapter": "I",
                "title": "NHỮNG QUY ĐỊNH CHUNG",
                "articles": {"from": 1, "to": 12},
            },
            {
                "chapter": "II",
                "title": "PHÁT TRIỂN CÔNG NGHIỆP CÔNG NGHỆ SỐ",
                "articles": {"from": 13, "to": 35},
            },
            {
                "chapter": "III",
                "title": "CÔNG NGHIỆP BÁN DẪN",
                "articles": {"from": 36, "to": 40},
            },
            {
                "chapter": "IV",
                "title": "TRÍ TUỆ NHÂN TẠO",
                "articles": {"from": 41, "to": 45},
            },
            {
                "chapter": "V",
                "title": "TÀI SẢN SỐ",
                "articles": {"from": 46, "to": 48},
            },
        ],
    )

    payload = module.build_payload([law_134, law_71], "DRAFT-1")
    law_134_doc, law_71_doc = payload["documents"]
    law_134_chunks = {item["locator"]: item for item in law_134_doc["chunks"]}
    law_71_chunks = {item["locator"]: item for item in law_71_doc["chunks"]}

    # The review-note range must not be misparsed as a second Article 9.
    assert "art-9" not in law_134_chunks

    # A no-clause article retains its substantive body, not only its heading.
    assert "Bãi bỏ khoản 9 Điều 3" in law_134_chunks["art-33"]["content"]
    assert law_134_chunks["art-33"]["hierarchy"]["chapterNumber"] == "VIII"
    assert law_134_chunks["art-33"]["hierarchy"]["chapterTitle"] == "ĐIỀU KHOẢN THI HÀNH"

    # Clause is the base retrieval unit and retains Point descendants.
    assert "đ) Repealed point" in law_71_chunks["art-34::cl-2"]["content"]
    assert "continued point text" in law_71_chunks["art-41::cl-1::pt-a"]["content"]
    assert "a) First point\ncontinued point text" in law_71_chunks["art-41::cl-1"]["content"]
    assert "b) Second point" in law_71_chunks["art-41::cl-1"]["content"]
    assert law_71_chunks["art-41::cl-1::pt-a"]["hierarchy"]["clauseNumber"] == "1"
    assert law_71_chunks["art-3::cl-9"]["hierarchy"]["chapterNumber"] == "I"

    # Article 33 repeal is locator-scoped and expands Chapter IV descendants.
    assert law_71_chunks["art-34::cl-2"]["legalStatus"] == "ACTIVE"
    assert law_71_chunks["art-34::cl-2::pt-đ"]["legalStatus"] == "REPEALED"
    assert law_71_chunks["art-41::cl-1::pt-a"]["hierarchy"]["repealedByRef"] == {
        "documentId": module.LAW_134,
        "locator": "art-33",
    }
    assert law_71_chunks["art-45"]["legalStatus"] == "REPEALED"
    assert law_71_chunks["art-40"]["legalStatus"] == "ACTIVE"
    assert law_71_chunks["art-46"]["legalStatus"] == "ACTIVE"

    # Corpus provenance points to the reviewed PDF snapshot, not the source manifest.
    assert law_134_doc["snapshotPath"] == f"{module.LAW_134}.pdf"
    assert law_71_doc["snapshotPath"] == f"{module.LAW_71}.pdf"


def test_duplicate_real_locator_fails_closed():
    text = "Điều 9. First\n1. A\nĐiều 9. Duplicate\n1. B\n"
    with pytest.raises(RuntimeError, match="duplicate legal locator art-9"):
        module.parse_chunks("LAW-TEST", text)
