from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"expected snippet not found in {path}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


write(
    "deepagents/tests/test_assessment_interview_resume_boundary.py",
    '''from types import SimpleNamespace

import pytest

from tools.common.capabilities.managed.invocation import invocation_boundary_manifest
from tools.common.capabilities.workflow.recovery.interview_boundary import (
    AssessmentInterviewResumeBoundary,
    INTERVIEW_RESUME_COMMAND,
)


WAITING_HANDOFF = {
    "expectedContextRevision": 0,
    "mode": "INITIAL_INTERVIEW",
    "outcome": "WAITING_FOR_CUSTOMER",
    "activeQuestion": {
        "id": "agent-question-next",
        "intent": "ASK",
        "control": "FREE_TEXT",
        "prompt": "Please provide the missing business context.",
    },
    "contextAuthority": "CUSTOMER_STATED",
    "confirmedContext": {},
    "flags": [],
    "blockedActions": [],
    "targetedResolution": {},
}


class RecordingRoot:
    def __init__(self, result=None, order=None) -> None:
        self.calls = []
        self._result = result or {"status": "ROOT_REENTERED"}
        self._order = order

    def invoke(self, payload, config=None):
        if self._order is not None:
            self._order.append("root")
        self.calls.append((payload, config))
        return self._result


class RecordingDispatcher:
    def __init__(self, handoff=None, order=None) -> None:
        self.calls = []
        self._handoff = handoff or WAITING_HANDOFF
        self._order = order

    def dispatch(self, **kwargs):
        if self._order is not None:
            self._order.append("interview")
        self.calls.append(kwargs)
        return {"status": "COMPLETED", "handoff": dict(self._handoff)}


class RecordingApi:
    def __init__(self, status="CURRENT", order=None) -> None:
        self.status = status
        self.private_context_calls = []
        self.decision_posts = []
        self._order = order

    def get_interview_private_context(
        self,
        assessment_id,
        context_revision,
        *,
        source_version=None,
        pge_version=None,
    ):
        self.private_context_calls.append(
            (assessment_id, context_revision, source_version, pge_version)
        )
        return {
            "status": self.status,
            "publicState": {
                "outcome": "WAITING_FOR_CUSTOMER",
                "contextRevision": context_revision,
            },
            "privateRevision": {"answer": {"freeText": "raw"}},
        }

    def post_interview_agent_decision(self, assessment_id, payload):
        if self._order is not None:
            self._order.append("guard")
        self.decision_posts.append((assessment_id, payload))
        return {"outcome": payload.get("outcome")}


def _message(*, reason="INTERVIEW_AGENT_DECISION_REQUIRED", revision=2):
    return {
        "assessmentId": "assessment-1",
        "threadId": "interview:assessment-1",
        "questionId": "agent-question-1",
        "contextRevision": revision,
        "sourceVersion": "snapshot-1:abc",
        "pgeVersion": "ter-1:v1",
        "resumeReason": reason,
    }


def test_interview_resume_command_is_managed_boundary() -> None:
    manifest = invocation_boundary_manifest()

    entry = next(
        item for item in manifest if item["name"] == "assessment_interview_resume_requested"
    )
    assert entry["source_event"] == INTERVIEW_RESUME_COMMAND
    assert entry["target"].endswith("AssessmentInterviewResumeBoundary")


def test_interview_resume_boundary_passes_private_context_only_to_interview_and_persists_waiting() -> None:
    api = RecordingApi()
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
        api_client=api,
        dispatcher=dispatcher,
    )

    boundary.handle(_message(), "corr-1")

    assert api.private_context_calls == [
        ("assessment-1", 2, "snapshot-1:abc", "ter-1:v1")
    ]
    assert len(dispatcher.calls) == 1
    instruction = dispatcher.calls[0]["instruction"]
    assert '"freeText": "raw"' in instruction
    assert "Do not expose private raw Customer content to Root" in instruction
    assert root.calls == []
    assert len(api.decision_posts) == 1
    assessment_id, decision = api.decision_posts[0]
    assert assessment_id == "assessment-1"
    assert decision["expectedContextRevision"] == 2
    assert decision["outcome"] == "WAITING_FOR_CUSTOMER"
    assert decision["activeQuestion"]["id"] == "agent-question-next"


def test_guard_persists_before_any_downstream_continuation() -> None:
    order = []
    ready = {
        "expectedContextRevision": 0,
        "mode": "INITIAL_INTERVIEW",
        "outcome": "CONTEXT_READY",
        "contextAuthority": "CUSTOMER_CONFIRMED",
        "confirmedContext": {"decision_authority": "human"},
        "flags": [],
        "blockedActions": [],
        "targetedResolution": {},
    }
    api = RecordingApi(order=order)
    dispatcher = RecordingDispatcher(ready, order=order)
    downstream_calls = []

    def downstream(payload, correlation_id):
        order.append("downstream")
        downstream_calls.append((payload, correlation_id))

    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        api_client=api,
        dispatcher=dispatcher,
        downstream_handler=downstream,
    )

    boundary.handle(_message(), "corr-1")

    assert order == ["interview", "guard", "downstream"]
    assert downstream_calls[0][0]["outcome"] == "CONTEXT_READY"


def test_interview_resume_boundary_duplicate_delivery_is_idempotent() -> None:
    api = RecordingApi(status="DUPLICATE")
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api, dispatcher=dispatcher
    )

    boundary.handle(_message(), "corr-1")

    assert dispatcher.calls == []
    assert root.calls == []
    assert api.decision_posts == []


def test_interview_resume_boundary_stale_provenance_reenters_root_revalidation() -> None:
    api = RecordingApi(status="STALE_PROVENANCE")
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api, dispatcher=RecordingDispatcher()
    )

    boundary.handle(_message(), "corr-1")

    assert len(root.calls) == 1
    prompt = root.calls[0][0]["messages"][0]["content"]
    assert "stale against current source/PGE provenance" in prompt
    assert root.calls[0][1]["metadata"]["trigger"] == "ASSESSMENT_INTERVIEW_REVALIDATION_REQUIRED"
    assert api.decision_posts == []


def test_provide_more_context_persists_next_interview_question() -> None:
    api = RecordingApi(status="DUPLICATE")
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
        api_client=api,
        dispatcher=dispatcher,
    )

    boundary.handle(
        _message(reason="PROVIDE_MORE_CONTEXT", revision=0),
        "corr-1",
    )

    assert api.private_context_calls == [
        ("assessment-1", 0, "snapshot-1:abc", "ter-1:v1")
    ]
    assert len(dispatcher.calls) == 1
    assert dispatcher.calls[0]["trigger"] == "PROVIDE_MORE_CONTEXT"
    assert len(api.decision_posts) == 1
    assert api.decision_posts[0][1]["outcome"] == "WAITING_FOR_CUSTOMER"
    assert root.calls == []


def test_interview_resume_boundary_rejects_missing_revision() -> None:
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=RecordingRoot(),
        api_client=RecordingApi(),
        dispatcher=RecordingDispatcher(),
    )

    with pytest.raises(ValueError, match="contextRevision"):
        message = _message()
        message.pop("contextRevision")
        boundary.handle(message, "corr-1")
''',
)

replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    "    FLOW_SUBAGENTS,\n    INVESTIGATOR_TOOLS,",
    "    FLOW_SUBAGENTS,\n    INTERVIEW_TOOLS,\n    INVESTIGATOR_TOOLS,",
)
replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    "    assert _names(TRIAGE_TOOLS) == TRIAGE_TOOL_NAMES\n    assert _names(PLANNER_TOOLS)",
    "    assert _names(TRIAGE_TOOLS) == TRIAGE_TOOL_NAMES\n    assert _names(INTERVIEW_TOOLS) == ()\n    assert _names(PLANNER_TOOLS)",
)
replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    '''    assert tuple(by_name) == (\n        "triage",\n        "planner",\n        "investigator",\n    )''',
    '''    assert tuple(by_name) == (\n        "triage",\n        "interview",\n        "planner",\n        "investigator",\n    )''',
)
replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    '''    assert _names(by_name["triage"]["tools"]) == TRIAGE_TOOL_NAMES\n    for role in ("planner", "investigator")''',
    '''    assert _names(by_name["triage"]["tools"]) == TRIAGE_TOOL_NAMES\n    assert _names(by_name["interview"]["tools"]) == ()\n    for role in ("planner", "investigator")''',
)
replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    '''    assert _directory_names(subagents_root) == {\n        "triage",\n        "planner",\n        "investigator",\n    }''',
    '''    assert _directory_names(subagents_root) == {\n        "triage",\n        "interview",\n        "planner",\n        "investigator",\n    }''',
)
replace(
    "deepagents/tests/test_deep_agent_flow_boundaries.py",
    '    for role in ("triage", "planner", "investigator"):',
    '    for role in ("triage", "interview", "planner", "investigator"): ',
)

