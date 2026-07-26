from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class RetrievedChunk:
    id: str
    document_id: str
    locator: str
    legal_status: str
    role: str


class ChromaDbCitationRetriever:
    """Citation-only retrieval for rules already determined to apply."""

    def build_citation_allowlist(self, chunks: list[RetrievedChunk]) -> dict[str, Any]:
        allowlist = []
        repealed_chunk_ids = []
        for chunk in chunks:
            if chunk.legal_status == "REPEALED":
                repealed_chunk_ids.append(chunk.id)
                continue
            allowlist.append(chunk.id)
        return {
            "allowlist": allowlist,
            "repealed_chunk_ids": repealed_chunk_ids,
        }
