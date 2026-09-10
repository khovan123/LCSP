"""Managed boundary for persisted Customer Interview answers."""

from __future__ import annotations

import json
from typing import Any, Callable

from tools.common.capabilities.managed.boundary import AgentBoundaryBase
from tools.common.capabilities.platform.api_client import InterviewResolutionCallbackError
from tools.common.capabilities.workflow.recovery.post_guard_continuation import (
    PostGuardContinuationStore,
)
from tools.common.capabilities.assessment.planning.engineering_rule.confirmed_business_context import (
    ConfirmedStructuredBusinessContext,
    normalize_confirmed_structured_business_context,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
)
from tools.common.capabilities.assessment.planning.engineering_rule.engineering_rule_planner import (
    ENGINEERING_RULE_PLAN_REASON_CODES,
)
from tools.legal.retrieval.legal_basis.rule_applicability_evaluator import (
    RuleApplicabilityEvaluator,
    RULE_APPLICABILITY_STATUSES,
)

INTERVIEW_RESUME_COMMAND = "command.assessment-interview.resume-agent.v1"
CURRENT_CONTEXT = "CURRENT"
DUPLICATE_CONTEXT = "DUPLICATE"
STALE_CONTEXT = "STALE"
STALE_PROVENANCE_CONTEXT = "STALE_PROVENANCE"
_TERMINAL_GUARDED_OUTCOMES = {"CONTEXT_READY", "CONTEXT_RESOLVED"}
_DOWNSTREAM_IMPACT_FLAG = "DOWNSTREAM_IMPACT"
_LEGAL_RULE_NOT_APPLICABLE_STATUS = RULE_APPLICABILITY_STATUSES["not_applicable"]

# Targeted Interview resolution criteria are authored as customer-facing snake_case
# keys, while LegalRule.requiredFacts fields remain catalog-owned facts. Keep this
# bridge explicit and narrow so administrative customer facts can exclude only the
# parent legal rule fact they were requested to resolve.
_TARGETED_RESOLUTION_FACT_FIELDS = {
    "national_data_source_reuse": (
        "nationalDataSourceReuse",
        "national_data_source_reuse",
    ),
}