replace(
    "apps/api/test/assessment-interview.e2e-spec.ts",
    '''const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";\n\ndescribe''',
    '''const WORKER_KEY = "test-only-worker-api-key-at-least-32-chars";\n\nfunction jsonRecord(value: unknown): Record<string, unknown> {\n  if (value === null || typeof value !== "object" || Array.isArray(value)) {\n    return {};\n  }\n  return value as Record<string, unknown>;\n}\n\ndescribe''',
)
replace(
    "apps/api/test/assessment-interview.e2e-spec.ts",
    '''    const privateRevision = await httpRequest(app)\n      .get("/internal/assessment-interviews/assessment-1/private-context/1")\n      .query({\n        source_version: JSON.parse(JSON.stringify(resumeCommand.payload))\n          .sourceVersion,\n        pge_version: JSON.parse(JSON.stringify(resumeCommand.payload))\n          .pgeVersion,\n      })''',
    '''    const resumePayload = jsonRecord(resumeCommand.payload);\n    const privateRevision = await httpRequest(app)\n      .get("/internal/assessment-interviews/assessment-1/private-context/1")\n      .query({\n        source_version:\n          typeof resumePayload.sourceVersion === "string"\n            ? resumePayload.sourceVersion\n            : undefined,\n        pge_version:\n          typeof resumePayload.pgeVersion === "string"\n            ? resumePayload.pgeVersion\n            : undefined,\n      })''',
)
replace(
    "apps/api/test/assessment-interview.e2e-spec.ts",
    '''    assert.equal(\n      JSON.parse(JSON.stringify(thread.privateContextJson)).length,\n      1,\n    );''',
    '''    assert.equal(\n      Array.isArray(thread.privateContextJson)\n        ? thread.privateContextJson.length\n        : 0,\n      1,\n    );''',
)

replace(
    "apps/api/src/modules/assessment/application/services/assessment-interview-runtime.service.ts",
    '''    confirmedContext: undefined,\n    pendingDraft: state.pendingDraft\n      ? PUBLIC_REDACTED_DRAFT_SUMMARY\n      : undefined,''',
    '''    confirmedContext: undefined,\n    pendingDraft: state.pendingDraft,''',
)

replace(
    "apps/api/src/modules/assessment/presentation/http/assessment.controller.ts",
    '''  @Get(":assessmentId/private-context/:contextRevision")''',
    '''  @Get(":assessmentId/state")\n  async getWorkerState(@Param("assessmentId") assessmentId: string) {\n    return resultEnvelope(\n      await this.interviewRuntime.getWorkerStateForWorker(assessmentId),\n    );\n  }\n\n  @Get(":assessmentId/private-context/:contextRevision")''',
)

