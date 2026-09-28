"""Durable EngineeringRule plans and per-rule results, so a retry resumes.

A retried engineering-assessment dispatch reuses the plan it was executing and the
claims of every rule the Investigator already finished; only rules that failed or
never started are investigated again.

The Planner and the Investigator run in one engineering-assessment dispatch. When the
Investigator fails and the dispatch is retried, the plan it was executing is still
valid as long as nothing it was computed from changed: the same commit, confirmed
Customer context revision, legal catalog/corpus pins, Scanner artifact and candidate
rules. The workflow run is deliberately excluded so Continue and equivalent reruns
reuse the same plan. This store keeps that plan beside the durable LangGraph
checkpoints and returns it for an identical input set.

Only complete plans are stored; a plan that reopened Interview for Customer context
is never reused, because answering it changes the context revision anyway.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from threading import Lock
from typing import Any, Iterable

import psycopg

from tools.common.capabilities.platform.graph_runtime import checkpoint_database_url

from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    EvidenceClaim,
)

from .engineering_rule_planner import (
    EngineeringRulePlan,
    EngineeringRulePlanDecisionAudit,
)
from .rule_investigation_plan import PLANNER_VERSION, rule_investigation_plan_key

_TABLE = "lcsp_engineering_rule_plan"
_ROUTE_TABLE = "lcsp_rule_investigation_plan"
_RULE_TABLE = "lcsp_engineering_rule_investigation"
_CLAIM_TUPLE_FIELDS = (
    "evidence_refs",
    "graph_path_refs",
    "source_anchor_refs",
    "source_locations",
    "limitations",
    "customer_context_refs",
)


def engineering_rule_plan_key(
    *,
    commit_sha: str,
    context_revision: int,
    catalog_version_id: str,
    corpus_version_id: str,
    scanner_artifact_version: str | None,
    candidate_rule_ids: Iterable[str],
    planner_version: str = PLANNER_VERSION,
) -> str:
    """Identify one plan by every input that would change the Planner's decision.

    The workflow run is not part of the identity: a rerun or Continue on the same
    commit and confirmed context, with the same catalog/corpus/Scanner inputs,
    must reuse the plan instead of paying for an identical planning pass.
    """
    return rule_investigation_plan_key(
        commit_sha=commit_sha,
        context_revision=context_revision,
        rule_catalog_version=catalog_version_id,
        legal_corpus_version=corpus_version_id,
        scanner_artifact_version=scanner_artifact_version,
        candidate_rule_ids=candidate_rule_ids,
        planner_version=planner_version,
    )


def serialize_plan(plan: EngineeringRulePlan) -> str:
    return json.dumps(
        {
            "selected_rule_ids": list(plan.selected_rule_ids),
            "skipped_rule_ids": list(plan.skipped_rule_ids),
            "fallback_used": plan.fallback_used,
            "decision_audit": [asdict(row) for row in plan.decision_audit],
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def deserialize_plan(payload: str | dict[str, Any]) -> EngineeringRulePlan:
    data = json.loads(payload) if isinstance(payload, str) else payload
    return EngineeringRulePlan(
        selected_rule_ids=tuple(data["selected_rule_ids"]),
        skipped_rule_ids=tuple(data["skipped_rule_ids"]),
        fallback_used=bool(data.get("fallback_used", False)),
        decision_audit=tuple(
            EngineeringRulePlanDecisionAudit(
                **{
                    **row,
                    "basis": tuple(row.get("basis", ())),
                    "confirmed_statement_refs_used": tuple(
                        row.get("confirmed_statement_refs_used", ())
                    ),
                    "context_limitations_used": tuple(
                        row.get("context_limitations_used", ())
                    ),
                }
            )
            for row in data.get("decision_audit", ())
        ),
    )


def serialize_claims(
    claims: Iterable[EvidenceClaim],
    *,
    investigation_version: str,
) -> str:
    return json.dumps(
        {
            "investigationVersion": investigation_version,
            "claims": [claim.to_dict() for claim in claims],
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def deserialize_claims(
    payload: str | dict[str, Any] | list[dict[str, Any]],
    *,
    expected_investigation_version: str,
) -> list[EvidenceClaim] | None:
    data = json.loads(payload) if isinstance(payload, str) else payload
    # Rows written before investigationVersion existed are deliberately stale.
    # Recomputing once upgrades them in place without a database migration.
    if not isinstance(data, dict):
        return None
    if data.get("investigationVersion") != expected_investigation_version:
        return None
    rows = data.get("claims")
    if not isinstance(rows, list):
        return None
    return [
        EvidenceClaim(
            **{
                **row,
                **{
                    name: tuple(row.get(name) or ())
                    for name in _CLAIM_TUPLE_FIELDS
                },
            }
        )
        for row in rows
    ]


def reusable(plan: EngineeringRulePlan) -> bool:
    return not plan.context_needs


class EngineeringRulePlanStore:
    """Persist completed plans beside durable LangGraph checkpoints."""

    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._setup_done = False
        self._lock = Lock()

    @classmethod
    def from_config(
        cls, config: Any
    ) -> "EngineeringRulePlanStore | EphemeralEngineeringRulePlanStore":
        database_url = checkpoint_database_url(
            getattr(config, "langgraph_checkpoint_database_url", None)
        )
        if not database_url:
            return EphemeralEngineeringRulePlanStore()
        return cls(database_url)

    def get(self, plan_key: str) -> EngineeringRulePlan | None:
        self._setup()
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"SELECT plan_json FROM {_TABLE} WHERE plan_key = %s",
                    (plan_key,),
                )
                row = cursor.fetchone()
        return None if row is None else deserialize_plan(row[0])

    def put(self, plan_key: str, plan: EngineeringRulePlan) -> None:
        if not reusable(plan):
            return
        self._setup()
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"INSERT INTO {_TABLE} (plan_key, plan_json) VALUES (%s, %s) "
                    "ON CONFLICT (plan_key) DO NOTHING",
                    (plan_key, serialize_plan(plan)),
                )
            connection.commit()

    def get_investigation_plan(self, plan_key: str) -> dict[str, Any] | None:
        """The durable Rule Investigation Plan (routes, budgets) for this plan key."""
        self._setup()
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"SELECT plan_json FROM {_ROUTE_TABLE} WHERE plan_key = %s",
                    (plan_key,),
                )
                row = cursor.fetchone()
        return json.loads(row[0]) if row else None

    def put_investigation_plan(self, plan_key: str, plan: dict[str, Any]) -> None:
        self._setup()
        payload = json.dumps(plan, sort_keys=True, separators=(",", ":"), default=str)
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"INSERT INTO {_ROUTE_TABLE} (plan_key, plan_json) VALUES (%s, %s) "
                    "ON CONFLICT (plan_key) DO NOTHING",
                    (plan_key, payload),
                )
            connection.commit()

    def get_rule_claims(
        self,
        plan_key: str,
        engineering_rule_id: str,
        *,
        investigation_version: str,
    ) -> list[EvidenceClaim] | None:
        self._setup()
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"SELECT claims_json FROM {_RULE_TABLE} "
                    "WHERE plan_key = %s AND engineering_rule_id = %s",
                    (plan_key, engineering_rule_id),
                )
                row = cursor.fetchone()
        return (
            None
            if row is None
            else deserialize_claims(
                row[0],
                expected_investigation_version=investigation_version,
            )
        )

    def put_rule_claims(
        self,
        plan_key: str,
        engineering_rule_id: str,
        claims: Iterable[EvidenceClaim],
        *,
        investigation_version: str,
    ) -> None:
        self._setup()
        with psycopg.connect(self._database_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"INSERT INTO {_RULE_TABLE} "
                    "(plan_key, engineering_rule_id, claims_json) VALUES (%s, %s, %s) "
                    "ON CONFLICT (plan_key, engineering_rule_id) DO UPDATE SET "
                    "claims_json = EXCLUDED.claims_json, created_at = NOW()",
                    (
                        plan_key,
                        engineering_rule_id,
                        serialize_claims(
                            claims,
                            investigation_version=investigation_version,
                        ),
                    ),
                )
            connection.commit()

    def _setup(self) -> None:
        if self._setup_done:
            return
        with self._lock:
            if self._setup_done:
                return
            with psycopg.connect(self._database_url) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"CREATE TABLE IF NOT EXISTS {_TABLE} ("
                        "plan_key TEXT PRIMARY KEY, "
                        "plan_json TEXT NOT NULL, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
                    )
                    cursor.execute(
                        f"CREATE TABLE IF NOT EXISTS {_ROUTE_TABLE} ("
                        "plan_key TEXT PRIMARY KEY, "
                        "plan_json TEXT NOT NULL, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
                    )
                    cursor.execute(
                        f"CREATE TABLE IF NOT EXISTS {_RULE_TABLE} ("
                        "plan_key TEXT NOT NULL, "
                        "engineering_rule_id TEXT NOT NULL, "
                        "claims_json TEXT NOT NULL, "
                        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), "
                        "PRIMARY KEY (plan_key, engineering_rule_id))"
                    )
                connection.commit()
            self._setup_done = True


class EphemeralEngineeringRulePlanStore:
    """Process-local store for checkpoint-free harnesses; same reuse semantics."""

    def __init__(self) -> None:
        self._plans: dict[str, str] = {}
        self._investigation_plans: dict[str, str] = {}
        self._rule_claims: dict[tuple[str, str], str] = {}

    def get_investigation_plan(self, plan_key: str) -> dict[str, Any] | None:
        payload = self._investigation_plans.get(plan_key)
        return json.loads(payload) if payload else None

    def put_investigation_plan(self, plan_key: str, plan: dict[str, Any]) -> None:
        self._investigation_plans.setdefault(
            plan_key, json.dumps(plan, sort_keys=True, separators=(",", ":"), default=str)
        )

    def get_rule_claims(
        self,
        plan_key: str,
        engineering_rule_id: str,
        *,
        investigation_version: str,
    ) -> list[EvidenceClaim] | None:
        payload = self._rule_claims.get((plan_key, engineering_rule_id))
        return (
            None
            if payload is None
            else deserialize_claims(
                payload,
                expected_investigation_version=investigation_version,
            )
        )

    def put_rule_claims(
        self,
        plan_key: str,
        engineering_rule_id: str,
        claims: Iterable[EvidenceClaim],
        *,
        investigation_version: str,
    ) -> None:
        self._rule_claims[(plan_key, engineering_rule_id)] = serialize_claims(
            claims,
            investigation_version=investigation_version,
        )

    def get(self, plan_key: str) -> EngineeringRulePlan | None:
        payload = self._plans.get(plan_key)
        return None if payload is None else deserialize_plan(payload)

    def put(self, plan_key: str, plan: EngineeringRulePlan) -> None:
        if reusable(plan):
            self._plans.setdefault(plan_key, serialize_plan(plan))


__all__ = [
    "EngineeringRulePlanStore",
    "EphemeralEngineeringRulePlanStore",
    "engineering_rule_plan_key",
]