class AssessmentInterviewResumeBoundary(AgentBoundaryBase):
    """Run Interview reasoning, persist its guard, then continue durably."""

    boundary_source = "assessment.interview-answer-submitted"
    source_event = INTERVIEW_RESUME_COMMAND
    requires_rbac = False
    retry_delays_seconds = (30, 120, 600)

    def __init__(
        self,
        config,
        rbac_client=None,
        root_agent=None,
        api_client=None,
        dispatcher=None,
        downstream_handler=None,
        investigator_resumer: Callable[..., dict[str, Any]] | None = None,
        investigation_completer: Callable[..., None] | None = None,
        downstream_impact_handler: Callable[..., None] | None = None,
        continuation_store=None,
    ) -> None:
        super().__init__(config, rbac_client)
        self._root_agent = root_agent
        self._api_client = api_client
        self._dispatcher = dispatcher
        self._downstream_handler = downstream_handler
        self._investigator_resumer = investigator_resumer
        self._investigation_completer = investigation_completer
        self._downstream_impact_handler = downstream_impact_handler
        self._continuation_store = continuation_store or PostGuardContinuationStore.from_config(
            config
        )

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        assessment_id = _required_text(message, "assessmentId")
        thread_id = _required_text(message, "threadId")
        question_id = _required_text(message, "questionId")
        source_version = _required_text(message, "sourceVersion")
        pge_version = _required_text(message, "pgeVersion")
        context_revision = _required_int(message, "contextRevision")
        resume_reason = _required_text(message, "resumeReason")
        command_workflow_run_id = _required_text(message, "workflowRunId")
        api_client = self._api_client or self._load_api_client()

        context = api_client.get_interview_private_context(
            assessment_id,
            context_revision,
            source_version=source_version,
            pge_version=pge_version,
        )
        server_thread_id = _required_text(context, "threadId")
        if server_thread_id != thread_id:
            raise ValueError(
                "assessment Interview resume command threadId does not match "
                "the server-owned Interview thread"
            )
        status = str(context.get("status") or "")
        if status == STALE_PROVENANCE_CONTEXT:
            self._reenter_root_for_revalidation(
                assessment_id=assessment_id,
                thread_id=thread_id,
                question_id=question_id,
                context_revision=context_revision,
                correlationId=correlationId,
                root=self._root_agent or self._load_root_agent(),
            )
            return

        coverage_state = str(context.get("technicalCoverageState") or "UNAVAILABLE").upper()
        coverage_limitations = context.get("coverageLimitations")
        if coverage_state == "UNAVAILABLE" or (
            coverage_state == "PARTIAL"
            and (not isinstance(coverage_limitations, list) or not coverage_limitations)
        ):
            self._reenter_root_for_coverage_recovery(
                assessment_id=assessment_id,
                thread_id=thread_id,
                question_id=question_id,
                context_revision=context_revision,
                coverage_state=coverage_state,
                correlationId=correlationId,
                root=self._root_agent or self._load_root_agent(),
            )
            return

        server_workflow_run_id = _required_text(context, "workflowRunId")
        if server_workflow_run_id != command_workflow_run_id:
            raise ValueError(
                "assessment Interview resume command workflowRunId does not match "
                "the server-owned Interview workflow run"
            )

        # A guard-accepted broker delivery may be retried after the worker crashes.
        # DUPLICATE therefore means no new Interview model turn, not automatically no-op.
        # Terminal guarded state is resumed until the durable post-guard record is COMPLETED.
        if status == DUPLICATE_CONTEXT and _terminal_guarded_state(context):
            guarded_state = self._guarded_state_from_duplicate(
                assessment_id=assessment_id,
                context_revision=context_revision,
                source_version=str(context.get("sourceVersion") or source_version),
                pge_version=str(context.get("pgeVersion") or pge_version),
                context=context,
            )
            self._run_guarded_continuation(
                assessment_id=assessment_id,
                thread_id=thread_id,
                question_id=question_id,
                context_revision=context_revision,
                source_version=str(context.get("sourceVersion") or source_version),
                pge_version=str(context.get("pgeVersion") or pge_version),
                guarded_state=guarded_state,
                correlationId=correlationId,
                root_workflow_run_id=context.get("rootWorkflowRunId"),
            )
            return

        targeted_need = context.get("targetedNeed")
        targeted_mode = isinstance(targeted_need, dict)
        same_revision_resume = resume_reason == "PROVIDE_MORE_CONTEXT" or targeted_mode
        if not same_revision_resume:
            if status in {DUPLICATE_CONTEXT, STALE_CONTEXT}:
                return
            if status != CURRENT_CONTEXT:
                raise ValueError(f"unexpected Interview private context status: {status}")
        else:
            if status == STALE_CONTEXT:
                return
            if status not in {CURRENT_CONTEXT, DUPLICATE_CONTEXT}:
                raise ValueError(f"unexpected Interview private context status: {status}")
            if status == DUPLICATE_CONTEXT and _same_revision_resume_materialized(context):
                # The first same-revision targeted/follow-up delivery may author a question.
                # Once that question or a non-terminal final state is materialized, duplicate
                # delivery is a no-op before model invocation. Terminal guard retry was handled
                # above so it cannot be accidentally swallowed here.
                return

        from orchestration.interview_progress import active_progress, InterviewProgressCallback
        def emit(phase):
            reporter = getattr(api_client, "post_interview_progress", None)
            if reporter is not None:
                reporter(assessment_id, context_revision, phase)
        token = active_progress.set(InterviewProgressCallback(emit))
        emit("RUNNING")
        try:
            self._run_and_persist_decision(api_client, assessment_id, thread_id, question_id,
                context_revision, resume_reason, context, correlationId, source_version, pge_version)
        except Exception:
            emit("FAILED")
            raise
        finally:
            active_progress.reset(token)

    def _run_and_persist_decision(self, api_client, assessment_id, thread_id, question_id,
                                  context_revision, resume_reason, context, correlationId,
                                  source_version, pge_version):
        decision = self._run_interview(
            assessment_id=assessment_id,
            thread_id=thread_id,
            question_id=question_id,
            context_revision=context_revision,
            resume_reason=resume_reason,
            context=context,
            correlationId=correlationId,
        )
        try:
            guarded_state = api_client.post_interview_agent_decision(
                assessment_id, decision,
            )
        except InterviewResolutionCallbackError as exc:
            # A rejected candidate has not advanced the persisted revision. Let the
            # specialist correct it once; never infer authority or relax the API guard.
            if decision.get("outcome") != "CONTEXT_RESOLVED":
                raise
            repair_context = {
                **context,
                "decisionValidationFeedback": {
                    "code": "INTERVIEW_RESOLUTION_CRITERIA_UNSATISFIED",
                    "missingCriteria": exc.missing,
                    "rejectedDecision": decision,
                },
            }
            corrected = self._run_interview(
                assessment_id=assessment_id,
                thread_id=thread_id,
                question_id=question_id,
                context_revision=context_revision,
                resume_reason=resume_reason,
                context=repair_context,
                correlationId=correlationId,
            )
            # A second rejection propagates to terminal delivery settlement.
            guarded_state = api_client.post_interview_agent_decision(
                assessment_id, corrected,
            )
        self._run_guarded_continuation(
            assessment_id=assessment_id,
            thread_id=thread_id,
            question_id=question_id,
            context_revision=context_revision,
            source_version=str(context.get("sourceVersion") or source_version),
            pge_version=str(context.get("pgeVersion") or pge_version),
            guarded_state=guarded_state,
            correlationId=correlationId,
            root_workflow_run_id=context.get("rootWorkflowRunId"),
        )

    def _run_interview(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        resume_reason: str,
        context: dict[str, Any],
        correlationId: str,
    ) -> dict[str, Any]:
        from uuid import UUID
        from orchestration.context import LCSPRunContext
        from subagents.interview.customer_safe_projection import (
            TurnEvidenceLedger,
            build_why_are_we_asking_explanation,
            evaluate_question_eligibility,
            extract_governed_evidence_refs,
            reset_active_turn_evidence_ledger,
            sanitize_customer_facing_text,
            set_active_turn_evidence_ledger,
            validate_evidence_refs,
        )

        private_revision = context.get("privateRevision")
        targeted_need = context.get("targetedNeed")
        actor_id = (
            str(context.get("authenticatedActorId") or "").strip()
            or str(context.get("actorId") or "").strip()
            or str(context.get("userId") or "").strip()
            or (str(private_revision.get("authenticatedActorId") or "").strip() if isinstance(private_revision, dict) else "")
            or (str(private_revision.get("actorId") or "").strip() if isinstance(private_revision, dict) else "")
            or (str(private_revision.get("userId") or "").strip() if isinstance(private_revision, dict) else "")
        )
        if not actor_id and isinstance(targeted_need, dict):
            actor_id = str(targeted_need.get("actorId") or "").strip()
        if not actor_id:
            raise ValueError(
                "Assessment Interview resume requires a trusted authenticated principal / actorId"
            )

        workflow_run_id = context.get("workflowRunId") or context.get("workflow_run_id")
        if not workflow_run_id and isinstance(context.get("targetedContinuation"), dict):
            workflow_run_id = context["targetedContinuation"].get("workflowRunId")
        if not workflow_run_id or not str(workflow_run_id).strip():
            raise ValueError(
                "Assessment Interview resume requires a valid workflowRunId from orchestration"
            )
        valid_wf_id = str(workflow_run_id).strip()
        if correlationId and valid_wf_id == correlationId:
            raise ValueError(
                "workflowRunId cannot be identical to correlationId"
            )

        source_version = str(context.get("sourceVersion") or "")
        pge_version = str(context.get("pgeVersion") or "")
        technical_evidence_report_id = (
            pge_version.split(":", 1)[0].strip() if pge_version else ""
        )
        repository_snapshot_id = (
            source_version.split(":", 1)[0].strip() if source_version else ""
        )

        invocation_key = (
            f"assessment-interview:{assessment_id}:{context_revision}:{resume_reason}"
        )
        if context.get("decisionValidationFeedback"):
            invocation_key += ":resolution-correction:1"

        run_context = LCSPRunContext(
            assessment_id=assessment_id,
            user_id=actor_id,
            workflow_run_id=valid_wf_id,
            artifact_versions={
                "technicalEvidenceReportId": technical_evidence_report_id,
                "repositorySnapshotId": repository_snapshot_id,
                "sourceVersion": source_version,
                "pgeVersion": pge_version,
                "guidanceVersion": str(context.get("guidanceVersion") or ""),
            },
            idempotency_key=invocation_key,
        )

        authorized_refs = {
            f"repositorySnapshot:{repository_snapshot_id}",
            f"technicalEvidenceReport:{technical_evidence_report_id}",
            "interviewRuntime:assessment-interview-runtime-v1",
        }
        authorized_refs.update(
            extract_governed_evidence_refs(private_revision, targeted_need, context)
        )

        cov_state = str(context.get("technicalCoverageState") or "READY")
        cov_limitations = list(context.get("coverageLimitations") or [])
        ledger = TurnEvidenceLedger(
            initial_authorized_refs=authorized_refs,
            initial_coverage_state=cov_state,
            initial_coverage_limitations=cov_limitations,
        )
        ledger_token = set_active_turn_evidence_ledger(ledger)
        try:
            dispatcher = self._dispatcher or self._load_dispatcher()
            instruction = _interview_instruction(
                assessment_id=assessment_id,
                question_id=question_id,
                context_revision=context_revision,
                resume_reason=resume_reason,
                context=context,
            )
            result = dispatcher.dispatch(
                subagent_type="interview",
                instruction=instruction,
                idempotency_key=invocation_key,
                trigger=resume_reason,
                metadata={
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "guidance_version": context.get("guidanceVersion"),
                    "correlationId": correlationId,
                    "artifact_versions": run_context.artifact_versions,
                },
                thread_id=thread_id,
                context=run_context,
                reenter_root=False,
            )
        finally:
            reset_active_turn_evidence_ledger(ledger_token)

        handoff = result.get("handoff") if isinstance(result, dict) else None
        if not isinstance(handoff, dict):
            raise ValueError("Interview specialist did not return a validated handoff")
        handoff["expectedContextRevision"] = context_revision
        targeted_need = context.get("targetedNeed")
        if isinstance(targeted_need, dict):
            if handoff.get("mode") != "INVESTIGATOR_RESOLUTION":
                raise ValueError(
                    "Targeted Interview specialist must return INVESTIGATOR_RESOLUTION mode"
                )
            question = handoff.get("activeQuestion")
            if isinstance(question, dict) and question.get("needId") not in {
                None,
                targeted_need.get("needId"),
            }:
                raise ValueError("Targeted Interview question escaped its registered need")

        # Validate candidate question and evidence refs emitted by the Interview specialist
        question = handoff.get("activeQuestion")
        outcome = handoff.get("outcome")
        if outcome == "WAITING_FOR_CUSTOMER":
            if not isinstance(question, dict):
                raise ValueError("Interview handoff with WAITING_FOR_CUSTOMER requires an activeQuestion")
            frontier = question.get("frontier")
            if not isinstance(frontier, dict):
                raise ValueError("Interview question candidate requires frontier metadata")
            eligible, reason = evaluate_question_eligibility(frontier, ledger)
            if not eligible:
                raise ValueError(f"Interview question candidate is not eligible: {reason}")
            frontier_refs = frontier.get("evidenceRefs") or []
            topic = str(frontier.get("description") or question.get("prompt") or "business clarification")
            obs = str(frontier.get("description") or "")
            question["whyAreWeAsking"] = build_why_are_we_asking_explanation(
                topic=topic,
                evidence_observation=obs,
                coverage_state=str(context.get("technicalCoverageState") or "READY"),
                coverage_limitations=list(context.get("coverageLimitations") or []),
                ledger=ledger,
                evidence_refs=frontier_refs,
            )

        confirmed_context = handoff.get("confirmedContext")
        if isinstance(confirmed_context, dict):
            confirmed_refs: list[str] = []
            statements = confirmed_context.get("statements")
            if isinstance(statements, list):
                for statement in statements:
                    if isinstance(statement, dict):
                        refs = statement.get("evidenceRefs") or statement.get("evidence_refs") or []
                        if isinstance(refs, list):
                            confirmed_refs.extend(str(ref) for ref in refs if str(ref).strip())
            validate_evidence_refs(confirmed_refs, ledger.authorized_refs)

        if isinstance(question, dict):
            if "prompt" in question and question["prompt"]:
                question["prompt"] = sanitize_customer_facing_text(str(question["prompt"]))
            if "whyAreWeAsking" in question and question["whyAreWeAsking"]:
                question["whyAreWeAsking"] = sanitize_customer_facing_text(
                    str(question["whyAreWeAsking"])
                )

            question_refs = (
                question.get("whyEvidenceRefs")
                or question.get("governedEvidenceRefs")
                or []
            )
            frontier = question.get("frontier")
            frontier_refs = frontier.get("evidenceRefs") or [] if isinstance(frontier, dict) else []
            validate_evidence_refs([*question_refs, *frontier_refs], ledger.authorized_refs)

        return handoff

    def _run_guarded_continuation(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        source_version: str,
        pge_version: str,
        guarded_state: dict[str, Any],
        correlationId: str,
        root_workflow_run_id: str | None = None,
    ) -> None:
        outcome = str(guarded_state.get("outcome") or "")
        if outcome not in _TERMINAL_GUARDED_OUTCOMES:
            return
        if root_workflow_run_id and isinstance(guarded_state.get("continuation"), dict):
            guarded_state = {
                **guarded_state,
                "continuation": {
                    **guarded_state["continuation"],
                    "rootWorkflowRunId": root_workflow_run_id,
                },
            }
        payload = _continuation_store_payload(guarded_state)
        record = self._continuation_store.begin(
            assessment_id=assessment_id,
            context_revision=context_revision,
            outcome=outcome,
            payload=payload,
        )
        if record.completed:
            return
        effective_state = dict(guarded_state)
        if not isinstance(effective_state.get("continuation"), dict):
            stored_continuation = record.payload.get("continuation")
            if isinstance(stored_continuation, dict):
                effective_state["continuation"] = dict(stored_continuation)
        self._continue_after_guard(
            assessment_id=assessment_id,
            thread_id=thread_id,
            question_id=question_id,
            context_revision=context_revision,
            source_version=source_version,
            pge_version=pge_version,
            guarded_state=effective_state,
            correlationId=correlationId,
        )
        self._continuation_store.complete(
            assessment_id=assessment_id,
            context_revision=context_revision,
            outcome=outcome,
        )

    def _guarded_state_from_duplicate(
        self,
        *,
        assessment_id: str,
        context_revision: int,
        source_version: str,
        pge_version: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        public_state = context.get("publicState")
        if not isinstance(public_state, dict):
            raise RuntimeError("duplicate guarded continuation is missing worker state")
        guarded_state = dict(public_state)
        # Customer projections intentionally omit confirmed context. Recover it
        # from the authenticated worker response, never from the broker payload.
        if isinstance(context.get("confirmedContext"), dict):
            guarded_state["confirmedContext"] = context["confirmedContext"]
        outcome = str(guarded_state.get("outcome") or "")
        record = self._continuation_store.get(
            assessment_id=assessment_id,
            context_revision=context_revision,
            outcome=outcome,
        )
        if record is not None and record.completed:
            return guarded_state
        if outcome == "CONTEXT_RESOLVED":
            continuation = record.payload.get("continuation") if record is not None else None
            if not isinstance(continuation, dict):
                targeted_need = context.get("targetedNeed")
                if not isinstance(targeted_need, dict):
                    raise RuntimeError(
                        "duplicate resolved continuation is missing targeted need provenance"
                    )
                from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
                    reconstruct_managed_investigator_continuation,
                )

                continuation = reconstruct_managed_investigator_continuation(
                    config=self._config,
                    assessment_id=assessment_id,
                    targeted_need=targeted_need,
                    source_version=source_version,
                    pge_version=pge_version,
                )
            guarded_state["continuation"] = continuation
        return guarded_state

    def _continue_after_guard(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        source_version: str,
        pge_version: str,
        guarded_state: dict[str, Any],
        correlationId: str,
    ) -> None:
        outcome = str(guarded_state.get("outcome") or "")
        if outcome not in _TERMINAL_GUARDED_OUTCOMES:
            return
        if self._downstream_handler is not None:
            self._downstream_handler(
                {
                    "assessmentId": assessment_id,
                    "threadId": thread_id,
                    "questionId": question_id,
                    "contextRevision": context_revision,
                    "sourceVersion": source_version,
                    "pgeVersion": pge_version,
                    "outcome": outcome,
                    "flags": list(guarded_state.get("flags") or []),
                },
                correlationId,
            )
            return
        if outcome == "CONTEXT_READY":
            evidence_report_id = pge_version.split(":", 1)[0].strip()
            if not evidence_report_id:
                raise ValueError(
                    "guarded CONTEXT_READY is missing technical evidence report provenance"
                )
            from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
                InterviewGatedEngineeringAssessmentBoundary,
            )

            InterviewGatedEngineeringAssessmentBoundary(
                self._config,
                api_client=self._api_client,
            ).handle(
                {
                    "assessmentId": assessment_id,
                    "evidenceReportId": evidence_report_id,
                    "workflowRunId": thread_id,
                },
                correlationId,
            )
            return

        continuation = guarded_state.get("continuation")
        if not isinstance(continuation, dict):
            raise ValueError(
                "guarded CONTEXT_RESOLVED is missing server-owned continuation"
            )
        _validate_guarded_continuation_pins(
            continuation,
            source_version=source_version,
            pge_version=pge_version,
        )
        confirmed_context = guarded_state.get("confirmedContext")
        if not isinstance(confirmed_context, dict):
            raise ValueError(
                "guarded CONTEXT_RESOLVED is missing authoritative confirmedContext"
            )
        typed_confirmed_context = normalize_confirmed_structured_business_context(
            guarded_state,
            assessment_id=assessment_id,
        )
        if _has_downstream_impact(guarded_state):
            self._route_downstream_impact_to_orchestration(
                assessment_id=assessment_id,
                thread_id=thread_id,
                context_revision=context_revision,
                continuation=continuation,
                confirmed_context=typed_confirmed_context,
                correlationId=correlationId,
            )
            return

        self._resume_exact_investigator(
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=typed_confirmed_context,
            correlationId=correlationId,
        )

    def _route_downstream_impact_to_orchestration(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        context_revision: int,
        continuation: dict[str, Any],
        confirmed_context: ConfirmedStructuredBusinessContext,
        correlationId: str,
    ) -> None:
        if self._downstream_impact_handler is not None:
            self._downstream_impact_handler(
                assessment_id=assessment_id,
                thread_id=thread_id,
                context_revision=context_revision,
                continuation=continuation,
                confirmed_context=confirmed_context,
                correlation_id=correlationId,
            )
            return
        from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
            assert_managed_investigator_artifact_pins,
        )

        api_client = self._api_client or self._load_api_client()
        assert_managed_investigator_artifact_pins(api_client, continuation)
        affected_rule_ids = continuation.get("affectedRuleIds")
        artifact_versions = continuation.get("artifactVersions")
        if not isinstance(affected_rule_ids, list) or not affected_rule_ids:
            raise RuntimeError("downstream impact re-evaluation requires affectedRuleIds")
        if not isinstance(artifact_versions, dict) or not artifact_versions:
            raise RuntimeError("downstream impact re-evaluation requires artifact pins")
        root = self._root_agent or self._load_root_agent()
        root.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "A guarded Targeted Interview resolved the requested Customer context "
                            "and flagged DOWNSTREAM_IMPACT. Do not exact-resume the old Investigator. "
                            "Root Orchestration must choose the bounded selective rerun/rescope path "
                            "for the affected EngineeringRule scope while preserving the pinned legal, "
                            "technical-evidence, and repository artifacts below. Interview has only "
                            "raised the flag; this orchestration step owns the downstream decision.\n"
                            + json.dumps(
                                {
                                    "assessmentId": assessment_id,
                                    "contextRevision": context_revision,
                                    "affectedRuleIds": affected_rule_ids,
                                    "artifactVersions": artifact_versions,
                                    "confirmedContext": (
                                        confirmed_context.to_prompt_dict()
                                    ),
                                },
                                ensure_ascii=False,
                                sort_keys=True,
                            )
                        ),
                    }
                ]
            },
            config={
                "configurable": {
                    "thread_id": f"{thread_id}:downstream-impact:{context_revision}"
                },
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "context_revision": context_revision,
                    "affected_rule_ids": list(affected_rule_ids),
                    "artifact_versions": dict(artifact_versions),
                    "correlationId": correlationId,
                    "trigger": "INTERVIEW_DOWNSTREAM_IMPACT_REEVALUATION",
                },
            },
        )

    def _resume_exact_investigator(
        self,
        *,
        assessment_id: str,
        context_revision: int,
        continuation: dict[str, Any],
        confirmed_context: ConfirmedStructuredBusinessContext,
        correlationId: str,
    ) -> None:
        api_client = self._api_client or self._load_api_client()
        scope_excluded_handoff = _deterministic_not_applicable_handoff(
            api_client=api_client,
            continuation=continuation,
            confirmed_context=confirmed_context,
        )
        if scope_excluded_handoff is not None:
            self._complete_exact_investigator_resume(
                api_client=api_client,
                assessment_id=assessment_id,
                context_revision=context_revision,
                continuation=continuation,
                confirmed_context=confirmed_context,
                handoff=scope_excluded_handoff,
                correlationId=correlationId,
            )
            return

        resumer = self._investigator_resumer
        if resumer is None:
            from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
                resume_managed_investigator,
            )

            resumer = resume_managed_investigator

        result = resumer(
            config=self._config,
            api_client=api_client,
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            correlation_id=correlationId,
        )
        if not isinstance(result, dict):
            raise RuntimeError("exact Investigator resume returned an invalid result")
        if result.get("executionId") != continuation.get("investigatorExecutionId"):
            raise RuntimeError("exact Investigator resume execution identity drifted")
        if result.get("threadId") != continuation.get("workflowRunId"):
            raise RuntimeError("exact Investigator resume thread identity drifted")
        if result.get("fromCheckpointId") != continuation.get("checkpointId"):
            raise RuntimeError("exact Investigator resume checkpoint identity drifted")
        handoff = result.get("handoff")
        if not isinstance(handoff, dict):
            raise RuntimeError("exact Investigator resume did not return a typed handoff")
        if handoff.get("status") != "READY":
            raise RuntimeError(
                "exact Investigator resume must complete the original bounded investigation"
            )

        self._complete_exact_investigator_resume(
            api_client=api_client,
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            handoff=handoff,
            correlationId=correlationId,
        )

    def _complete_exact_investigator_resume(
        self,
        *,
        api_client: Any,
        assessment_id: str,
        context_revision: int,
        continuation: dict[str, Any],
        confirmed_context: ConfirmedStructuredBusinessContext,
        handoff: dict[str, Any],
        correlationId: str,
    ) -> None:
        completer = self._investigation_completer
        if completer is None:
            from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
                complete_resumed_investigation,
            )

            completer = complete_resumed_investigation
        completer(
            config=self._config,
            api_client=api_client,
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            resumed_handoff=handoff,
            correlation_id=correlationId,
        )

    def _reenter_root_for_revalidation(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        correlationId: str,
        root: Any,
    ) -> None:
        root.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Persisted Customer Interview context was stale against current "
                            "source/PGE provenance. Revalidate via Root Orchestration before "
                            "any Interview Agent sufficiency or downstream resume. "
                            f"Assessment: {assessment_id}. Thread: {thread_id}. "
                            f"Question: {question_id}. Requested revision: {context_revision}."
                        ),
                    }
                ]
            },
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_REVALIDATION_REQUIRED",
                },
            },
        )

    def _reenter_root_for_coverage_recovery(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        coverage_state: str,
        correlationId: str,
        root: Any,
    ) -> None:
        root.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Technical coverage cannot enter Interview reasoning. "
                            "Run Root Orchestration recovery or revalidation before any "
                            "Interview Agent turn or downstream continuation. "
                            f"Assessment: {assessment_id}. Coverage state: {coverage_state}."
                        ),
                    }
                ]
            },
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_COVERAGE_RECOVERY_REQUIRED",
                },
            },
        )

    def _load_api_client(self):
        from tools.common.capabilities.platform.api_client import WorkerApiClient
        from tools.common.capabilities.platform.config import load_config

        config = load_config()
        return WorkerApiClient(config.nestjs_api_base_url, config.worker_api_key)

    @staticmethod
    def _load_dispatcher():
        from orchestration.dispatcher import RootSubagentDispatcher

        return RootSubagentDispatcher()

    @staticmethod
    def _load_root_agent():
        from agent import agent

        return agent