write(
    "deepagents/tools/common/capabilities/assessment/investigation/engineering_rule/interview_gated_boundary.py",
    '''"""Gate accepted PGE evidence through Initial Interview before EngineeringRule work."""

from __future__ import annotations

import json
from typing import Any

from orchestration.dispatcher import RootSubagentDispatcher

from .engineering_assessment_boundary import EngineeringAssessmentBoundary


_TERMINAL_WAITING_OUTCOMES = {
    "WAITING_FOR_CUSTOMER",
    "BLOCKED_OR_UNRESOLVED",
    "FAILED",
}


class _ConfirmedContextPipeline:
    """Inject only server-guarded confirmed Customer context into the existing pipeline."""

    def __init__(self, delegate: Any, confirmed_context: dict[str, Any]) -> None:
        self._delegate = delegate
        self._confirmed_context = dict(confirmed_context)

    def run(self, *args: Any, **kwargs: Any) -> Any:
        kwargs["confirmed_customer_context"] = dict(self._confirmed_context)
        return self._delegate.run(*args, **kwargs)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._delegate, name)


class InterviewGatedEngineeringAssessmentBoundary(EngineeringAssessmentBoundary):
    """Production accepted-evidence boundary with decision-before-downstream Interview gating."""

    def __init__(self, *args: Any, interview_dispatcher: Any | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._interview_dispatcher = interview_dispatcher

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        evidence_report_id = self._evidence_report_id(message)
        evidence_report = self._api_client.get_accepted_technical_evidence_report(
            evidence_report_id
        )
        assessment_id = str(
            evidence_report.get("assessment_id")
            or evidence_report.get("assessmentId")
            or message.get("assessmentId")
            or message.get("assessment_id")
            or ""
        )
        if not assessment_id:
            raise ValueError("accepted evidence report is missing assessment_id")

        confirmed_context = self._prepare_interview(
            evidence_report=evidence_report,
            evidence_report_id=evidence_report_id,
            assessment_id=assessment_id,
            correlation_id=correlationId,
        )
        if confirmed_context is None:
            return

        original_pipeline = self._pipeline
        self._pipeline = _ConfirmedContextPipeline(original_pipeline, confirmed_context)
        try:
            super().handle(message, correlationId)
        finally:
            self._pipeline = original_pipeline

    def _prepare_interview(
        self,
        *,
        evidence_report: dict[str, Any],
        evidence_report_id: str,
        assessment_id: str,
        correlation_id: str,
    ) -> dict[str, Any] | None:
        state = self._api_client.get_interview_worker_state(assessment_id)
        outcome = str(state.get("outcome") or "")
        context_revision = int(state.get("contextRevision") or 0)
        active_question = state.get("activeQuestion")

        if outcome == "CONTEXT_READY":
            confirmed = state.get("confirmedContext")
            return dict(confirmed) if isinstance(confirmed, dict) else {}

        if outcome in _TERMINAL_WAITING_OUTCOMES and (
            active_question is not None or context_revision > 0 or outcome != "WAITING_FOR_CUSTOMER"
        ):
            return None

        if outcome != "WAITING_FOR_CUSTOMER" or context_revision != 0:
            return None

        dispatcher = self._interview_dispatcher or RootSubagentDispatcher(
            self._config,
            api_client=self._api_client,
        )
        result = dispatcher.dispatch(
            subagent_type="interview",
            instruction=_initial_interview_instruction(
                assessment_id=assessment_id,
                evidence_report_id=evidence_report_id,
                evidence_report=evidence_report,
            ),
            idempotency_key=f"assessment-interview-initial:{assessment_id}:{evidence_report_id}",
            trigger="TECHNICAL_EVIDENCE_ACCEPTED",
            metadata={
                "assessment_id": assessment_id,
                "technical_evidence_report_id": evidence_report_id,
                "correlationId": correlation_id,
            },
            thread_id=f"interview:{assessment_id}",
            reenter_root=False,
        )
        handoff = result.get("handoff") if isinstance(result, dict) else None
        if not isinstance(handoff, dict):
            raise ValueError("Initial Interview specialist did not return a validated handoff")
        if handoff.get("outcome") != "WAITING_FOR_CUSTOMER" or not isinstance(
            handoff.get("activeQuestion"), dict
        ):
            raise ValueError(
                "Initial Interview must persist a Customer question before EngineeringRule work"
            )
        handoff["expectedContextRevision"] = 0
        self._api_client.post_interview_initial_question(assessment_id, handoff)
        return None


def _initial_interview_instruction(
    *,
    assessment_id: str,
    evidence_report_id: str,
    evidence_report: dict[str, Any],
) -> str:
    payload = evidence_report.get("evidence_payload") or evidence_report.get("evidencePayload")
    graph = payload.get("evidence_graph") if isinstance(payload, dict) else None
    coverage_state = "UNKNOWN"
    coverage_notes: list[str] = []
    if isinstance(graph, dict):
        coverage_state = str(graph.get("coverage_state") or graph.get("coverageState") or "UNKNOWN")
        raw_notes = graph.get("coverage_notes") or graph.get("coverageNotes") or []
        if isinstance(raw_notes, list):
            coverage_notes = [str(item)[:240] for item in raw_notes[:8]]
    safe_context = {
        "assessmentId": assessment_id,
        "technicalEvidenceReportId": evidence_report_id,
        "coverageState": coverage_state,
        "coverageNotes": coverage_notes,
        "snapshotId": evidence_report.get("snapshot_id") or evidence_report.get("snapshotId"),
        "schemaVersion": evidence_report.get("schema_version") or evidence_report.get("schemaVersion"),
    }
    return (
        "Run INITIAL_INTERVIEW before any EngineeringRule, Planner or Investigator work. "
        "Use only this bounded technical coverage/provenance summary to decide the first Customer question. "
        "Missing technical evidence is not proof that a business behavior does not exist. "
        "Do not infer Customer confirmation from PGE/documentary evidence. "
        "Return WAITING_FOR_CUSTOMER with exactly one bounded activeQuestion.\n"
        f"Bounded initial context: {json.dumps(safe_context, ensure_ascii=False, sort_keys=True)}"
    )


__all__ = ["InterviewGatedEngineeringAssessmentBoundary"]
''',
)

