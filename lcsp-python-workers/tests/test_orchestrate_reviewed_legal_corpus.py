from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.orchestrate_reviewed_legal_corpus import (
    ReviewGateError,
    build_review_signoff,
    enrich_payload_with_signoff,
    sha256_file,
)


def _payload() -> dict:
    return {
        "version": "VN-LEGAL-TEST",
        "sourceManifest": {"reviewRequired": True, "normalizationWarnings": []},
        "documents": [
            {
                "documentId": "LAW-TEST",
                "title": "Reviewed law",
                "sourceUrl": "https://example.test/law",
                "sourceSha256": "sha256:" + "a" * 64,
                "sourceEffectStatus": "CON_HIEU_LUC",
                "chunks": [
                    {
                        "id": "LAW-TEST::art-1",
                        "locator": "art-1",
                        "content": "Điều 1. Nội dung đã duyệt.",
                        "contentSha256": "sha256:" + "b" * 64,
                        "hierarchy": {"articleNumber": "1"},
                        "legalStatus": "ACTIVE",
                    }
                ],
            }
        ],
    }


def _write_review_files(tmp_path: Path, *, state: str = "APPROVED") -> None:
    reviewed_text = tmp_path / "LAW-TEST.reviewed.txt"
    reviewed_text.write_text("Điều 1. Nội dung đã duyệt.\n", encoding="utf-8")
    hierarchy = {
        "documentId": "LAW-TEST",
        "reviewedSourceSha256": "sha256:" + "a" * 64,
        "reviewedTextSha256": sha256_file(reviewed_text),
        "reviewedBy": "legal-operator-1",
        "reviewedAt": "2026-08-11T00:00:00+07:00",
        "reviewState": state,
        "hierarchyCorrections": [],
    }
    (tmp_path / "LAW-TEST.hierarchy-review.json").write_text(
        json.dumps(hierarchy, ensure_ascii=False), encoding="utf-8"
    )


def test_build_review_signoff_requires_approved_review(tmp_path: Path) -> None:
    _write_review_files(tmp_path)

    signoff = build_review_signoff(_payload(), reviewed_dir=tmp_path)

    assert signoff["state"] == "APPROVED"
    assert signoff["reviewedBy"] == "legal-operator-1"
    assert signoff["documents"][0]["documentId"] == "LAW-TEST"
    assert signoff["documents"][0]["reviewState"] == "APPROVED"


def test_build_review_signoff_fails_closed_when_review_not_approved(
    tmp_path: Path,
) -> None:
    _write_review_files(tmp_path, state="CHANGES_REQUIRED")

    with pytest.raises(ReviewGateError, match="reviewState must be APPROVED"):
        build_review_signoff(_payload(), reviewed_dir=tmp_path)


def test_build_review_signoff_fails_closed_when_reviewed_text_missing(
    tmp_path: Path,
) -> None:
    with pytest.raises(ReviewGateError, match="Missing reviewed text"):
        build_review_signoff(_payload(), reviewed_dir=tmp_path)


def test_enrich_payload_rejects_unresolved_normalization_warnings() -> None:
    payload = _payload()
    payload["sourceManifest"]["normalizationWarnings"] = ["unparsed_chapter"]

    with pytest.raises(ReviewGateError, match="Normalization warnings"):
        enrich_payload_with_signoff(
            payload,
            {"state": "APPROVED", "reviewedBy": "legal-operator-1", "documents": []},
        )
