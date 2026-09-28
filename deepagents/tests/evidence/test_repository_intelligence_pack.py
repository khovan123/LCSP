from __future__ import annotations

import json
import re
import types

from tools.common.capabilities.evidence.repository_analysis.intelligence_pack import (
    FORBIDDEN_PACK_KEYS,
    REPOSITORY_INTELLIGENCE_PACK_KEY,
    build_repository_intelligence_pack,
    repository_intelligence_pack_from_evidence,
)
from tools.common.capabilities.platform.codebase_memory import (
    CodebaseMemoryGraphReader,
    CodebaseMemoryIndexIdentity,
)

# Mirrors apps/api EvidenceSchemaValidatorService: evidence whose strings look
# like source bodies is rejected for the whole callback.
SOURCE_BODY_PATTERN = re.compile(
    r"(?:\bdef\s+\w+\s*\(|\bfunction\s+\w*\s*\(|\bclass\s+\w+|\bimport\s+[\w{*])"
)

_ROWS = """results: 3  (cols: qn label file lines in out)
  workspace-repository.apps.api.src.review.HumanReviewGate Class apps/api/src/review/gate.ts 5-60 1 0
  workspace-repository.apps.api.src.ai.OpenAiClient Class apps/api/src/ai/openai.client.ts 5-25 2 0
  workspace-repository.docs.notes.RiskNotes Class docs/notes.md 1-4 0 0
total: 3
"""


def _evidence_payload() -> dict:
    return {
        "summary": "Repository exposes an AI classification path.",
        "languages": ["TypeScript", "Python"],
        "frameworks": ["NestJS"],
        "technicalCoverageState": "READY",
        "coverageLimitations": ["Generated clients were excluded from analysis"],
        "evidence_graph": {
            "nodes": [
                {
                    "node_id": "node:ai:1",
                    "node_type": "AI_SUBSYSTEM",
                    "label": "risk classifier",
                    "semantic_types": ["AI_MODEL_INVOCATION"],
                    "source": {
                        "file_path": "apps/api/src/risk/classifier.ts",
                        "start_line": 10,
                        "end_line": 40,
                        "symbol_ref": "RiskClassifier.classify",
                    },
                },
                {"node_id": "node:x", "node_type": "SERVICE", "label": "unanchored"},
            ],
            "source_anchors": [
                {
                    "anchor_id": "anchor:1",
                    "file_path": "apps/api/src/risk/classifier.ts",
                    "start_line": 10,
                    "end_line": 40,
                    "symbol_ref": "RiskClassifier.classify",
                    "source_hash": "sha256:abc",
                }
            ],
            "unresolved_frontiers": ["dynamic dispatch in worker"],
        },
        "ai_discovery": {
            "gate": "AI_CONFIRMED",
            "coverage_state": "READY",
            "findings": [
                {
                    "kind": "SDK_INVOCATION",
                    "snippet_ref": {
                        "file_path": "apps/api/src/ai/openai.client.ts",
                        "start_line": 5,
                        "end_line": 25,
                        "symbol": "callModel",
                    },
                }
            ],
            "material_unresolved_frontiers": [],
        },
    }


def _reader(rows: str, calls: list[str] | None = None) -> CodebaseMemoryGraphReader:
    def execute(command: str, timeout=None):
        if calls is not None:
            calls.append(command)
        return types.SimpleNamespace(output=rows, exit_code=0)

    return CodebaseMemoryGraphReader(execute)


def _pack(
    calls: list[str] | None = None,
    index: CodebaseMemoryIndexIdentity | None = None,
) -> dict:
    return build_repository_intelligence_pack(
        evidence_payload=_evidence_payload(),
        assessment_id="assessment-1",
        snapshot_id="snapshot-1",
        commit_sha="c0ffee",
        scan_job_id="scan-1",
        scanner_version="1.0.0",
        index=index
        or CodebaseMemoryIndexIdentity("workspace-repository", "sha256:stamp", True),
        graph_reader=_reader(_ROWS, calls),
    )