def _deterministic_not_applicable_handoff(
    *,
    api_client: Any,
    continuation: dict[str, Any],
    confirmed_context: ConfirmedStructuredBusinessContext,
) -> dict[str, Any] | None:
    rules = _active_legal_rules(api_client)
    if not rules:
        return None
    affected_rule_ids = [
        str(value)
        for value in continuation.get("affectedRuleIds") or []
        if str(value or "").strip()
    ]
    for affected_rule_id in affected_rule_ids:
        legal_rule = _parent_legal_rule_for_engineering_rule(rules, affected_rule_id)
        if legal_rule is None:
            continue
        profile = _profile_with_confirmed_context_facts(
            _base_verified_profile(legal_rule),
            legal_rule=legal_rule,
            confirmed_context=confirmed_context,
        )
        outcome = RuleApplicabilityEvaluator().evaluate_rule(
            rule=legal_rule,
            verified_profile=profile,
        )
        if outcome.status != _LEGAL_RULE_NOT_APPLICABLE_STATUS:
            continue
        statement_refs = tuple(
            ref for refs in profile.get("factEvidenceRefs", {}).values() for ref in refs
        )
        if not statement_refs:
            continue
        return {
            "status": "READY",
            "artifact_versions": dict(continuation.get("artifactVersions") or {}),
            "claims": [
                {
                    "claim_id": f"claim:targeted-scope-excluded:{affected_rule_id}",
                    "engineering_rule_id": affected_rule_id,
                    "claim_type": ENGINEERING_EVIDENCE_CLAIM_TYPES[
                        "rule_scope_not_applicable"
                    ],
                    "value": None,
                    "evidence_refs": [],
                    "graph_path_refs": [],
                    "source_anchor_refs": [],
                    "customer_context_refs": list(dict.fromkeys(statement_refs)),
                    "confidence": outcome.confidence,
                    "limitations": [],
                    "criterion": ENGINEERING_RULE_PLAN_REASON_CODES[
                        "targeted_scope_excluded"
                    ],
                }
            ],
            "limitations": [],
            "missing_input": None,
            "next_step": "GATE",
        }
    return None


