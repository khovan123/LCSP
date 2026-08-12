#!/usr/bin/env python3
"""Validate a deterministic legal retrieval index against the approved probe set."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lcsp_workers.legal.legal_chunk_repository import LegalChunkRepository
from lcsp_workers.legal.legal_retrieval_index_repository import (
    LegalRetrievalIndexRepository,
)
from lcsp_workers.legal.retrieval_index_validator import (
    RetrievalIndexValidator,
    ValidateRetrievalIndexRequest,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--storage-root", required=True, type=Path)
    parser.add_argument("--index-ref", required=True)
    parser.add_argument("--chunk-set-ref", required=True)
    parser.add_argument("--probe-set-version", required=True)
    parser.add_argument("--correlation-id", default="local-cli")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validator = RetrievalIndexValidator(
        storage_root=args.storage_root,
        index_repository=LegalRetrievalIndexRepository(storage_root=args.storage_root),
        chunk_repository=LegalChunkRepository(storage_root=args.storage_root),
    )
    result = validator.validate(
        ValidateRetrievalIndexRequest(
            index_ref=args.index_ref,
            chunk_set_ref=args.chunk_set_ref,
            probe_set_version=args.probe_set_version,
        )
    )
    print(
        json.dumps(
            result.to_tool_response(correlation_id=args.correlation_id),
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
