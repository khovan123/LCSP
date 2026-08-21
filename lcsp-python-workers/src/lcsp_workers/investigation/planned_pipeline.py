"""Planner-gated direct EngineeringRule investigation runtime."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from lcsp_workers.llm.fallback_client import LLMClientProtocol
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.scanner.program_graph.source_roles import filter_program_evidence_graph

from .code_context import CodeContextSession
from .code_context_investigator import CodeContextLawGuidedInvestigator
from .deterministic_investigator import DeterministicCodeContextLawGuidedInvestigator
from .engineering_rule_planner import (
    EngineeringRulePlan,
    EngineeringRulePlanDecisionAudit,
    EngineeringRulePlanner,
)
from .material_scope import material_planning_packet
from .models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    EvidenceClaim,
)
from .openwiki_context import OpenWikiContextProvider, OpenWikiContextRequiredError
from .pipeline import EngineeringInvestigationPipeline, EngineeringInvestigationResult
from .plan_audit_result import PlannedEngineeringInvestigationResult
from .planning_business_scope import (
    BusinessAwareScopedEngineeringRulePlanningCandidate,
    BusinessAwareScopedMaterialEngineeringRulePlanner,
    RulePlanningBusinessScopeProjector,
)
from .selected_rule_orchestration import augment_selected_rule_packet


logger = get_logger(__name__)


class PlannedEngineeringInvestigationPipeline(EngineeringInvestigationPipeline):
    """Plan once, validate deterministically, then investigate selected rules only."""

    def __init__(
        self,
        *,
        api_client,
        llm_client: LLMClientProtocol,
        retriever=None,
        rule_service=None,
        query_executor=None,
        investigator=None,
        evaluator=None,
        planner: EngineeringRulePlanner | None = None,
        corpus_recovery_driver=None,
    ) -> None:
        super().__init__(
            api_client=api_client,
            llm_client=llm_client,
            retriever=retriever,
            rule_service=rule_service,
            query_executor=query_executor,
            investigator=(
                investigator or DeterministicCodeContextLawGuidedInvestigator(llm_client)
            ),
            evaluator=evaluator,
        )
        self._planner = planner or BusinessAwareScopedMaterialEngineeringRulePlanner(
            llm_client
        )
        self._corpus_recovery_driver = corpus_recovery_driver

    def run(
        self,
        *,
        evidence_report: dict[str, Any],
        workflow_run_id: str,
        correlation_id: str | None = None,
        wizard_context: dict[str, Any] | None = None,
        workspace_path: str | Path | None = None,
    ) -> EngineeringInvestigationResult:
        raw_graph = self._graph(evidence_report)
        graph = filter_program_evidence_graph(raw_graph)
        if graph.node_count != raw_graph.node_count:
            logger.info(
                "ENGINEERING_TEST_SOURCES_FILTERED",
                removed_node_count=raw_graph.node_count - graph.node_count,
                remaining_node_count=graph.node_count,
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )

        # CodeContextSession is built only after the runtime graph has been cleaned,
        # so search_code/repo_map/get_symbol/get_code cannot surface test/spec symbols
        # even when a classification rerun references an older persisted graph.
        code_context = CodeContextSession(graph, workspace_path=workspace_path)
        catalog_version_id, corpus_version_id, rules = self._load_legal_rule_sources()
        if not rules:
            recovered = self._recover_legal_rule_sources(
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                reason="NO_APPROVED_ENGINEERING_RULE_SOURCE_RULES",
            )
            if recovered:
                (
                    catalog_version_id,
                    corpus_version_id,
                    rules,
                ) = self._load_legal_rule_sources()
        if not rules:
            return EngineeringInvestigationResult(
                status="BLOCKED",
                legal_rule_catalog_version_id=catalog_version_id,
                legal_corpus_version_id=corpus_version_id,
                rules_considered=0,
                engineering_rules_executed=0,
                engineering_rule_cache_hits=0,
                limitations=(
                    ENGINEERING_LIMITATION_CODES["no_engineering_rule_source_rules"],
                ),
            )

        limitations, cache_hits, prepared = self._prepare_engineering_rules(
            rules=rules,
            catalog_version_id=catalog_version_id,
            corpus_version_id=corpus_version_id,
            graph=graph,
            wizard_context=wizard_context,
            workflow_run_id=workflow_run_id,
            correlation_id=correlation_id,
        )

        if not prepared:
            recovered = self._recover_legal_rule_sources(
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                reason="NO_ENGINEERING_RULE_CANDIDATES_AFTER_TRIAGE",
            )
            if recovered:
                (
                    catalog_version_id,
                    corpus_version_id,
                    rules,
                ) = self._load_legal_rule_sources()
                limitations, cache_hits, prepared = self._prepare_engineering_rules(
                    rules=rules,
                    catalog_version_id=catalog_version_id,
                    corpus_version_id=corpus_version_id,
                    graph=graph,
                    wizard_context=wizard_context,
                    workflow_run_id=workflow_run_id,
                    correlation_id=correlation_id,
                )

        if not prepared:
            return EngineeringInvestigationResult(
                status="BLOCKED",
                legal_rule_catalog_version_id=catalog_version_id,
                legal_corpus_version_id=corpus_version_id,
                rules_considered=len(rules),
                engineering_rules_executed=0,
                engineering_rule_cache_hits=cache_hits,
                limitations=tuple(dict.fromkeys(limitations)),
            )

        # Planner does not receive every broad start-node hit. Each packet is projected
        # into rule-specific material production signals first. A single graph projector
        # then expands only those material seeds through bounded executable/business/data
        # edges so the Planner receives concrete business process/subject/capability/
        # decision context rather than only hit counts and node-type names. The original
        # packet is retained for the investigator after the rule passes the plan gate.
        material_prepared = tuple(
            (rule, material_planning_packet(rule, packet)) for rule, packet in prepared
        )
        business_scope_projector = RulePlanningBusinessScopeProjector(graph)
        candidates = tuple(
            BusinessAwareScopedEngineeringRulePlanningCandidate.from_rule_packet(
                rule,
                material_packet,
                business_scope_projector,
            )
            for rule, material_packet in material_prepared
        )
        try:
            openwiki_context = OpenWikiContextProvider(
                workspace_path or Path.cwd()
            ).collect_required_for_candidates(candidates)
            logger.info(
                "OPENWIKI_PLANNER_HINTS_READY",
                hint_count=openwiki_context.get("hintCount", 0),
                authority=openwiki_context.get("authority"),
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            plan = self._planner.plan(
                candidates=candidates,
                wizard_context=wizard_context,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                openwiki_context=openwiki_context,
            )
        except OpenWikiContextRequiredError as error:
            logger.warning(
                "OPENWIKI_PLANNER_HINTS_REQUIRED_FALLBACK_ALL",
                reason=str(error),
                candidate_count=len(candidates),
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            plan = EngineeringRulePlan(
                selected_rule_ids=tuple(
                    candidate.engineering_rule_id for candidate in candidates
                ),
                skipped_rule_ids=(),
                fallback_used=True,
                decision_audit=tuple(
                    EngineeringRulePlanDecisionAudit(
                        engineering_rule_id=candidate.engineering_rule_id,
                        requested_decision="FALLBACK",
                        final_decision="SELECT",
                        reason_code="OPENWIKI_REQUIRED_CONTEXT_UNAVAILABLE",
                        basis=(),
                        validation_override="OPENWIKI_REQUIRED_FALLBACK_ALL",
                    )
                    for candidate in candidates
                ),
            )
        selected_ids = set(plan.selected_rule_ids)
        logger.info(
            "ENGINEERING_RULE_PLAN_APPLIED",
            candidate_count=len(candidates),
            selected_count=len(selected_ids),
            skipped_count=len(plan.skipped_rule_ids),
            fallback_used=plan.fallback_used,
            selected_rule_ids=sorted(selected_ids),
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )

        # P0 observability: persist and log one decision row per EngineeringRule. This
        # answers not only which rules were SELECTed, but whether SELECT came from the
        # model, a deterministic fail-closed override, material source evidence, Wizard
        # scope, scoped uncertainty, or the provenance-gated business scope supplied to
        # the model. This metadata is investigation-scope diagnostics, never legal
        # applicability/risk/compliance authority.
        candidate_by_id = {
            candidate.engineering_rule_id: candidate for candidate in candidates
        }
        planner_decisions: list[dict[str, Any]] = []
        for audit in plan.decision_audit:
            candidate = candidate_by_id.get(audit.engineering_rule_id)
            decision_row = {
                "engineering_rule_id": audit.engineering_rule_id,
                "requested_decision": audit.requested_decision,
                "final_decision": audit.final_decision,
                "reason_code": audit.reason_code,
                "basis": list(audit.basis),
                "validation_override": audit.validation_override,
                "material_source_hit_count": (
                    candidate.source_hit_count if candidate is not None else 0
                ),
                "material_source_evidence_count": (
                    candidate.source_evidence_count if candidate is not None else 0
                ),
                "material_source_node_types": (
                    list(candidate.source_node_types) if candidate is not None else []
                ),
                "scope_coverage_state": (
                    candidate.scope_coverage_state if candidate is not None else "UNKNOWN"
                ),
                "scoped_truncated_query_count": (
                    candidate.scoped_truncated_query_count if candidate is not None else 0
                ),
                "scoped_unresolved_frontier_count": (
                    candidate.scoped_unresolved_frontier_count
                    if candidate is not None
                    else 0
                ),
                "planning_business_scope": (
                    candidate.planning_business_scope.to_prompt_dict()
                    if candidate is not None
                    else {}
                ),
            }
            planner_decisions.append(decision_row)
            logger.info(
                "ENGINEERING_RULE_PLAN_DECISION",
                **decision_row,
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )

        claims: list[EvidenceClaim] = []
        evaluations = []
        technical_evidence_by_rule: dict[str, tuple[dict[str, Any], ...]] = {}
        executed = 0

        for engineering_rule, packet in prepared:
            if engineering_rule.engineering_rule_id not in selected_ids:
                continue

            # P1 deterministic orchestration: only selected rules receive a few bounded
            # contract-owned graph traces before the first LLM turn. This reduces model
            # tool retries/invalid ref calls and gives the model enough concrete topology
            # to finish naturally without restoring the old eager fan-out.
            packet = augment_selected_rule_packet(
                packet,
                graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
            )
            try:
                if isinstance(self._investigator, CodeContextLawGuidedInvestigator):
                    rule_claims = self._investigator.investigate(
                        packet=packet,
                        graph=graph,
                        workflow_run_id=workflow_run_id,
                        correlation_id=correlation_id,
                        code_context=code_context,
                    )
                else:
                    rule_claims = self._investigator.investigate(
                        packet=packet,
                        graph=graph,
                        workflow_run_id=workflow_run_id,
                        correlation_id=correlation_id,
                    )
            except Exception as error:
                logger.warning(
                    "ENGINEERING_INVESTIGATION_FAILED",
                    engineering_rule_id=engineering_rule.engineering_rule_id,
                    error_type=type(error).__name__,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                rule_claims = [
                    EvidenceClaim(
                        claim_id=f"claim:failed:{engineering_rule.engineering_rule_id}",
                        engineering_rule_id=engineering_rule.engineering_rule_id,
                        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                        value=None,
                        evidence_refs=tuple(packet.evidence_refs),
                        confidence=0.0,
                        limitations=(
                            ENGINEERING_LIMITATION_CODES[
                                "engineering_investigation_failed"
                            ],
                        ),
                    )
                ]
                limitations.append(
                    ENGINEERING_LIMITATION_CODES["engineering_investigation_failed"]
                )

            claims.extend(rule_claims)
            evaluation = self._evaluator.evaluate(engineering_rule, rule_claims)
            evaluations.append(evaluation)
            technical_evidence_by_rule[evaluation.engineering_rule_id] = tuple(
                self._technical_evidence_displays(graph, evaluation.evidence_refs)
            )
            executed += 1

        status = "COMPLETE"
        if not evaluations:
            status = "BLOCKED"
        elif limitations:
            status = "PARTIAL"

        return PlannedEngineeringInvestigationResult(
            status=status,
            legal_rule_catalog_version_id=catalog_version_id,
            legal_corpus_version_id=corpus_version_id,
            rules_considered=len(rules),
            engineering_rules_executed=executed,
            engineering_rule_cache_hits=cache_hits,
            claims=tuple(claims),
            evaluations=tuple(evaluations),
            limitations=tuple(dict.fromkeys(limitations)),
            technical_evidence_by_rule=technical_evidence_by_rule,
            planner_fallback_used=plan.fallback_used,
            planner_decisions=tuple(planner_decisions),
        )

    def _load_legal_rule_sources(self) -> tuple[str, str, list[dict[str, Any]]]:
        catalog = self._api_client.get_active_legal_rule_catalog()
        corpus = self._api_client.get_active_legal_corpus()
        catalog_version_id = self._required_id(
            catalog,
            "versionId",
            "version_id",
            "id",
            label="legal rule catalog version",
        )
        corpus_version_id = self._required_id(
            corpus,
            "versionId",
            "version_id",
            "corpusVersionId",
            "corpus_version_id",
            "id",
            label="legal corpus version",
        )
        corpus_index = self._api_client.get_legal_corpus_chunks(corpus_version_id)
        chunks = corpus_index.get("chunks") or []
        if not isinstance(chunks, list):
            raise ValueError("active legal corpus chunks are invalid")
        self._retriever.index_corpus(
            corpus_version_id,
            [item for item in chunks if isinstance(item, dict)],
        )
        rules = [
            rule
            for rule in (catalog.get("rules") or [])
            if isinstance(rule, dict) and self._is_approved_rule(rule)
        ]
        return catalog_version_id, corpus_version_id, rules

    def _prepare_engineering_rules(
        self,
        *,
        rules: list[dict[str, Any]],
        catalog_version_id: str,
        corpus_version_id: str,
        graph,
        wizard_context: dict[str, Any] | None,
        workflow_run_id: str,
        correlation_id: str | None,
    ) -> tuple[list[str], int, list[tuple[Any, Any]]]:
        limitations: list[str] = []
        cache_hits = 0
        prepared: list[tuple[Any, Any]] = []

        # Materialize/cache governed EngineeringRule contracts and run deterministic
        # seed queries against the test-free runtime graph before planning.
        for rule in rules:
            legal_rule_id = str(
                rule.get("legalRuleId")
                or rule.get("legal_rule_id")
                or rule.get("id")
                or "unknown"
            )
            try:
                engineering_rules, cache_hit = self._rule_service.get_or_compile(
                    legal_rule=rule,
                    legal_rule_catalog_version_id=catalog_version_id,
                    legal_corpus_version_id=corpus_version_id,
                    workflow_run_id=workflow_run_id,
                    correlation_id=correlation_id,
                )
                if cache_hit:
                    cache_hits += 1
            except Exception as error:
                logger.warning(
                    "ENGINEERING_RULE_COMPILATION_FAILED",
                    legal_rule_id=legal_rule_id,
                    error_type=type(error).__name__,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                limitations.append(
                    ENGINEERING_LIMITATION_CODES["engineering_rule_compilation_failed"]
                )
                continue

            for engineering_rule in engineering_rules:
                packet = self._query_executor.execute(
                    engineering_rule,
                    graph,
                    wizard_context=wizard_context,
                )
                prepared.append((engineering_rule, packet))

        return limitations, cache_hits, prepared

    def _recover_legal_rule_sources(
        self,
        *,
        workflow_run_id: str,
        correlation_id: str | None,
        reason: str,
    ) -> bool:
        logger.info(
            "ENGINEERING_RULE_SOURCE_RECOVERY_REQUESTED",
            reason=reason,
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )
        try:
            driver = self._corpus_recovery_driver
            if driver is None:
                from lcsp_workers.legal.legal_corpus_recovery_driver import (
                    LegalCorpusRecoveryDriver,
                )

                driver = LegalCorpusRecoveryDriver(api_client=self._api_client)
            response = driver.run(
                {
                    "idempotencyKey": (
                        f"{workflow_run_id}:engineering-rule-source-recovery"
                    ),
                    "maxRuns": 0,
                },
                correlation_id or workflow_run_id,
            )
        except Exception as error:
            logger.warning(
                "ENGINEERING_RULE_SOURCE_RECOVERY_FAILED",
                reason=reason,
                error_type=type(error).__name__,
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            return False
        logger.info(
            "ENGINEERING_RULE_SOURCE_RECOVERY_COMPLETED",
            reason=reason,
            status=response.get("status") if isinstance(response, dict) else None,
            corpus_version_id=(
                response.get("corpusVersionId") if isinstance(response, dict) else None
            ),
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )
        return True