def _active_legal_rules(api_client: Any) -> list[dict[str, Any]]:
    try:
        catalog = api_client.get_active_legal_rule_catalog()
    except Exception:
        return []
    if not isinstance(catalog, dict):
        return []
    return [rule for rule in catalog.get("rules") or [] if isinstance(rule, dict)]


def _parent_legal_rule_for_engineering_rule(
    rules: list[dict[str, Any]],
    engineering_rule_id: str,
) -> dict[str, Any] | None:
    for rule in rules:
        legal_rule_id = str(rule.get("legalRuleId") or rule.get("legal_rule_id") or "")
        if engineering_rule_id.startswith(f"{legal_rule_id}::PRECOMPILED::"):
            return rule
        if engineering_rule_id in _legal_rule_engineering_rule_ids(rule):
            return rule
    return None


def _legal_rule_engineering_rule_ids(rule: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for key in ("engineeringRuleIds", "engineering_rule_ids"):
        raw = rule.get(key)
        if isinstance(raw, list):
            values.update(str(item) for item in raw if str(item or "").strip())
    raw_rules = rule.get("engineeringRules") or rule.get("engineering_rules")
    if isinstance(raw_rules, list):
        for item in raw_rules:
            if isinstance(item, dict):
                value = item.get("engineeringRuleId") or item.get("engineering_rule_id")
                if str(value or "").strip():
                    values.add(str(value))
    return values


def _base_verified_profile(rule: dict[str, Any]) -> dict[str, Any]:
    raw = rule.get("verifiedProfile") or rule.get("verified_profile") or {}
    if not isinstance(raw, dict):
        raw = {}
    merged = raw.get("mergedProfile") or raw.get("merged_profile") or {}
    refs = raw.get("factEvidenceRefs") or raw.get("fact_evidence_refs") or {}
    return {
        "mergedProfile": dict(merged) if isinstance(merged, dict) else {},
        "factEvidenceRefs": dict(refs) if isinstance(refs, dict) else {},
    }


def _profile_with_confirmed_context_facts(
    profile: dict[str, Any],
    *,
    legal_rule: dict[str, Any],
    confirmed_context: ConfirmedStructuredBusinessContext,
) -> dict[str, Any]:
    merged = dict(profile.get("mergedProfile") or {})
    fact_refs = dict(profile.get("factEvidenceRefs") or {})
    required_fields = {
        str(fact.get("field"))
        for fact in legal_rule.get("requiredFacts") or []
        if isinstance(fact, dict) and str(fact.get("field") or "").strip()
    }
    for statement in confirmed_context.statements:
        candidate_fields = _TARGETED_RESOLUTION_FACT_FIELDS.get(statement.topic, ())
        target_field = next(
            (field for field in candidate_fields if field in required_fields),
            None,
        )
        if target_field is None:
            continue
        merged[target_field] = statement.normalized_value
        fact_refs[target_field] = [statement.statement_id]
    return {"mergedProfile": merged, "factEvidenceRefs": fact_refs}

def _terminal_guarded_state(context: dict[str, Any]) -> bool:
    state = context.get("publicState")
    return isinstance(state, dict) and str(state.get("outcome") or "") in _TERMINAL_GUARDED_OUTCOMES


def _same_revision_resume_materialized(context: dict[str, Any]) -> bool:
    state = context.get("publicState")
    if not isinstance(state, dict):
        return False
    if isinstance(state.get("activeQuestion"), dict):
        return True
    outcome = str(state.get("outcome") or "")
    if outcome in {"CONTEXT_READY", "CONTEXT_RESOLVED", "FAILED"}:
        return True
    return state.get("orchestrationRequested") is False


def _has_downstream_impact(state: dict[str, Any]) -> bool:
    flags = state.get("flags")
    return isinstance(flags, list) and _DOWNSTREAM_IMPACT_FLAG in flags


def _validate_guarded_continuation_pins(
    continuation: dict[str, Any],
    *,
    source_version: str,
    pge_version: str,
) -> None:
    if str(continuation.get("sourceVersion") or "") != source_version:
        raise RuntimeError("guarded continuation source version is stale")
    if str(continuation.get("pgeVersion") or "") != pge_version:
        raise RuntimeError("guarded continuation PGE version is stale")
    if not str(continuation.get("originatingInvestigationReference") or "").strip():
        raise RuntimeError("guarded continuation is missing origin")
    affected_rule_ids = continuation.get("affectedRuleIds")
    if not isinstance(affected_rule_ids, list) or not affected_rule_ids:
        raise RuntimeError("guarded continuation is missing affectedRuleIds")
    artifact_versions = continuation.get("artifactVersions")
    if not isinstance(artifact_versions, dict) or not artifact_versions:
        raise RuntimeError("guarded continuation is missing artifactVersions")


def _continuation_store_payload(state: dict[str, Any]) -> dict[str, Any]:
    continuation = state.get("continuation")
    if isinstance(continuation, dict):
        return {"continuation": dict(continuation)}
    return {}


def _interview_instruction(
    *,
    assessment_id: str,
    question_id: str,
    context_revision: int,
    resume_reason: str,
    context: dict[str, Any],
) -> str:
    private_revision = context.get("privateRevision")
    public_state = context.get("publicState")
    targeted_need = context.get("targetedNeed")
    # The complete authorization inventory belongs to the turn ledger, not the
    # model prompt. It can contain millions of characters for a large repository.
    if isinstance(private_revision, dict):
        refs = private_revision.get("governedEvidenceRefs")
        private_revision = {
            key: value for key, value in private_revision.items()
            if key != "governedEvidenceRefs"
        }
        private_revision["governedEvidenceRefCount"] = len(refs) if isinstance(refs, list) else 0
    mode = (
        "INVESTIGATOR_RESOLUTION"
        if isinstance(targeted_need, dict)
        else "INITIAL_INTERVIEW"
    )
    bounded_payload = {
        "hostPlatform": "LCSP",
        "subjectSystemIdentity": f"repositorySnapshot:{str(context.get('sourceVersion') or '').split(':', 1)[0]}",
        "assessmentId": assessment_id,
        "mode": mode,
        "questionId": question_id,
        "contextRevision": context_revision,
        "resumeReason": resume_reason,
        "sourceVersion": context.get("sourceVersion"),
        "pgeVersion": context.get("pgeVersion"),
        "technicalCoverageState": context.get("technicalCoverageState"),
        "coverageLimitations": list(context.get("coverageLimitations") or []),
        "guidanceVersion": context.get("guidanceVersion"),
        "workingStrategy": context.get(
            "workingStrategy",
            {
                "terminologyMap": {},
                "avoidReaskingTopics": [],
                "effectiveQuestionPatterns": [],
                "observedAmbiguities": [],
                "interactionNotes": [],
            },
        ),
        "publicThreadState": public_state,
        "privateCustomerRevision": private_revision,
        "targetedNeed": targeted_need,
    }
    if context.get("decisionValidationFeedback"):
        bounded_payload["decisionValidationFeedback"] = context["decisionValidationFeedback"]
    return (
        "Evaluate exactly one governed Assessment Interview turn. The JSON below is a "
        "private worker-only input and must not be copied into Customer-safe evidence or "
        "downstream prompts. Preserve hedging/contradictions, choose ASK vs CLARIFY, and "
        "use the session-local workingStrategy only to adapt terminology and phrasing; "
        "never treat it as authoritative context or change guidanceVersion. "
        "return only the typed InterviewResult candidate. HTTP persistence is not proof "
        "of sufficiency. PROVIDE_MORE_CONTEXT means author the next bounded question from "
        "the existing thread; do not restart a targeted Interview. "
        "If decisionValidationFeedback is present, the prior candidate was rejected and "
        "did not resolve the need. Re-evaluate it against the private customer revision. "
        "For supported criteria, use the exact resolutionCriteria text as statement.topic. "
        "Do not invent confirmation or treat validation feedback as customer evidence. "
        "If evidence is missing, return WAITING_FOR_CUSTOMER with a bounded clarification, "
        "or BLOCKED_OR_UNRESOLVED when the customer cannot supply it. Keep validation "
        "feedback private; never copy it into customer-facing text or downstream context.\n\n"
        + json.dumps(bounded_payload, ensure_ascii=False, sort_keys=True)
    )


def _required_text(message: dict[str, Any], field: str) -> str:
    value = str(message.get(field) or "").strip()
    if not value:
        raise ValueError(f"assessment Interview resume command requires {field}")
    return value


def _required_int(message: dict[str, Any], field: str) -> int:
    value = message.get(field)
    if not isinstance(value, int) or value < 0:
        raise ValueError(f"assessment Interview resume command requires numeric {field}")
    return value
