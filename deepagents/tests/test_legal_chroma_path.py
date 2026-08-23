from pathlib import Path

from tools.legal.legal import chroma_path
from tools.legal.legal.chromadb_citation_retriever import ChromaDbCitationRetriever
from tools.legal.legal.chunk_integrity_repository import ChunkIntegrityRepository
from tools.legal.legal.engineering_rules.cache import EngineeringRuleCache
from tools.legal.legal.legal_chunk_repository import LegalChunkRepository
from tools.legal.legal.legal_retrieval_index_builder import (
    ChromaLegalIndexStore,
    LegalRetrievalIndexBuilder,
)


def test_default_legal_chroma_path_uses_project_root_chorma(
    monkeypatch, tmp_path: Path
):
    monkeypatch.delenv("LEGAL_CHROMA_PATH", raising=False)
    monkeypatch.setattr(chroma_path, "get_repo_root", lambda: str(tmp_path))

    assert chroma_path.default_legal_chroma_path() == tmp_path / ".chorma"
    assert ChromaDbCitationRetriever()._chroma_path == str(tmp_path / ".chorma")
    assert EngineeringRuleCache()._chroma_path == str(tmp_path / ".chorma")

    builder = LegalRetrievalIndexBuilder(
        storage_root=tmp_path / "storage",
        chunk_repository=LegalChunkRepository(storage_root=tmp_path / "storage"),
        integrity_repository=ChunkIntegrityRepository(storage_root=tmp_path / "storage"),
    )

    assert isinstance(builder._index_store, ChromaLegalIndexStore)
    assert builder._index_store._chroma_path == tmp_path / ".chorma"


def test_legal_chroma_path_env_override_remains_repo_relative(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("LEGAL_CHROMA_PATH", "tmp/custom-chroma")
    monkeypatch.setattr(chroma_path, "get_repo_root", lambda: str(tmp_path))

    assert chroma_path.default_legal_chroma_path() == tmp_path / "tmp/custom-chroma"
