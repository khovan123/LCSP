"""Rule Investigation Plan: routes and budgets the Investigator verifies against.

The Planner decides which EngineeringRules to investigate. This module turns that
decision into a durable plan the Investigator can execute without rediscovering
the repository: for every selected rule, where to start (Scanner-anchored source
locations), what to trace, what evidence is expected, and how much work it may
spend doing it.

A selected rule always carries either starting locations or the explicit
``NEEDS_SCANNER_ENRICHMENT`` state — the Investigator is never allowed to start
blind. Related rules over the same source area share a ``batchGroup`` so their
evidence window can be read once.

The plan is content-addressed by everything that would change it (commit,
confirmed context revision, rule catalog, legal corpus, Scanner artifact,
candidate rules, planner version) and deliberately *not* by the workflow run, so
an equivalent rerun reuses it.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Mapping, Sequence
from hashlib import sha256
from typing import Any

RULE_INVESTIGATION_PLAN_VERSION = "1.0.0"
PLANNER_VERSION = "1.0.0"

RULE_PLAN_STATES = {
    "selected": "SELECTED",
    "skipped": "SKIPPED",
    "needsContext": "NEEDS_CONTEXT",
    "needsScannerEnrichment": "NEEDS_SCANNER_ENRICHMENT",
}

# Deterministic per-rule budget: the Investigator verifies a bounded window, it
# does not explore. Global search is not part of the primary path at all.
DEFAULT_RULE_BUDGET: Mapping[str, int] = {
    "maxGraphQueries": 2,
    "maxFilesRead": 5,
    "maxGlobalSearches": 0,
    "maxModelCalls": 1,
}

FALLBACK_POLICIES = {
    # Broad discovery is never implicit: it needs a recorded reason.
    "seedFirstNoGlobal": "SEED_FIRST_NO_GLOBAL",
    "enrichmentRequired": "ENRICHMENT_REQUIRED",
}

MAX_STARTING_LOCATIONS = 8
MAX_GRAPH_HINTS = 8


def build_rule_investigation_plan(
    *,
    selected_rule_ids: Sequence[str],
    skipped_rule_ids: Sequence[str],
    candidate_rule_ids: Sequence[str],
    rule_seeds: Mapping[str, Sequence[Mapping[str, Any]]],
    rule_concepts: Mapping[str, str] | None = None,
    required_evidence: Mapping[str, Sequence[str]] | None = None,
    intelligence_pack: Mapping[str, Any] | None = None,
    commit_sha: str,
    context_revision: int,
    rule_catalog_version: str,
    legal_corpus_version: str,
    scanner_artifact_version: str | None,
    needs_context_rule_ids: Sequence[str] = (),
) -> dict[str, Any]:
    """Build the durable plan from the Planner's decision plus Scanner memory."""
    concepts = rule_concepts or {}
    evidence = required_evidence or {}
    needs_context = set(needs_context_rule_ids)
    items: list[dict[str, Any]] = []
    enrichment: list[str] = []
    for rule_id in selected_rule_ids:
        if rule_id in needs_context:
            continue
        locations = _starting_locations(
            rule_id, rule_seeds.get(rule_id) or (), concepts.get(rule_id), intelligence_pack
        )
        state = (
            RULE_PLAN_STATES["selected"]
            if locations
            else RULE_PLAN_STATES["needsScannerEnrichment"]
        )
        if not locations:
            enrichment.append(rule_id)
        items.append(
            {
                "ruleId": rule_id,
                "state": state,
                "selectionReason": "PLANNER_SELECTED",
                "requiredEvidence": list(evidence.get(rule_id) or ()),
                "startingLocations": locations,
                "graphHints": _graph_hints(locations),
                "expectedEvidenceTypes": list(evidence.get(rule_id) or ()),
                "budget": dict(DEFAULT_RULE_BUDGET),
                "fallbackPolicy": (
                    FALLBACK_POLICIES["seedFirstNoGlobal"]
                    if locations
                    else FALLBACK_POLICIES["enrichmentRequired"]
                ),
                "batchGroup": _batch_group(locations),
            }
        )
    plan = {
        "planVersion": RULE_INVESTIGATION_PLAN_VERSION,
        "plannerVersion": PLANNER_VERSION,
        "commitSha": commit_sha,
        "contextRevision": context_revision,
        "ruleCatalogVersion": rule_catalog_version,
        "legalCorpusVersion": legal_corpus_version,
        "scannerArtifactVersion": scanner_artifact_version,
        "candidateRuleIds": list(candidate_rule_ids),
        "items": items,
        "skippedRuleIds": list(skipped_rule_ids),
        "needsContextRuleIds": sorted(needs_context),
        "needsScannerEnrichmentRuleIds": enrichment,
    }
    plan["planKey"] = rule_investigation_plan_key(
        commit_sha=commit_sha,
        context_revision=context_revision,
        rule_catalog_version=rule_catalog_version,
        legal_corpus_version=legal_corpus_version,
        scanner_artifact_version=scanner_artifact_version,
        candidate_rule_ids=candidate_rule_ids,
    )
    return plan