def test_accepted_evidence_carries_a_pack_with_identity_and_seed_locations() -> None:
    payload = _evidence_payload()
    payload[REPOSITORY_INTELLIGENCE_PACK_KEY] = _pack()

    pack = repository_intelligence_pack_from_evidence({"evidence_payload": payload})

    assert pack is not None
    assert pack["identity"]["assessmentId"] == "assessment-1"
    assert pack["identity"]["commitSha"] == "c0ffee"
    assert pack["identity"]["scannerVersion"] == "1.0.0"
    assert pack["artifactVersion"].startswith("sha256:")
    # The Scanner's own findings become seeds the Investigator can open directly.
    paths = {seed["path"] for seed in pack["seedLocations"]}
    assert "apps/api/src/risk/classifier.ts" in paths
    assert "apps/api/src/ai/openai.client.ts" in paths
    assert pack["sourceAnchors"][0]["anchorId"] == "anchor:1"
    # Index-derived locations are grouped by domain; documentation is excluded.
    assert any(
        item["path"] == "apps/api/src/review/gate.ts"
        for item in pack["domainModules"]["humanReview"]
    )
    assert all(
        not item["path"].endswith(".md")
        for items in pack["domainModules"].values()
        for item in items
    )


def test_reused_index_metadata_is_recorded() -> None:
    reused = _pack(
        index=CodebaseMemoryIndexIdentity("workspace-repository", "sha256:s", True)
    )
    fresh = _pack(
        index=CodebaseMemoryIndexIdentity("workspace-repository", "sha256:s", False)
    )

    assert reused["identity"]["codebaseMemoryIndexReused"] is True
    assert fresh["identity"]["codebaseMemoryIndexReused"] is False
    assert reused["identity"]["codebaseMemoryIndexStamp"] == "sha256:s"


def test_coverage_gaps_are_preserved_and_downgrade_global_state() -> None:
    coverage = _pack()["coverageState"]

    assert coverage["aiDiscovery"] == "READY"
    assert (
        "Generated clients were excluded from analysis"
        in coverage["sourceCoverageGaps"]
    )
    assert coverage["excludedOrGeneratedAreas"] == [
        "Generated clients were excluded from analysis"
    ]
    assert "dynamic dispatch in worker" in coverage["unresolvedFrontiers"]
    # One scanner node has no source location, so the pack is not fully READY.
    assert coverage["graphCoverageGaps"]
    assert coverage["global"] == "PARTIAL"


def test_missing_index_is_a_recorded_limitation_not_a_crash() -> None:
    pack = build_repository_intelligence_pack(
        evidence_payload=_evidence_payload(),
        assessment_id="assessment-1",
        snapshot_id="snapshot-1",
        commit_sha="c0ffee",
        scan_job_id="scan-1",
        scanner_version="1.0.0",
        index=None,
        graph_reader=None,
    )

    assert "CODEBASE_MEMORY_INDEX_UNAVAILABLE" in pack["limitations"]
    assert pack["coverageState"]["global"] == "PARTIAL"
    # Scanner-graph seeds still work without the index.
    assert pack["seedLocations"]


def test_pack_stays_within_a_few_bounded_index_queries() -> None:
    calls: list[str] = []
    _pack(calls)

    # One route query plus one per code label: each CLI call costs seconds.
    assert len(calls) == 4
    assert all("search_graph" in call for call in calls)


def test_pack_never_stores_source_text_secrets_or_forbidden_keys() -> None:
    payload = _evidence_payload()
    payload["coverageLimitations"] = ["def leaked(self):\n    return SECRET"]

    pack = build_repository_intelligence_pack(
        evidence_payload=payload,
        assessment_id="a",
        snapshot_id="s",
        commit_sha="c",
        scan_job_id="j",
        scanner_version="1.0.0",
        index=CodebaseMemoryIndexIdentity("workspace-repository", "sha256:s", True),
        graph_reader=_reader(_ROWS),
    )

    def walk(value, path: str = "") -> None:
        if isinstance(value, str):
            assert not ("\n" in value and SOURCE_BODY_PATTERN.search(value)), path
        elif isinstance(value, dict):
            for key, entry in value.items():
                assert (
                    re.sub(r"[^A-Za-z0-9]", "", key).lower() not in FORBIDDEN_PACK_KEYS
                ), path
                walk(entry, f"{path}.{key}")
        elif isinstance(value, list):
            for index, entry in enumerate(value):
                walk(entry, f"{path}[{index}]")

    walk(pack)
    assert json.dumps(pack)
