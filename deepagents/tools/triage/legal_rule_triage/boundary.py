"""RabbitMQ boundary for automatic ENGINEERING_RULE_NOT_READY Legal Rule Triage."""

from __future__ import annotations

from typing import Any

from langchain.agents import create_agent

from subagents.triage.definition import SUBAGENT
from tools.common.capabilities.managed.boundary import AgentBoundaryBase
from tools.common.capabilities.platform.logging import get_logger

from .contracts import LEGAL_RULE_TRIAGE_REQUEST_COMMAND
from .singleton import TriageSingletonCoordinator
from .waiting_assessments import WaitingAssessmentRegistry


logger = get_logger(__name__)


class LegalRuleTriageBoundary(AgentBoundaryBase):
    """Run the shared Triage agent for one automatic readiness request."""

    boundary_source = "legal.engineering-rule-readiness"
    source_event = LEGAL_RULE_TRIAGE_REQUEST_COMMAND
    requires_rbac = False
    retry_delays_seconds = (30, 120, 600)

    def __init__(self, config, rbac_client=None, waiting_registry=None) -> None:
        super().__init__(config, rbac_client)
        self._waiting_registry = waiting_registry or WaitingAssessmentRegistry()

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        trigger = str(message.get("trigger") or "")
        if trigger != "ENGINEERING_RULE_NOT_READY":
            raise ValueError("automatic triage boundary requires ENGINEERING_RULE_NOT_READY")

        legal_rule_ids = self._string_list(message.get("affectedLegalRuleIds"))
        idempotency_key = str(message.get("idempotencyKey") or "").strip()
        if not idempotency_key:
            raise ValueError("automatic triage boundary requires idempotencyKey")
        evidence_report_id = str(message.get("resumeEvidenceReportId") or "").strip()
        if not evidence_report_id:
            raise ValueError("automatic triage boundary requires resumeEvidenceReportId")
        workflow_run_id = str(
            message.get("resumeWorkflowRunId") or evidence_report_id
        ).strip()

        # Persist only the orchestration checkpoint needed to re-run the Assessment
        # readiness gate. This is intentionally separate from the Triage singleton:
        # no incoming LegalRule scope is queued, merged, or exposed to Triage when a
        # different execution already owns the singleton.
        self._waiting_registry.register(
            evidence_report_id=evidence_report_id,
            workflow_run_id=workflow_run_id,
            source_correlation_id=correlationId,
        )

        coordinator = TriageSingletonCoordinator()
        reservation = coordinator.claim_or_observe(
            affected_rule_ids=legal_rule_ids,
            idempotency_key=idempotency_key,
            trigger=trigger,
        )
        if reservation.status == "ALREADY_RUNNING":
            logger.info(
                "LEGAL_RULE_TRIAGE_ALREADY_RUNNING",
                active_execution_id=reservation.execution_id,
                requested_rule_count=len(legal_rule_ids),
                waiting_assessment_checkpointed=True,
                correlationId=correlationId,
            )
            # Strict singleton policy remains intact: do not queue, merge, or persist
            # the incoming LegalRule scope. The Assessment checkpoint is reconciled
            # after whichever Triage execution currently owns the singleton finishes.
            return
        if reservation.status != "OWNER" or not reservation.execution_id:
            raise RuntimeError(
                f"unexpected triage singleton reservation status: {reservation.status}"
            )

        execution_id = reservation.execution_id
        triage_agent = create_agent(
            model=SUBAGENT["model"],
            tools=SUBAGENT["tools"],
            system_prompt=SUBAGENT["system_prompt"],
            middleware=SUBAGENT["middleware"],
            name="lcsp-legal-rule-triage-readiness",
        )
        instruction = (
            "Automatic ENGINEERING_RULE_NOT_READY legal-preparation request. "
            f"The global singleton is already claimed as triageExecutionId={execution_id}. "
            "Your first get_legal_rule_triage_work_items call MUST pass that exact "
            "triage_execution_id. Process only the claimed legal scope, persist every "
            "ready LegalRule result, and call finish_legal_rule_triage_execution before "
            "returning. Do not use or request Assessment/customer/repository context. "
            f"Idempotency key: {idempotency_key}."
        )

        try:
            triage_agent.invoke(
                {"messages": [{"role": "user", "content": instruction}]},
                config={
                    "metadata": {
                        "workflow_run_id": f"triage:{workflow_run_id}",
                        "node_name": "automatic_engineering_rule_readiness_triage",
                        "correlationId": correlationId,
                        "trigger": trigger,
                    },
                    "configurable": {
                        "thread_id": f"triage:{idempotency_key}",
                    },
                },
            )
        except Exception:
            coordinator.abandon_execution(execution_id=execution_id)
            raise

        active = coordinator.active_status()
        if (
            active.get("active")
            and active.get("triageExecutionId") == execution_id
        ):
            coordinator.abandon_execution(execution_id=execution_id)
            raise RuntimeError(
                "Triage agent returned before finish_legal_rule_triage_execution"
            )

        # finish_legal_rule_triage_execution is the deterministic reconciliation
        # point. It releases the singleton first, then re-enters every Assessment
        # checkpoint currently waiting on EngineeringRule readiness. Do not resume
        # only this originating Assessment here, otherwise it would be duplicated.
        logger.info(
            "LEGAL_RULE_TRIAGE_OWNER_COMPLETED",
            triage_execution_id=execution_id,
            assessment_reconciliation="delegated_to_finish_tool",
            correlationId=correlationId,
        )

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("affectedLegalRuleIds must be a list")
        return list(
            dict.fromkeys(
                str(item).strip()
                for item in value
                if str(item).strip()
            )
        )
