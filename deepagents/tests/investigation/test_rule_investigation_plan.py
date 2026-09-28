from __future__ import annotations

from tools.common.capabilities.assessment.planning.engineering_rule.rule_investigation_plan import (
    DEFAULT_RULE_BUDGET,
    FALLBACK_POLICIES,
    RULE_PLAN_STATES,
    batch_groups,
    build_rule_investigation_plan,
    plan_item,
    rule_investigation_plan_key,
)

_PACK = {
    "artifactVersion": "sha256:scanner",
    "domainModules": {
        "humanReview": [
            {
                "path": "apps/api/src/review/gate.ts",
                "startLine": 5,
                "endLine": 60,
                "symbol": "HumanReviewGate",
                "qualifiedName": "apps.api.src.review.HumanReviewGate",
            }
        ],
        "ai": [{"path": "apps/api/src/ai/client.ts", "startLine": 1, "symbol": "callModel"}],
    },
    "seedLocations": [
        {"path": "apps/api/src/review/audit.ts", "startLine": 2, "domain": "humanReview"}
    ],
}


def _plan(**overrides):
    kwargs = dict(
        selected_rule_ids=["rule-review", "rule-blind"],
        skipped_rule_ids=["rule-skip"],
        candidate_rule_ids=["rule-review", "rule-blind", "rule-skip"],
        rule_seeds={
            "rule-review": [
                {
                    "path": "apps/api/src/review/gate.ts",
                    "startLine": 5,
                    "endLine": 60,
                    "symbol": "approve",
                }
            ]
        },
        rule_concepts={
            "rule-review": "Human review of automated decisions",
            "rule-blind": "Unmapped obligation",
        },
        required_evidence={"rule-review": ["CONTROL"]},
        intelligence_pack=_PACK,
        commit_sha="c0ffee",
        context_revision=4,
        rule_catalog_version="catalog-v1",
        legal_corpus_version="corpus-v1",
        scanner_artifact_version="sha256:scanner",
    )
    kwargs.update(overrides)
    return build_rule_investigation_plan(**kwargs)


def test_every_selected_rule_has_starting_locations_or_needs_enrichment() -> None:
    plan = _plan()

    routed = plan_item(plan, "rule-review")
    assert routed["state"] == RULE_PLAN_STATES["selected"]
    assert routed["startingLocations"][0]["path"] == "apps/api/src/review/gate.ts"
    assert routed["fallbackPolicy"] == FALLBACK_POLICIES["seedFirstNoGlobal"]

    # A rule the Scanner never anchored is never allowed to start blind.
    blind = plan_item(plan, "rule-blind")
    assert blind["state"] == RULE_PLAN_STATES["needsScannerEnrichment"]
    assert blind["startingLocations"] == []
    assert blind["fallbackPolicy"] == FALLBACK_POLICIES["enrichmentRequired"]
    assert plan["needsScannerEnrichmentRuleIds"] == ["rule-blind"]


def test_scanner_pack_supplies_locations_when_the_rule_has_no_seed() -> None:
    plan = _plan(
        selected_rule_ids=["rule-human-review"],
        candidate_rule_ids=["rule-human-review"],
        rule_seeds={},
        rule_concepts={"rule-human-review": "Human review before an AI decision takes effect"},
        required_evidence={},
    )

    item = plan_item(plan, "rule-human-review")
    paths = [location["path"] for location in item["startingLocations"]]
    assert item["state"] == RULE_PLAN_STATES["selected"]
    assert "apps/api/src/review/gate.ts" in paths
    # Graph hints come from the index-qualified names of those locations.
    assert item["graphHints"] == ["apps.api.src.review.HumanReviewGate"]


def test_every_selected_rule_carries_the_bounded_budget() -> None:
    item = plan_item(_plan(), "rule-review")

    assert item["budget"] == dict(DEFAULT_RULE_BUDGET)
    assert item["budget"]["maxGlobalSearches"] == 0
    assert item["budget"]["maxModelCalls"] == 1


def test_related_rules_share_a_batch_group() -> None:
    plan = _plan(
        selected_rule_ids=["rule-a", "rule-b"],
        candidate_rule_ids=["rule-a", "rule-b"],
        rule_seeds={
            "rule-a": [{"path": "apps/api/src/review/gate.ts", "startLine": 5}],
            "rule-b": [{"path": "apps/api/src/review/audit.ts", "startLine": 2}],
        },
        rule_concepts={},
        required_evidence={},
    )

    groups = batch_groups(plan)
    assert groups == {"apps/api/src/review": ["rule-a", "rule-b"]}


def test_plan_is_reused_across_equivalent_reruns_but_not_across_real_changes() -> None:
    base = dict(
        commit_sha="c0ffee",
        context_revision=4,
        rule_catalog_version="catalog-v1",
        legal_corpus_version="corpus-v1",
        scanner_artifact_version="sha256:scanner",
        candidate_rule_ids=["rule-a", "rule-b"],
    )
    key = rule_investigation_plan_key(**base)

    # Rerun/Continue: a different workflow run is not part of the identity.
    assert rule_investigation_plan_key(**{**base, "candidate_rule_ids": ["rule-b", "rule-a"]}) == key
    # Anything the Planner actually decided from changes the plan.
    assert rule_investigation_plan_key(**{**base, "commit_sha": "beef"}) != key
    assert rule_investigation_plan_key(**{**base, "context_revision": 5}) != key
    assert rule_investigation_plan_key(**{**base, "rule_catalog_version": "v2"}) != key
    assert rule_investigation_plan_key(**{**base, "legal_corpus_version": "v2"}) != key
    assert rule_investigation_plan_key(**{**base, "scanner_artifact_version": "sha256:new"}) != key
    assert rule_investigation_plan_key(**{**base, "planner_version": "9.9.9"}) != key


def test_rules_waiting_on_customer_context_are_not_routed() -> None:
    plan = _plan(needs_context_rule_ids=["rule-review"])

    assert plan_item(plan, "rule-review") is None
    assert plan["needsContextRuleIds"] == ["rule-review"]


def test_plan_records_its_inputs_for_downstream_cache_identity() -> None:
    plan = _plan()

    assert plan["commitSha"] == "c0ffee"
    assert plan["contextRevision"] == 4
    assert plan["scannerArtifactVersion"] == "sha256:scanner"
    assert plan["planKey"] == rule_investigation_plan_key(
        commit_sha="c0ffee",
        context_revision=4,
        rule_catalog_version="catalog-v1",
        legal_corpus_version="corpus-v1",
        scanner_artifact_version="sha256:scanner",
        candidate_rule_ids=["rule-review", "rule-blind", "rule-skip"],
    )
