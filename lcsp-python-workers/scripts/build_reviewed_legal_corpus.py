#!/usr/bin/env python3
"""Build a fail-closed draft corpus from Legal Operator-reviewed artefacts.

Raw OCR is intentionally not an input. Every document needs a reviewed text
file and an APPROVED hierarchy-review record before this utility emits a corpus
payload. Article 33 of Law 134 is resolved into concrete Law 71 chunks.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ARTICLE = re.compile(r"^Điều\s+(\d+)\.?(?:\s*(.*))?$", re.I)
CLAUSE = re.compile(r"^(\d+)\.\s*(.+)$")
POINT = re.compile(r"^([a-zđ])\)\s*(.+)$", re.I)
CHAPTER = re.compile(r"^Chương\s+([IVXLC]+)\b\s*(.*)$", re.I)
REPEALED = "REPEALED"
ACTIVE = "ACTIVE"
LAW_134 = "LAW-134-2025-QH15"
LAW_71 = "LAW-71-2025-QH15"
ARTICLE_33_REPEALS = ("art-3::cl-9", "art-4::cl-7", "art-12::cl-6", "art-34::cl-2::pt-đ")


def sha256(value: str) -> str:
    return f"sha256:{hashlib.sha256(value.encode()).hexdigest()}"


def load_reviewed_document(manifest_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    document_id = required(manifest, "documentId")
    reviewed_text_path = manifest_path.parent / required(manifest, "reviewedTextFile")
    review_path = manifest_path.parent / required(manifest, "hierarchyReviewFile")
    review = json.loads(review_path.read_text(encoding="utf-8"))
    if review.get("documentId") != document_id or review.get("reviewState") != "APPROVED":
        raise RuntimeError(f"{document_id}: Legal Operator hierarchy sign-off is not APPROVED")
    text = reviewed_text_path.read_text(encoding="utf-8")
    if review.get("reviewedTextSha256") != sha256(text):
        raise RuntimeError(f"{document_id}: reviewed text hash does not match sign-off")
    return manifest, parse_chunks(document_id, text)


def parse_chunks(document_id: str, text: str) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    article_id = clause_id = ""
    chapter: dict[str, str] | None = None
    for raw_line in text.splitlines():
        line = " ".join(raw_line.split())
        if not line:
            continue
        chapter_match = CHAPTER.match(line)
        if chapter_match:
            chapter = {"chapterNumber": chapter_match.group(1).upper(), "chapterTitle": chapter_match.group(2)}
            continue
        article_match = ARTICLE.match(line)
        if article_match:
            number, _ = article_match.groups()
            locator = f"art-{number}"
            article_id = f"{document_id}::{locator}"
            clause_id = ""
            chunks.append(new_chunk(article_id, locator, line, {"articleNumber": number, **(chapter or {})}))
            continue
        clause_match = CLAUSE.match(line)
        if clause_match and article_id:
            number, _ = clause_match.groups()
            locator = f"{article_id.split('::', 1)[1]}::cl-{number}"
            clause_id = f"{document_id}::{locator}"
            chunks.append(new_chunk(clause_id, locator, line, {"parentChunkId": article_id, "clauseNumber": number, **(chapter or {})}))
            continue
        point_match = POINT.match(line)
        if point_match and clause_id:
            point, _ = point_match.groups()
            locator = f"{clause_id.split('::', 1)[1]}::pt-{point.lower()}"
            chunks.append(new_chunk(f"{document_id}::{locator}", locator, line, {"parentChunkId": clause_id, "pointCode": point.lower(), **(chapter or {})}))
    if not chunks:
        raise RuntimeError(f"{document_id}: no reviewed legal hierarchy found")
    return chunks


def new_chunk(chunk_id: str, locator: str, content: str, hierarchy: dict[str, Any]) -> dict[str, Any]:
    return {"id": chunk_id, "locator": locator, "content": content, "contentSha256": sha256(content), "hierarchy": hierarchy, "legalStatus": ACTIVE}


def apply_law_134_article_33(documents: list[dict[str, Any]]) -> None:
    law_71 = next((item for item in documents if item["documentId"] == LAW_71), None)
    law_134 = next((item for item in documents if item["documentId"] == LAW_134), None)
    if not law_71 or not law_134:
        return
    available = {chunk["locator"]: chunk for chunk in law_71["chunks"]}
    required_locators = set(ARTICLE_33_REPEALS)
    required_locators.update(locator for locator in available if re.match(r"^art-(41|42|43|44|45)(::|$)", locator))
    if not required_locators or any(locator not in available for locator in ARTICLE_33_REPEALS):
        raise RuntimeError("Law 134 Article 33 repeal targets cannot be resolved")
    ref = {"documentId": LAW_134, "locator": "art-33"}
    for locator in required_locators:
        chunk = available[locator]
        chunk["legalStatus"] = REPEALED
        chunk["hierarchy"]["repealedByRef"] = ref


def build_payload(manifest_paths: list[Path], version: str) -> dict[str, Any]:
    documents = []
    for path in manifest_paths:
        manifest, chunks = load_reviewed_document(path)
        documents.append({
            "documentId": required(manifest, "documentId"), "title": required(manifest, "title"),
            "sourceUrl": required(manifest, "sourceUrl"), "sourceSha256": required(manifest, "sourceSha256"),
            "sourceEffectStatus": required(manifest, "sourceEffectStatus"), "effectiveDate": manifest.get("effectiveFrom"),
            "snapshotPath": str(path), "chunks": chunks,
        })
    apply_law_134_article_33(documents)
    return {"version": version, "sourceManifest": {"reviewRequired": False, "reviewedArtifacts": [str(path) for path in manifest_paths]}, "documents": documents}


def required(values: dict[str, Any], key: str) -> str:
    value = values.get(key)
    if not isinstance(value, str) or not value:
        raise RuntimeError(f"manifest is missing {key}")
    return value


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-manifest", action="append", required=True, type=Path)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    payload = build_payload(args.source_manifest, args.version)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
