#!/usr/bin/env python3
"""Build a fail-closed draft corpus from reviewed legal artefacts.

Raw OCR is intentionally not an input. Every document needs a reviewed text
file and an APPROVED hierarchy-review record before this utility emits a corpus
payload. Reviewed text is bound back to the exact PDF snapshot recorded under
reports/, and Article 33 of Law 134 is resolved into concrete Law 71 chunks.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ARTICLE = re.compile(r"^Điều\s+(\d+)\.(?:\s*(.*))?$", re.I)
CLAUSE = re.compile(r"^(\d+)\.\s*(.+)$")
POINT = re.compile(r"^([a-zđ])\)\s*(.+)$", re.I)
CHAPTER = re.compile(r"^Chương\s+([IVXLC]+)\b\s*(.*)$", re.I)
REPEALED = "REPEALED"
ACTIVE = "ACTIVE"
LAW_134 = "LAW-134-2025-QH15"
LAW_71 = "LAW-71-2025-QH15"
ARTICLE_33_REPEALS = (
    "art-3::cl-9",
    "art-4::cl-7",
    "art-12::cl-6",
    "art-34::cl-2::pt-đ",
)


def sha256(value: str) -> str:
    return f"sha256:{hashlib.sha256(value.encode()).hexdigest()}"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def resolve_snapshot_path(review_path: Path, snapshot_ref: str) -> Path:
    raw = Path(snapshot_ref)
    if raw.is_absolute():
        candidates = [raw]
    else:
        candidates = [review_path.parent / raw]
        candidates.extend(parent / raw for parent in review_path.parents)
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise RuntimeError(
        f"{review_path.name}: reviewed PDF snapshot does not exist: {snapshot_ref}"
    )


def load_reviewed_document(
    manifest_path: Path,
) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    document_id = required(manifest, "documentId")
    reviewed_text_path = manifest_path.parent / required(manifest, "reviewedTextFile")
    review_path = manifest_path.parent / required(manifest, "hierarchyReviewFile")
    review = json.loads(review_path.read_text(encoding="utf-8"))

    if review.get("documentId") != document_id or review.get("reviewState") != "APPROVED":
        raise RuntimeError(f"{document_id}: legal hierarchy review is not APPROVED")

    text = reviewed_text_path.read_text(encoding="utf-8")
    if review.get("reviewedTextSha256") != sha256(text):
        raise RuntimeError(f"{document_id}: reviewed text hash does not match review")

    reviewed_source_sha = required(review, "reviewedSourceSha256")
    if required(manifest, "sourceSha256") != reviewed_source_sha:
        raise RuntimeError(
            f"{document_id}: source manifest hash does not match reviewed PDF hash"
        )

    source_review = review.get("sourceReview")
    if not isinstance(source_review, dict):
        raise RuntimeError(f"{document_id}: hierarchy review is missing sourceReview")
    snapshot_ref = required(source_review, "sourceSnapshotReviewed")
    snapshot_path = resolve_snapshot_path(review_path, snapshot_ref)
    if file_sha256(snapshot_path) != reviewed_source_sha:
        raise RuntimeError(
            f"{document_id}: reports PDF hash does not match reviewedSourceSha256"
        )

    return manifest, review, parse_chunks(document_id, text, review)


def chapter_index(
    review: dict[str, Any],
) -> tuple[dict[str, dict[str, str]], dict[int, dict[str, str]]]:
    by_number: dict[str, dict[str, str]] = {}
    by_article: dict[int, dict[str, str]] = {}
    for item in review.get("chapters", []):
        chapter_number = str(item.get("chapter", "")).upper()
        title = str(item.get("title", ""))
        articles = item.get("articles") or {}
        start = articles.get("from")
        end = articles.get("to")
        if not chapter_number or not isinstance(start, int) or not isinstance(end, int):
            continue
        metadata = {"chapterNumber": chapter_number, "chapterTitle": title}
        by_number[chapter_number] = metadata
        for article_number in range(start, end + 1):
            by_article[article_number] = metadata
    return by_number, by_article


def is_review_control_line(line: str) -> bool:
    return (
        line == "NOTE"
        or line == "END OF REVIEWED LCSP SCOPE"
        or (line.startswith("[") and line.endswith("]"))
    )


def append_content(item: dict[str, Any] | None, line: str) -> None:
    if item is None:
        return
    item["content"] += "\n" + line
    item["contentSha256"] = sha256(item["content"])


def parse_chunks(
    document_id: str,
    text: str,
    review: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    locators: set[str] = set()

    review_by_number, review_by_article = chapter_index(review or {})
    chapter: dict[str, str] | None = None
    awaiting_chapter_title = False
    article_chunk: dict[str, Any] | None = None
    clause_chunk: dict[str, Any] | None = None
    point_chunk: dict[str, Any] | None = None

    def add(item: dict[str, Any]) -> dict[str, Any]:
        locator = item["locator"]
        if locator in locators:
            raise RuntimeError(f"{document_id}: duplicate legal locator {locator}")
        locators.add(locator)
        chunks.append(item)
        return item

    for raw_line in text.splitlines():
        line = " ".join(raw_line.split())
        if not line:
            continue

        chapter_match = CHAPTER.match(line)
        if chapter_match:
            number, inline_title = chapter_match.groups()
            number = number.upper()
            reviewed_chapter = review_by_number.get(number, {})
            chapter = {
                "chapterNumber": number,
                "chapterTitle": inline_title.strip()
                or reviewed_chapter.get("chapterTitle", ""),
            }
            awaiting_chapter_title = not bool(inline_title.strip())
            article_chunk = clause_chunk = point_chunk = None
            continue

        article_match = ARTICLE.match(line)
        if article_match:
            awaiting_chapter_title = False
            number, title = article_match.groups()
            article_number = int(number)
            resolved_chapter = chapter or review_by_article.get(article_number)
            hierarchy = {
                "articleNumber": number,
                "articleTitle": (title or "").strip(),
                **(resolved_chapter or {}),
            }
            locator = f"art-{number}"
            article_chunk = add(
                new_chunk(f"{document_id}::{locator}", locator, line, hierarchy)
            )
            clause_chunk = point_chunk = None
            continue

        if awaiting_chapter_title and article_chunk is None:
            if not is_review_control_line(line):
                if chapter is not None:
                    chapter["chapterTitle"] = line
                awaiting_chapter_title = False
            continue

        clause_match = CLAUSE.match(line)
        if clause_match and article_chunk is not None:
            number, _ = clause_match.groups()
            article_locator = article_chunk["locator"]
            locator = f"{article_locator}::cl-{number}"
            article_hierarchy = article_chunk["hierarchy"]
            hierarchy = {
                "articleNumber": article_hierarchy["articleNumber"],
                "articleTitle": article_hierarchy.get("articleTitle", ""),
                "clauseNumber": number,
                "parentChunkId": article_chunk["id"],
                **{
                    key: article_hierarchy[key]
                    for key in ("chapterNumber", "chapterTitle")
                    if key in article_hierarchy
                },
            }
            clause_chunk = add(
                new_chunk(f"{document_id}::{locator}", locator, line, hierarchy)
            )
            point_chunk = None
            continue

        point_match = POINT.match(line)
        if point_match and clause_chunk is not None and article_chunk is not None:
            point, _ = point_match.groups()
            point = point.lower()
            locator = f"{clause_chunk['locator']}::pt-{point}"
            article_hierarchy = article_chunk["hierarchy"]
            hierarchy = {
                "articleNumber": article_hierarchy["articleNumber"],
                "articleTitle": article_hierarchy.get("articleTitle", ""),
                "clauseNumber": clause_chunk["hierarchy"]["clauseNumber"],
                "pointCode": point,
                "parentChunkId": clause_chunk["id"],
                **{
                    key: article_hierarchy[key]
                    for key in ("chapterNumber", "chapterTitle")
                    if key in article_hierarchy
                },
            }
            point_chunk = add(
                new_chunk(f"{document_id}::{locator}", locator, line, hierarchy)
            )
            # Clause is the base retrieval unit, so it retains its point descendants.
            append_content(clause_chunk, line)
            continue

        if is_review_control_line(line):
            continue

        # Continuation text belongs to the deepest active legal unit. Point text is
        # also retained in its parent Clause so retrieval never loses legal context.
        if point_chunk is not None:
            append_content(point_chunk, line)
            append_content(clause_chunk, line)
        elif clause_chunk is not None:
            append_content(clause_chunk, line)
        elif article_chunk is not None:
            append_content(article_chunk, line)

    if not chunks:
        raise RuntimeError(f"{document_id}: no reviewed legal hierarchy found")
    return chunks


def new_chunk(
    chunk_id: str,
    locator: str,
    content: str,
    hierarchy: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": chunk_id,
        "locator": locator,
        "content": content,
        "contentSha256": sha256(content),
        "hierarchy": hierarchy,
        "legalStatus": ACTIVE,
    }


def apply_law_134_article_33(documents: list[dict[str, Any]]) -> None:
    law_71 = next((item for item in documents if item["documentId"] == LAW_71), None)
    law_134 = next((item for item in documents if item["documentId"] == LAW_134), None)
    if not law_71 or not law_134:
        return

    amending_chunks = {chunk["locator"]: chunk for chunk in law_134["chunks"]}
    article_33 = amending_chunks.get("art-33")
    if (
        article_33 is None
        or "Bãi bỏ khoản 9 Điều 3" not in article_33["content"]
        or "Chương IV" not in article_33["content"]
    ):
        raise RuntimeError("Law 134 Article 33 reviewed content is incomplete")

    available = {chunk["locator"]: chunk for chunk in law_71["chunks"]}
    required_locators = set(ARTICLE_33_REPEALS)
    required_locators.update(
        locator
        for locator in available
        if re.match(r"^art-(41|42|43|44|45)(::|$)", locator)
    )
    if any(locator not in available for locator in ARTICLE_33_REPEALS):
        raise RuntimeError("Law 134 Article 33 repeal targets cannot be resolved")

    ref = {"documentId": LAW_134, "locator": "art-33"}
    for locator in required_locators:
        chunk = available[locator]
        chunk["legalStatus"] = REPEALED
        chunk["hierarchy"]["repealedByRef"] = ref


def build_payload(manifest_paths: list[Path], version: str) -> dict[str, Any]:
    documents = []
    for path in manifest_paths:
        manifest, review, chunks = load_reviewed_document(path)
        source_review = review["sourceReview"]
        documents.append(
            {
                "documentId": required(manifest, "documentId"),
                "title": required(manifest, "title"),
                "sourceUrl": required(manifest, "sourceUrl"),
                "sourceSha256": required(manifest, "sourceSha256"),
                "sourceEffectStatus": required(manifest, "sourceEffectStatus"),
                "effectiveDate": manifest.get("effectiveFrom"),
                "snapshotPath": required(source_review, "sourceSnapshotReviewed"),
                "chunks": chunks,
            }
        )
    apply_law_134_article_33(documents)
    return {
        "version": version,
        "sourceManifest": {
            "reviewRequired": False,
            "reviewedArtifacts": [str(path) for path in manifest_paths],
        },
        "documents": documents,
    }


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
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