def rule_investigation_plan_key(
    *,
    commit_sha: str,
    context_revision: int,
    rule_catalog_version: str,
    legal_corpus_version: str,
    scanner_artifact_version: str | None,
    candidate_rule_ids: Iterable[str],
    planner_version: str = PLANNER_VERSION,
) -> str:
    """Stable identity of one plan across equivalent reruns.

    The workflow run is deliberately excluded: a rerun on the same commit and
    context with the same catalog/corpus/scanner inputs must reuse the plan.
    """
    material = json.dumps(
        {
            "commitSha": commit_sha,
            "contextRevision": int(context_revision or 0),
            "ruleCatalogVersion": rule_catalog_version,
            "legalCorpusVersion": legal_corpus_version,
            "scannerArtifactVersion": scanner_artifact_version,
            "candidateRuleIds": sorted(set(candidate_rule_ids)),
            "plannerVersion": planner_version,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return sha256(material.encode("utf-8")).hexdigest()


def plan_item(plan: Mapping[str, Any] | None, rule_id: str) -> dict[str, Any] | None:
    for item in (plan or {}).get("items") or ():
        if isinstance(item, Mapping) and item.get("ruleId") == rule_id:
            return dict(item)
    return None


def batch_groups(plan: Mapping[str, Any] | None) -> dict[str, list[str]]:
    """Rules grouped by shared source area, so one read serves several rules."""
    groups: dict[str, list[str]] = {}
    for item in (plan or {}).get("items") or ():
        if not isinstance(item, Mapping):
            continue
        group = str(item.get("batchGroup") or "")
        if group:
            groups.setdefault(group, []).append(str(item.get("ruleId")))
    return groups


def _starting_locations(
    rule_id: str,
    seeds: Sequence[Mapping[str, Any]],
    concept: str | None,
    pack: Mapping[str, Any] | None,
) -> list[dict[str, Any]]:
    """Rule seeds first; Scanner pack seeds fill the remainder by domain match."""
    locations = [
        _location(seed, "RULE_SEED") for seed in seeds if _has_path(seed)
    ]
    if len(locations) < MAX_STARTING_LOCATIONS and isinstance(pack, Mapping):
        haystack = f"{rule_id} {concept or ''}".lower()
        domains = pack.get("domainModules") or {}
        for domain, items in domains.items():
            if domain.lower() not in haystack and not _domain_mentioned(domain, haystack):
                continue
            for item in items or ():
                if _has_path(item):
                    locations.append(_location(item, "SCANNER_PACK"))
        for seed in pack.get("seedLocations") or ():
            if len(locations) >= MAX_STARTING_LOCATIONS:
                break
            if _has_path(seed) and _domain_mentioned(str(seed.get("domain") or ""), haystack):
                locations.append(_location(seed, "SCANNER_PACK"))
    return _dedupe(locations)[:MAX_STARTING_LOCATIONS]


def _domain_mentioned(domain: str, haystack: str) -> bool:
    if not domain:
        return False
    # "humanReview" -> "human review"; rule ids/concepts use varied casing.
    words = "".join(f" {char.lower()}" if char.isupper() else char for char in domain)
    return any(word and word in haystack for word in words.split())


def _has_path(location: Mapping[str, Any]) -> bool:
    return bool(isinstance(location, Mapping) and location.get("path"))


def _location(source: Mapping[str, Any], origin: str) -> dict[str, Any]:
    location = {
        "path": source.get("path"),
        "startLine": source.get("startLine"),
        "endLine": source.get("endLine"),
        "symbol": source.get("symbol"),
        "origin": source.get("origin") or origin,
    }
    if source.get("qualifiedName"):
        location["qualifiedName"] = source["qualifiedName"]
    return {key: value for key, value in location.items() if value is not None}


def _dedupe(locations: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for location in locations:
        key = (location.get("path"), location.get("startLine"), location.get("symbol"))
        if key in seen:
            continue
        seen.add(key)
        result.append(dict(location))
    return result


def _graph_hints(locations: Sequence[Mapping[str, Any]]) -> list[str]:
    hints = [
        str(location["qualifiedName"])
        for location in locations
        if location.get("qualifiedName")
    ]
    return hints[:MAX_GRAPH_HINTS]


def _batch_group(locations: Sequence[Mapping[str, Any]]) -> str | None:
    """Group by the directory of the first starting location."""
    for location in locations:
        path = str(location.get("path") or "")
        if path:
            return path.rsplit("/", 1)[0] if "/" in path else path
    return None


__all__ = [
    "DEFAULT_RULE_BUDGET",
    "FALLBACK_POLICIES",
    "PLANNER_VERSION",
    "RULE_INVESTIGATION_PLAN_VERSION",
    "RULE_PLAN_STATES",
    "batch_groups",
    "build_rule_investigation_plan",
    "plan_item",
    "rule_investigation_plan_key",
]