replace(
    "deepagents/tools/common/capabilities/managed/invocation.py",
    '''tools.common.capabilities.assessment.investigation.engineering_rule.engineering_assessment_boundary:EngineeringAssessmentBoundary''',
    '''tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary:InterviewGatedEngineeringAssessmentBoundary''',
)

replace(
    "deepagents/tools/common/capabilities/workflow/recovery/interview_boundary.py",
    '''        root = self._root_agent or self._load_root_agent()\n        root.invoke(''',
    '''        if outcome == "CONTEXT_READY":\n            evidence_report_id = pge_version.split(":", 1)[0].strip()\n            if not evidence_report_id:\n                raise ValueError("guarded CONTEXT_READY is missing technical evidence report provenance")\n            from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (\n                InterviewGatedEngineeringAssessmentBoundary,\n            )\n\n            InterviewGatedEngineeringAssessmentBoundary(\n                self._config,\n                api_client=self._api_client,\n            ).handle(\n                {\n                    "assessmentId": assessment_id,\n                    "evidenceReportId": evidence_report_id,\n                    "workflowRunId": thread_id,\n                },\n                correlationId,\n            )\n            return\n\n        root = self._root_agent or self._load_root_agent()\n        root.invoke(''',
)

write(
    "deepagents/tests/investigation/test_interview_gated_engineering_assessment_boundary.py",
    '''from __future__ import annotations

from types import SimpleNamespace

from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
    InterviewGatedEngineeringAssessmentBoundary,
)


class FakeApi:
    def __init__(self, state):
        self.state = state
        self.seeded = []

    def get_interview_worker_state(self, assessment_id):
        assert assessment_id == "assessment-1"
        return dict(self.state)

    def post_interview_initial_question(self, assessment_id, payload):
        self.seeded.append((assessment_id, payload))
        return payload


class FakeDispatcher:
    def __init__(self):
        self.calls = []

    def dispatch(self, **kwargs):
        self.calls.append(kwargs)
        return {
            "status": "COMPLETED",
            "handoff": {
                "expectedContextRevision": 0,
                "mode": "INITIAL_INTERVIEW",
                "outcome": "WAITING_FOR_CUSTOMER",
                "activeQuestion": {
                    "id": "question-1",
                    "intent": "ASK",
                    "control": "FREE_TEXT",
                    "prompt": "Who approves this business action?",
                },
                "confirmedContext": {},
                "flags": [],
                "blockedActions": [],
                "targetedResolution": {},
            },
        }


class NoopPipeline:
    def run(self, **kwargs):
        raise AssertionError("pipeline must not run during Initial Interview bootstrap")


class NoopWorkspace:
    def cleanup(self, _job_id):
        return None


def _boundary(api, dispatcher):
    return InterviewGatedEngineeringAssessmentBoundary(
        SimpleNamespace(),
        api_client=api,
        interview_dispatcher=dispatcher,
        investigation_pipeline=NoopPipeline(),
        snapshot_client=SimpleNamespace(),
        code_workspace=NoopWorkspace(),
        triage_trigger_publisher=lambda _payload: None,
    )


def _report():
    return {
        "assessment_id": "assessment-1",
        "snapshot_id": "snapshot-1",
        "schema_version": "2.0.0",
        "evidence_payload": {
            "evidence_graph": {
                "coverage_state": "PARTIAL",
                "coverage_notes": ["dynamic configuration not fully observed"],
            }
        },
    }


def test_initial_pge_event_bootstraps_interview_and_stops_before_pipeline() -> None:
    api = FakeApi(
        {
            "outcome": "WAITING_FOR_CUSTOMER",
            "contextRevision": 0,
            "answerHistory": [],
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    result = boundary._prepare_interview(
        evidence_report=_report(),
        evidence_report_id="ter-1",
        assessment_id="assessment-1",
        correlation_id="corr-1",
    )

    assert result is None
    assert len(dispatcher.calls) == 1
    instruction = dispatcher.calls[0]["instruction"]
    assert "INITIAL_INTERVIEW" in instruction
    assert "PARTIAL" in instruction
    assert "Missing technical evidence is not proof" in instruction
    assert api.seeded[0][0] == "assessment-1"
    assert api.seeded[0][1]["outcome"] == "WAITING_FOR_CUSTOMER"


def test_guarded_ready_state_is_the_only_initial_path_to_confirmed_context() -> None:
    api = FakeApi(
        {
            "outcome": "CONTEXT_READY",
            "contextRevision": 2,
            "confirmedContext": {"decision_authority": "human approval"},
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    result = boundary._prepare_interview(
        evidence_report=_report(),
        evidence_report_id="ter-1",
        assessment_id="assessment-1",
        correlation_id="corr-1",
    )

    assert result == {"decision_authority": "human approval"}
    assert dispatcher.calls == []
    assert api.seeded == []


def test_existing_waiting_question_never_reboots_initial_interview() -> None:
    api = FakeApi(
        {
            "outcome": "WAITING_FOR_CUSTOMER",
            "contextRevision": 0,
            "activeQuestion": {"id": "already-waiting"},
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    assert (
        boundary._prepare_interview(
            evidence_report=_report(),
            evidence_report_id="ter-1",
            assessment_id="assessment-1",
            correlation_id="corr-1",
        )
        is None
    )
    assert dispatcher.calls == []
    assert api.seeded == []
''',
)

print("PR #282 guarded interview patch applied")
