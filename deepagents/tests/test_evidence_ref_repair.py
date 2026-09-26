from __future__ import annotations

from unittest.mock import Mock

import pytest

from tools.common.capabilities.platform.api_client import (
    InterviewDecisionRepairableCallbackError,
    WorkerCallbackError,
)
from tools.common.capabilities.workflow.recovery.evidence_ref_repair import (
    post_with_evidence_ref_repair,
    strip_evidence_ref,
)

REPORT_REF = "technicalEvidenceReport:ter-1"
SOURCE_REF = "packages/api/src/features/ai/service.ts"


def _unauthorized(ref: str) -> InterviewDecisionRepairableCallbackError:
    return InterviewDecisionRepairableCallbackError(
        "INTERVIEW_EVIDENCE_REF_UNAUTHORIZED: client error",
        error_code="INTERVIEW_EVIDENCE_REF_UNAUTHORIZED",
        status_code=400,
        meta={"unauthorizedRef": ref},
    )


def _payload() -> dict:
    return {
        "activeQuestion": {
            "whyEvidenceRefs": [REPORT_REF, SOURCE_REF],
            "frontier": {"evidenceRefs": [SOURCE_REF]},
        },
        "confirmedContext": {
            "statements": [{"statementId": "s1", "evidenceRefs": [SOURCE_REF, "node:a"]}],
        },
    }


def test_strip_removes_ref_everywhere_and_refills_emptied_lists() -> None:
    payload = _payload()

    assert strip_evidence_ref(payload, SOURCE_REF, fallback_refs=(REPORT_REF,))

    assert payload["activeQuestion"]["whyEvidenceRefs"] == [REPORT_REF]
    assert payload["activeQuestion"]["frontier"]["evidenceRefs"] == [REPORT_REF]
    assert payload["confirmedContext"]["statements"][0]["evidenceRefs"] == ["node:a"]


def test_strip_never_refills_with_the_rejected_ref() -> None:
    payload = {"evidenceRefs": [REPORT_REF]}

    assert strip_evidence_ref(payload, REPORT_REF, fallback_refs=(REPORT_REF,))

    assert payload["evidenceRefs"] == []


def test_strip_reports_absent_ref() -> None:
    assert not strip_evidence_ref(_payload(), "node:missing")


def test_repair_resubmits_until_accepted() -> None:
    payload = _payload()
    post = Mock(side_effect=[_unauthorized(SOURCE_REF), _unauthorized("node:a"), {"ok": True}])

    assert post_with_evidence_ref_repair(post, payload, fallback_refs=(REPORT_REF,)) == {"ok": True}

    assert post.call_count == 3
    assert payload["confirmedContext"]["statements"][0]["evidenceRefs"] == [REPORT_REF]


@pytest.mark.parametrize(
    "error",
    [
        _unauthorized("node:not-in-payload"),
        InterviewDecisionRepairableCallbackError(
            "INTERVIEW_INITIAL_QUESTION_INVALID: client error",
            error_code="INTERVIEW_INITIAL_QUESTION_INVALID",
        ),
        WorkerCallbackError("forbidden", status_code=403),
    ],
)
def test_repair_propagates_rejections_it_cannot_fix(error) -> None:
    post = Mock(side_effect=error)

    with pytest.raises(type(error)) as caught:
        post_with_evidence_ref_repair(post, _payload())

    assert caught.value is error
    assert post.call_count == 1
