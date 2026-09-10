from __future__ import annotations

import sys
import types
from types import SimpleNamespace
from typing import Any

from orchestration.context import LCSPRunContext
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_LIMITATION_CODES,
)
from tools.common.capabilities.assessment.investigation.engineering_rule import (
    managed_targeted_investigator as managed,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.managed_investigator_execution_store import (
    MANAGED_INVESTIGATOR_EXECUTION_STATUSES,
)
from tools.common.capabilities.workflow.recovery.interview_boundary import (
    AssessmentInterviewResumeBoundary,
)


ARTIFACT_PINS = {
    "technicalEvidenceReportId": "ter-recovery-1",
    "repositorySnapshotId": "snapshot-recovery-1",
    "legalRuleCatalogVersionId": "catalog-recovery-1",
    "legalCorpusVersionId": "corpus-recovery-1",
}


def _program_graph() -> dict[str, Any]:
    return {
        "graph_id": "graph-recovery-1",
        "snapshot_id": ARTIFACT_PINS["repositorySnapshotId"],
        "commit_sha": "abc123",
        "nodes": [
            {
                "node_id": "node:ai",
                "node_type": "AI_MODEL_INVOCATION",
                "label": "responses.create",
                "source": {},
                "attributes": {},
                "semantic_types": [],
                "evidence_refs": ["EV-RECOVERY-1"],
                "origin": "STATIC_ANALYSIS",
                "resolution_state": "CORROBORATED",
                "support_refs": [],
            }
        ],
        "edges": [],
        "source_anchors": [],
        "evidence_refs": ["EV-RECOVERY-1"],
        "graph_hash": "sha256:recovery-graph",
    }


def _broken_handoff() -> dict[str, Any]:
    return {
        "status": "READY",
        "artifact_versions": dict(ARTIFACT_PINS),
        "claims": [
            {
                "claim_id": "claim-broken",
                "engineering_rule_id": "ENG-RECOVERY-1",
                "claim_type": "RULE_REQUIREMENT_MET",
                "value": True,
                "evidence_refs": [],
                "graph_path_refs": [],
                "source_anchor_refs": [],
                "confidence": 0.9,
                "limitations": [],
                "criterion": "AI invocation evidence exists",
            }
        ],
        "limitations": [],
        "missing_input": None,
        "business_context_need": None,
        "next_step": "GATE",
    }


def _valid_handoff() -> dict[str, Any]:
    result = _broken_handoff()
    result["claims"][0].update(
        {
            "claim_type": "UNRESOLVED_ENGINEERING_FACT",
            "value": None,
            "evidence_refs": ["EV-RECOVERY-1"],
            "limitations": [
                ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"]
            ],
        }
    )
    return result


def _context() -> LCSPRunContext:
    return LCSPRunContext(
        assessment_id="assessment-recovery-1",
        user_id="customer-recovery-1",
        workflow_run_id="investigator:exec-recovery-1",
        artifact_versions=dict(ARTIFACT_PINS),
        engineering_rule_ids=("ENG-RECOVERY-1",),
        idempotency_key="resume:exec-recovery-1:2",
    )


class _FakeCheckpointer:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def setup(self) -> None:
        return None


class _FakePostgresSaver:
    @classmethod
    def from_conn_string(cls, _checkpoint_url: str) -> _FakeCheckpointer:
        return _FakeCheckpointer()


def _install_fake_postgres_saver(monkeypatch) -> None:
    postgres = types.ModuleType("langgraph.checkpoint.postgres")
    postgres.PostgresSaver = _FakePostgresSaver
    checkpoint = types.ModuleType("langgraph.checkpoint")
    checkpoint.postgres = postgres
    langgraph = types.ModuleType("langgraph")
    langgraph.checkpoint = checkpoint
    monkeypatch.setitem(sys.modules, "langgraph", langgraph)
    monkeypatch.setitem(sys.modules, "langgraph.checkpoint", checkpoint)
    monkeypatch.setitem(sys.modules, "langgraph.checkpoint.postgres", postgres)


class _FakeStore:
    records: dict[str, SimpleNamespace] = {}
    saves: list[dict[str, Any]] = []

    def __init__(self, _database_url: str) -> None:
        return None

    def get(self, execution_id: str):
        return self.records.get(execution_id)

    def save(self, **kwargs):
        self.saves.append(dict(kwargs))
        record = SimpleNamespace(**kwargs)
        self.records[kwargs["execution_id"]] = record
        return record


class _RetryAgent:
    def __init__(self) -> None:
        self.invoke_calls: list[tuple[dict[str, Any], dict[str, Any]]] = []
        self._checkpoint_id = "checkpoint-broken"
        self._structured_response = _broken_handoff()

    def get_state(self, _config):
        return SimpleNamespace(
            config={"configurable": {"checkpoint_id": self._checkpoint_id}},
            values={"structured_response": self._structured_response},
        )

    def invoke(self, payload, config=None, context=None):
        self.invoke_calls.append((payload, config or {}))
        assert context is not None
        self._checkpoint_id = "checkpoint-repaired"
        self._structured_response = _valid_handoff()
        return {"structured_response": self._structured_response}


class _AlwaysBrokenAgent(_RetryAgent):
    def invoke(self, payload, config=None, context=None):  # pragma: no cover - must not run
        raise AssertionError("threshold recovery must not invoke the model again")


def _seed_store(*, status: str, attempt_count: int) -> None:
    _FakeStore.records = {
        "exec-recovery-1": SimpleNamespace(
            execution_id="exec-recovery-1",
            assessment_id="assessment-recovery-1",
            thread_id="investigator:exec-recovery-1",
            checkpoint_id="checkpoint-original",
            affected_rule_ids=("ENG-RECOVERY-1",),
            artifact_versions=dict(ARTIFACT_PINS),
            status=status,
            attempt_count=attempt_count,
            last_error=None,
        )
    }
    _FakeStore.saves = []


def test_broken_stored_resume_handoff_is_rejected_then_model_retried_once(monkeypatch) -> None:
    _install_fake_postgres_saver(monkeypatch)
    _seed_store(
        status=MANAGED_INVESTIGATOR_EXECUTION_STATUSES["waiting"],
        attempt_count=0,
    )
    agent = _RetryAgent()
    monkeypatch.setattr(managed, "ManagedInvestigatorExecutionStore", _FakeStore)
    monkeypatch.setattr(managed, "_durable_investigator_agent", lambda _checkpointer: agent)

    handoff, checkpoint_id = managed._invoke_managed_investigator(
        checkpoint_url="postgresql://recovery-test",
        thread_id="investigator:exec-recovery-1",
        checkpoint_id="checkpoint-original",
        context=_context(),
        instruction="Resume after targeted Interview.",
        graph=_program_graph(),
        execution_id="exec-recovery-1",
        correlation_id="corr-recovery-1",
    )

    assert checkpoint_id == "checkpoint-repaired"
    assert handoff["status"] == "READY"
    assert len(agent.invoke_calls) == 1
    payload, config = agent.invoke_calls[0]
    assert "failed schema validation" in payload["messages"][0]["content"]
    assert config["configurable"]["checkpoint_id"] == "checkpoint-original"
    assert [save["status"] for save in _FakeStore.saves] == [
        MANAGED_INVESTIGATOR_EXECUTION_STATUSES["rejected"],
        MANAGED_INVESTIGATOR_EXECUTION_STATUSES["ready"],
    ]


def test_rejected_resume_threshold_fails_registry_and_passes_limitation_to_completion(
    monkeypatch,
) -> None:
    _install_fake_postgres_saver(monkeypatch)
    _seed_store(
        status=MANAGED_INVESTIGATOR_EXECUTION_STATUSES["rejected"],
        attempt_count=1,
    )
    agent = _AlwaysBrokenAgent()
    monkeypatch.setattr(managed, "ManagedInvestigatorExecutionStore", _FakeStore)
    monkeypatch.setattr(managed, "_durable_investigator_agent", lambda _checkpointer: agent)

    handoff, checkpoint_id = managed._invoke_managed_investigator(
        checkpoint_url="postgresql://recovery-test",
        thread_id="investigator:exec-recovery-1",
        checkpoint_id="checkpoint-original",
        context=_context(),
        instruction="Resume after targeted Interview.",
        graph=_program_graph(),
        execution_id="exec-recovery-1",
        correlation_id="corr-recovery-2",
    )

    assert checkpoint_id == "checkpoint-original"
    assert handoff["claims"][0]["claim_id"] == "claim:failed:ENG-RECOVERY-1"
    assert handoff["claims"][0]["limitations"] == [
        ENGINEERING_LIMITATION_CODES["engineering_investigation_failed"]
    ]
    assert _FakeStore.saves[-1]["status"] == MANAGED_INVESTIGATOR_EXECUTION_STATUSES[
        "failed"
    ]
    assert _FakeStore.saves[-1]["attempt_count"] == 2

    completion_calls: list[dict[str, Any]] = []
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        api_client=SimpleNamespace(),
        investigator_resumer=lambda **_kwargs: {
            "executionId": "exec-recovery-1",
            "threadId": "investigator:exec-recovery-1",
            "fromCheckpointId": "checkpoint-original",
            "checkpointId": "checkpoint-original",
            "handoff": handoff,
        },
        investigation_completer=lambda **kwargs: completion_calls.append(kwargs),
    )
    boundary._resume_exact_investigator(
        assessment_id="assessment-recovery-1",
        context_revision=2,
        continuation={
            "investigatorExecutionId": "exec-recovery-1",
            "workflowRunId": "investigator:exec-recovery-1",
            "checkpointId": "checkpoint-original",
        },
        confirmed_context=SimpleNamespace(),
        correlationId="corr-recovery-2",
    )

    assert completion_calls[0]["resumed_handoff"]["claims"][0]["limitations"] == [
        ENGINEERING_LIMITATION_CODES["engineering_investigation_failed"]
    ]
