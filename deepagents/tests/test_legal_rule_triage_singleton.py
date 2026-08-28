from __future__ import annotations

from pathlib import Path

from tools.triage.legal_rule_triage.singleton import TriageSingletonCoordinator


def _coordinator(tmp_path: Path) -> TriageSingletonCoordinator:
    return TriageSingletonCoordinator(storage_root=tmp_path)


def test_first_request_owns_singleton_and_second_request_joins_without_queue(tmp_path: Path) -> None:
    owner = _coordinator(tmp_path)
    joined = _coordinator(tmp_path)

    first = owner.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="manual:assessment-1",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
        assessment_id="assessment-1",
    )
    second = joined.submit_or_continue(
        affected_rule_ids=["RULE-2"],
        idempotency_key="manual:assessment-2",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
        assessment_id="assessment-2",
    )

    assert first.status == "OWNER"
    assert first.affected_rule_ids == ("RULE-1",)
    assert second.status == "RUNNING"
    assert second.execution_id == first.execution_id
    assert second.affected_rule_ids == ("RULE-2",)
    assert not (tmp_path / "triage-runtime" / "pending").exists()

    owner.set_batch_work(
        execution_id=str(first.execution_id),
        legal_rule_ids=["RULE-1"],
    )
    owner.mark_rule_completed(
        execution_id=str(first.execution_id),
        legal_rule_id="RULE-1",
    )

    continuation = owner.finish_or_drain(execution_id=str(first.execution_id))
    assert continuation.status == "CONTINUE"
    assert continuation.execution_id == first.execution_id
    assert continuation.affected_rule_ids == ("RULE-2",)

    next_batch = owner.submit_or_continue(
        affected_rule_ids=None,
        idempotency_key=None,
        trigger="LEGAL_MAINTENANCE",
        execution_id=str(first.execution_id),
    )
    assert next_batch.status == "OWNER"
    assert next_batch.affected_rule_ids == ("RULE-2",)

    owner.set_batch_work(
        execution_id=str(first.execution_id),
        legal_rule_ids=["RULE-2"],
    )
    owner.mark_rule_completed(
        execution_id=str(first.execution_id),
        legal_rule_id="RULE-2",
    )
    finished = owner.finish_or_drain(execution_id=str(first.execution_id))

    assert finished.status == "COMPLETE"
    assert owner.active_status()["active"] is False


def test_same_rule_request_during_active_batch_is_joined_without_extra_work(tmp_path: Path) -> None:
    owner = _coordinator(tmp_path)
    duplicate = _coordinator(tmp_path)

    first = owner.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="manual:assessment-1",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
    )
    owner.set_batch_work(
        execution_id=str(first.execution_id),
        legal_rule_ids=["RULE-1"],
    )

    joined = duplicate.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="manual:assessment-2",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
    )

    assert joined.status == "RUNNING"
    assert joined.execution_id == first.execution_id
    status = owner.active_status()
    assert status["joinedLegalRuleIds"] == []
    assert status["activeBatchLegalRuleIds"] == ["RULE-1"]

    owner.mark_rule_completed(
        execution_id=str(first.execution_id),
        legal_rule_id="RULE-1",
    )
    finished = owner.finish_or_drain(execution_id=str(first.execution_id))
    assert finished.status == "COMPLETE"


def test_duplicate_idempotency_key_does_not_create_duplicate_request_state(tmp_path: Path) -> None:
    owner = _coordinator(tmp_path)
    duplicate = _coordinator(tmp_path)

    first = owner.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="same-key",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
    )
    owner.set_batch_work(
        execution_id=str(first.execution_id),
        legal_rule_ids=["RULE-1"],
    )
    joined = duplicate.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="same-key",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
    )

    assert joined.status == "RUNNING"
    assert owner.active_status()["requestCount"] == 1

    owner.mark_rule_completed(
        execution_id=str(first.execution_id),
        legal_rule_id="RULE-1",
    )
    assert owner.finish_or_drain(execution_id=str(first.execution_id)).status == "COMPLETE"


def test_full_backlog_request_joins_running_execution_without_queue(tmp_path: Path) -> None:
    owner = _coordinator(tmp_path)
    scheduled = _coordinator(tmp_path)

    first = owner.submit_or_continue(
        affected_rule_ids=["RULE-1"],
        idempotency_key="manual:assessment-1",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
    )
    owner.set_batch_work(
        execution_id=str(first.execution_id),
        legal_rule_ids=["RULE-1"],
    )

    joined = scheduled.submit_or_continue(
        affected_rule_ids=[],
        idempotency_key="scheduled:daily",
        trigger="SCHEDULED",
    )
    assert joined.status == "RUNNING"
    assert joined.full_backlog is True

    owner.mark_rule_completed(
        execution_id=str(first.execution_id),
        legal_rule_id="RULE-1",
    )
    continuation = owner.finish_or_drain(execution_id=str(first.execution_id))
    assert continuation.status == "CONTINUE"
    assert continuation.full_backlog is True

    next_batch = owner.submit_or_continue(
        affected_rule_ids=None,
        idempotency_key=None,
        trigger="LEGAL_MAINTENANCE",
        execution_id=str(first.execution_id),
    )
    assert next_batch.full_backlog is True

    owner.set_batch_work(execution_id=str(first.execution_id), legal_rule_ids=[])
    assert owner.finish_or_drain(execution_id=str(first.execution_id)).status == "COMPLETE"
