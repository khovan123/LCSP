from __future__ import annotations

import types

from middleware.agent_run_budget import AgentRunBudgetMiddleware
from middleware.tool_scope import AllowedToolsMiddleware
from subagents.interview.definition import SUBAGENT
from tools.common.capabilities.assessment.planning.engineering_rule.confirmed_business_context import (
    ConfirmedBusinessContextStatement,
    ConfirmedStructuredBusinessContext,
)
from tools.common.capabilities.assessment.planning.engineering_rule.confirmed_context_pack import (
    build_confirmed_context_pack,
    context_pack_identity,
)
from tools.common.capabilities.evidence.repository_analysis.intelligence_pack import (
    summarize_pack_for_interview,
)


def _statement(statement_id: str, topic: str, statement: str, value=None):
    return ConfirmedBusinessContextStatement(
        statement_id=statement_id,
        topic=topic,
        statement=statement,
        normalized_value=value,
        scope={},
        evidence_refs=("anchor:1",),
        respondent_ref="user-1",
        created_at="2026-09-28T00:00:00Z",
        supersedes_statement_id=None,
    )


def _context() -> ConfirmedStructuredBusinessContext:
    return ConfirmedStructuredBusinessContext(
        assessment_id="assessment-1",
        context_revision=4,
        statements=(
            _statement("s1", "human_review_policy", "A reviewer approves each result.", True),
            _statement("s2", "data_categories", "Customer organisation data only.", ["ORG"]),
            _statement("s3", "ai_capability_purpose", "Automated compliance analysis."),
            _statement("s4", "downstream_action", "Results inform a human decision.", False),
        ),
        limitations=("Coverage partial for generated clients",),
    )


def test_normal_interview_has_no_repository_discovery_tools() -> None:
    # Deep Agents attaches filesystem/shell/task tools to every subagent; the
    # Interview must not receive any of them.
    scope = next(
        item for item in SUBAGENT["middleware"] if isinstance(item, AllowedToolsMiddleware)
    )
    assert SUBAGENT["tools"] == []
    assert scope.allowed == frozenset()

    request = types.SimpleNamespace(
        tools=[
            types.SimpleNamespace(name="read_file"),
            types.SimpleNamespace(name="grep"),
            types.SimpleNamespace(name="execute"),
            types.SimpleNamespace(name="task"),
            types.SimpleNamespace(name="search_code_graph"),
        ],
        override=lambda **kwargs: types.SimpleNamespace(**kwargs),
    )
    scoped = scope.wrap_model_call(request, lambda scoped_request: scoped_request)
    assert scoped.tools == []

    rejected = scope.wrap_tool_call(
        types.SimpleNamespace(tool_call={"name": "grep", "id": "1"}),
        lambda _request: "executed",
    )
    assert rejected.status == "error"


def test_interview_turn_is_one_model_call() -> None:
    budget = next(
        item for item in SUBAGENT["middleware"] if isinstance(item, AgentRunBudgetMiddleware)
    )

    # One call answers the turn; one grace call covers structured output only.
    assert budget.finalize_after == 1
    assert budget.max_model_calls == 2


def test_interview_prompt_grounds_questions_in_scanner_memory() -> None:
    prompt = SUBAGENT["system_prompt"]

    assert "You have no repository tools" in prompt
    assert "Repository Intelligence Pack summary" in prompt
    # The old instruction to inspect source must be gone.
    assert "Inspect source only when" not in prompt


def test_scanner_summary_is_customer_safe_and_high_level() -> None:
    pack = {
        "artifactVersion": "sha256:abc",
        "architectureMap": {
            "languages": ["TypeScript"],
            "frameworks": ["NestJS"],
            "routes": ["GET /x"],
            "entrypoints": [{"path": "apps/api/src/secret-handler.ts", "symbol": "h"}],
            "queues": [],
        },
        "domainModules": {
            "ai": [{"path": "apps/api/src/ai/openai.client.ts"}],
            "humanReview": [],
        },
        "coverageState": {
            "global": "PARTIAL",
            "aiDiscovery": "READY",
            "sourceCoverageGaps": ["Generated clients excluded"],
            "unresolvedFrontiers": [],
        },
    }

    summary = summarize_pack_for_interview(pack)

    assert summary["available"] is True
    assert summary["languages"] == ["TypeScript"]
    assert summary["surfaceCounts"]["routes"] == 1
    assert summary["domainAreasPresent"] == ["ai"]
    assert summary["coverage"]["global"] == "PARTIAL"
    # A question must never be able to quote a path or symbol.
    assert "openai.client.ts" not in str(summary)
    assert "secret-handler.ts" not in str(summary)


def test_missing_scanner_memory_is_reported_not_guessed() -> None:
    assert summarize_pack_for_interview(None) == {"available": False}


def test_confirmed_context_pack_projects_business_dimensions() -> None:
    pack = build_confirmed_context_pack(
        _context(),
        unresolved_business_gaps=["Whether reviewers can override a result"],
        resolved_needs=["need:human-review"],
        scanner_artifact_version="sha256:abc",
    )

    assert pack["assessmentId"] == "assessment-1"
    assert pack["contextRevision"] == 4
    assert [item["statementId"] for item in pack["humanReviewModel"]] == ["s1"]
    assert [item["statementId"] for item in pack["dataCategories"]] == ["s2"]
    assert [item["statementId"] for item in pack["aiCapabilityPurpose"]] == ["s3"]
    assert [item["statementId"] for item in pack["downstreamActionBoundary"]] == ["s4"]
    assert pack["unresolvedBusinessGaps"] == ["Whether reviewers can override a result"]
    assert pack["resolvedNeeds"] == ["need:human-review"]
    assert pack["linkedScannerFacts"] == {
        "scannerArtifactVersion": "sha256:abc",
        "authorizedEvidenceRefs": ["anchor:1"],
    }
    assert pack["limitations"] == ["Coverage partial for generated clients"]


def test_context_pack_versioning_tracks_revision() -> None:
    first = build_confirmed_context_pack(_context())
    later = build_confirmed_context_pack(
        ConfirmedStructuredBusinessContext(
            assessment_id="assessment-1",
            context_revision=5,
            statements=_context().statements,
        )
    )

    assert context_pack_identity(first) == ("assessment-1", 4)
    assert context_pack_identity(later) == ("assessment-1", 5)


def test_absent_confirmed_context_is_an_empty_pack_not_a_crash() -> None:
    pack = build_confirmed_context_pack(None)

    assert pack["confirmedStatements"] == []
    assert pack["contextRevision"] == 0
    assert pack["humanReviewModel"] == []
