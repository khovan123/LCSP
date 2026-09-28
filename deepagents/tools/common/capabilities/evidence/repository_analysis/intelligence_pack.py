"""Repository Intelligence Pack: the Scanner's durable repository memory.

The Scanner is the only stage allowed broad repository discovery. It leaves this
pack in the accepted technical evidence so later stages start from what it found
instead of rediscovering the repository:

- identity: which assessment/snapshot/commit/scan/index the pack describes;
- coverage: how complete it is and where the gaps are;
- architectureMap: routes, entry points, channels, queues, schedulers, data
  stores, external integrations and auth boundaries;
- domainModules: where AI, risk, compliance, assessment, human review, data
  flow, incident and disclosure/labeling code lives;
- seedLocations / sourceAnchors / graphHints / highSignalFiles: bounded starting
  points for the Planner and Investigator.

The pack is built deterministically (no model call) from the analysis result,
its evidence graph, and bounded queries against the Codebase Memory index. It
stores locations and labels only — never source text, command output, prompts
or secrets — and passes the same privacy rules the API enforces on evidence.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from typing import Any

from tools.common.capabilities.platform.codebase_memory import (
    CodebaseMemoryGraphReader,
    CodebaseMemoryIndexIdentity,
    GraphLocation,
)

REPOSITORY_INTELLIGENCE_PACK_KEY = "repository_intelligence_pack"
REPOSITORY_INTELLIGENCE_PACK_VERSION = "1.0.0"

COVERAGE_STATES = {"ready": "READY", "partial": "PARTIAL", "failed": "FAILED"}

MAX_LOCATIONS_PER_GROUP = 12
MAX_SEED_LOCATIONS = 120
MAX_SOURCE_ANCHORS = 300
MAX_HIGH_SIGNAL_FILES = 30
MAX_GRAPH_HINTS_PER_GROUP = 25
_SEARCH_LIMIT = 40

# Code symbols only; documentation sections, SQL/migrations, tests and generated
# reports are not where rule evidence lives.
_CODE_LABELS = frozenset({"Function", "Method", "Class", "Interface", "Variable"})
_NOISE_PATH = re.compile(
    r"(^|/)(docs?|docs-vn|tests?|__tests__|spec|fixtures|reports|migrations|node_modules|dist|build|\.next|\.mda)(/|$)"
    r"|\.(md|mdx|sql|snap|lock|json|ya?ml|prisma)$|(^|/)test_[^/]*$|\.(test|spec)\.[jt]sx?$",
    re.IGNORECASE,
)

# Groups are keyword sets, not regexes: the index engine supports plain
# alternation only (no non-capturing groups), and one combined query plus local
# classification keeps the pack at a few CLI calls instead of one per group.
ARCHITECTURE_QUERIES: Mapping[str, tuple[str, ...]] = {
    "entrypoints": ("main", "bootstrap", "handler", "boundary", "controller", "entrypoint"),
    "asyncChannels": ("event", "publish", "subscribe", "outbox", "stream", "emit"),
    "queues": ("queue", "rabbit", "kafka", "consumer", "producer", "amqp", "sqs"),
    "schedulers": ("cron", "schedul", "interval", "reconcil", "periodic"),
    "dataStores": ("prisma", "repository", "database", "dao", "store", "cache", "redis"),
    "externalIntegrations": ("client", "sdk", "webhook", "integration", "gateway"),
    "authBoundaries": ("auth", "guard", "rbac", "permission", "session", "jwt", "oauth"),
}

DOMAIN_QUERIES: Mapping[str, tuple[str, ...]] = {
    "ai": ("openai", "anthropic", "llm", "gemini", "langchain", "embedding",
           "completion", "inference", "agent", "model"),
    "risk": ("risk", "tier", "severity", "hazard"),
    "compliance": ("complian", "legal", "regulat", "policy", "obligation"),
    "assessment": ("assessment", "evaluat", "classif", "dossier"),
    "humanReview": ("humanreview", "human_review", "approv", "oversight",
                    "reviewer", "signoff", "override"),
    "dataFlow": ("personal", "pii", "consent", "retention", "export", "lineage",
                 "redact", "anonymi"),
    "incident": ("incident", "alert", "audit", "monitor", "anomal"),
    "disclosureLabeling": ("disclos", "watermark", "provenance", "transparen", "label"),
}
# One query per code label keeps documentation/data rows from filling the limit.
_QUERY_LABELS = ("Class", "Function", "Method")
_COMBINED_LIMIT = 250
MAX_ROUTES = 60


def _keyword_pattern(keywords: Iterable[str]) -> str:
    return ".*(" + "|".join(sorted(set(keywords))) + ").*"


# Mirrors apps/api EvidenceSchemaValidatorService FORBIDDEN_EVIDENCE_KEYS: a pack
# carrying any of these key names would make the API reject the whole callback.
FORBIDDEN_PACK_KEYS = frozenset(
    {
        "codesnippet", "filecontent", "rawoutput", "rawsource", "rawsourcecode",
        "snippet", "sourcecode", "sourcecontent", "prompt", "prompttext",
        "fullprompt", "astbody", "fullast", "astdump", "secret", "token",
        "apikey", "apitoken", "authorization", "credential", "password",
    }
)
_MAX_TEXT = 300


def build_repository_intelligence_pack(
    *,
    evidence_payload: Mapping[str, Any],
    assessment_id: str | None,
    snapshot_id: str,
    commit_sha: str,
    scan_job_id: str,
    scanner_version: str,
    index: CodebaseMemoryIndexIdentity | None,
    graph_reader: CodebaseMemoryGraphReader | None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build the pack from scan output plus bounded index queries."""
    graph = evidence_payload.get("evidence_graph") or {}
    nodes = [node for node in graph.get("nodes") or () if isinstance(node, Mapping)]
    ai_discovery = evidence_payload.get("ai_discovery") or {}
    limitations: list[str] = []

    scanner_seeds = _scanner_seed_locations(nodes, ai_discovery)
    architecture: dict[str, list[dict[str, Any]]] = {}
    domains: dict[str, list[dict[str, Any]]] = {}
    routes: list[str] = []
    if graph_reader is None or index is None:
        limitations.append("CODEBASE_MEMORY_INDEX_UNAVAILABLE")
        architecture = {key: [] for key in ARCHITECTURE_QUERIES}
        domains = {key: [] for key in DOMAIN_QUERIES}
    else:
        routes = graph_reader.route_names(limit=MAX_ROUTES)
        groups = _classify_locations(_search_all(graph_reader))
        architecture = {key: groups.get(key, []) for key in ARCHITECTURE_QUERIES}
        domains = {key: groups.get(key, []) for key in DOMAIN_QUERIES}

    # The Scanner's own findings are the strongest seeds for their domain.
    for seed in scanner_seeds:
        domain = seed.get("domain")
        if domain in domains:
            domains[domain] = _dedupe([seed, *domains[domain]])[:MAX_LOCATIONS_PER_GROUP]

    seeds = _dedupe(
        [
            *scanner_seeds,
            *(
                {**location, "domain": domain}
                for domain, locations in domains.items()
                for location in locations
            ),
        ]
    )[:MAX_SEED_LOCATIONS]
    anchors = _source_anchors(graph)
    coverage = _coverage(evidence_payload, graph, nodes, limitations)
    pack: dict[str, Any] = {
        "packVersion": REPOSITORY_INTELLIGENCE_PACK_VERSION,
        "identity": {
            "assessmentId": assessment_id,
            "repositorySnapshotId": snapshot_id,
            "commitSha": commit_sha,
            "scanJobId": scan_job_id,
            # The accepted report is keyed 1:1 by scan job; the API adds its id.
            "evidenceReportId": None,
            "scannerVersion": scanner_version,
            **(
                index.to_dict()
                if index is not None
                else {
                    "codebaseMemoryProjectId": None,
                    "codebaseMemoryIndexStamp": None,
                    "codebaseMemoryIndexReused": False,
                }
            ),
        },
        "coverageState": coverage,
        "architectureMap": {
            "languages": list(evidence_payload.get("languages") or []),
            "frameworks": list(evidence_payload.get("frameworks") or []),
            "routes": [_route_name(name) for name in routes],
            **architecture,
        },
        "domainModules": domains,
        "sourceAnchors": anchors,
        "seedLocations": seeds,
        "graphHints": _graph_hints(nodes, domains),
        "highSignalFiles": _high_signal_files(seeds, anchors),
        "limitations": limitations,
    }
    pack = sanitize_pack(pack)
    # Content identity (timestamps excluded) keys every downstream cache.
    pack["artifactVersion"] = pack_content_version(pack)
    stamp = (now or datetime.now(timezone.utc)).isoformat()
    pack["createdAt"] = stamp
    pack["updatedAt"] = stamp
    return pack


def summarize_pack_for_interview(pack: Mapping[str, Any] | None) -> dict[str, Any]:
    """Customer-safe, high-level view of Scanner memory for Interview grounding.

    Question wording must never expose file paths, symbols or rule identifiers, so
    this carries only what the repository *does* — languages, frameworks, which
    domain areas exist, AI discovery and coverage — never where.
    """
    if not isinstance(pack, Mapping):
        return {"available": False}
    architecture = pack.get("architectureMap") or {}
    coverage = pack.get("coverageState") or {}
    domains = pack.get("domainModules") or {}
    return {
        "available": True,
        "scannerArtifactVersion": pack.get("artifactVersion"),
        "languages": list(architecture.get("languages") or []),
        "frameworks": list(architecture.get("frameworks") or []),
        "surfaceCounts": {
            key: len(architecture.get(key) or [])
            for key in ("routes", "entrypoints", "asyncChannels", "queues",
                        "schedulers", "dataStores", "externalIntegrations",
                        "authBoundaries")
        },
        "domainAreasPresent": sorted(
            domain for domain, items in domains.items() if items
        ),
        "coverage": {
            "global": coverage.get("global"),
            "aiDiscovery": coverage.get("aiDiscovery"),
            "sourceCoverageGaps": list(coverage.get("sourceCoverageGaps") or []),
            "unresolvedFrontiers": list(coverage.get("unresolvedFrontiers") or []),
        },
    }


def pack_content_version(pack: Mapping[str, Any]) -> str:
    body = {
        key: value
        for key, value in pack.items()
        if key not in {"artifactVersion", "createdAt", "updatedAt"}
    }
    return "sha256:" + hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()


def repository_intelligence_pack_from_evidence(
    evidence_report: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    """Read the pack from an accepted evidence report (any payload key casing)."""
    if not isinstance(evidence_report, Mapping):
        return None
    payload = (
        evidence_report.get("evidence_payload")
        or evidence_report.get("evidencePayload")
        or evidence_report
    )
    if not isinstance(payload, Mapping):
        return None
    pack = payload.get(REPOSITORY_INTELLIGENCE_PACK_KEY) or payload.get(
        "repositoryIntelligencePack"
    )
    return dict(pack) if isinstance(pack, Mapping) else None


def sanitize_pack(value: Any) -> Any:
    """Drop forbidden keys, flatten multi-line text, bound string length."""
    if isinstance(value, str):
        text = " ".join(value.split())
        return text[:_MAX_TEXT]
    if isinstance(value, Mapping):
        return {
            str(key): sanitize_pack(entry)
            for key, entry in value.items()
            if re.sub(r"[^A-Za-z0-9]", "", str(key)).lower() not in FORBIDDEN_PACK_KEYS
        }
    if isinstance(value, (list, tuple)):
        return [sanitize_pack(entry) for entry in value]
    return value


def _search_all(reader: CodebaseMemoryGraphReader) -> list[GraphLocation]:
    """One query per code label using every group's pattern at once."""
    combined = _keyword_pattern(
        keyword
        for keywords in (*ARCHITECTURE_QUERIES.values(), *DOMAIN_QUERIES.values())
        for keyword in keywords
    )
    rows: list[GraphLocation] = []
    for label in _QUERY_LABELS:
        rows.extend(
            reader.search(name_pattern=combined, label=label, limit=_COMBINED_LIMIT)
        )
    return rows


def _classify_locations(
    rows: Iterable[GraphLocation],
) -> dict[str, list[dict[str, Any]]]:
    """Assign each row to every group whose own pattern it matches."""
    patterns = {
        key: re.compile(_keyword_pattern(keywords), re.IGNORECASE)
        for key, keywords in (*ARCHITECTURE_QUERIES.items(), *DOMAIN_QUERIES.items())
    }
    groups: dict[str, list[dict[str, Any]]] = {key: [] for key in patterns}
    for row in rows:
        if row.label not in _CODE_LABELS or _NOISE_PATH.search(row.path):
            continue
        name = row.qualified_name.rsplit(".", 1)[-1]
        for key, pattern in patterns.items():
            if len(groups[key]) < MAX_LOCATIONS_PER_GROUP and pattern.fullmatch(name):
                groups[key].append(_location(row))
    return {key: _dedupe(value) for key, value in groups.items()}


def _route_name(qualified_name: str) -> str:
    # "__route__ANY__/api/x" -> "ANY /api/x"
    match = re.match(r"__route__(?P<method>[A-Z]+)__(?P<path>.*)$", qualified_name)
    return f"{match['method']} {match['path']}" if match else qualified_name


def _location(row: GraphLocation) -> dict[str, Any]:
    return {
        "path": row.path,
        "startLine": row.start_line,
        "endLine": row.end_line,
        "symbol": row.qualified_name.rsplit(".", 1)[-1],
        "qualifiedName": row.qualified_name,
        "kind": row.label,
        "origin": "CODEBASE_MEMORY",
    }


def _scanner_seed_locations(
    nodes: Iterable[Mapping[str, Any]], ai_discovery: Mapping[str, Any]
) -> list[dict[str, Any]]:
    seeds: list[dict[str, Any]] = []
    for node in nodes:
        source = node.get("source")
        if not isinstance(source, Mapping) or not source.get("file_path"):
            continue
        seeds.append(
            {
                "path": source["file_path"],
                "startLine": source.get("start_line"),
                "endLine": source.get("end_line"),
                "symbol": source.get("symbol_ref") or node.get("label"),
                "nodeId": node.get("node_id"),
                "kind": node.get("node_type"),
                "domain": _domain_for(node),
                "origin": "SCANNER_GRAPH",
            }
        )
    for finding in ai_discovery.get("findings") or ():
        ref = finding.get("snippet_ref") if isinstance(finding, Mapping) else None
        if isinstance(ref, Mapping) and ref.get("file_path"):
            seeds.append(
                {
                    "path": ref["file_path"],
                    "startLine": ref.get("start_line"),
                    "endLine": ref.get("end_line"),
                    "symbol": ref.get("symbol"),
                    "kind": finding.get("kind"),
                    "domain": "ai",
                    "origin": "SCANNER_AI_FINDING",
                }
            )
    return _dedupe(seeds)


def _domain_for(node: Mapping[str, Any]) -> str | None:
    text = " ".join(
        [str(node.get("node_type") or ""), str(node.get("label") or ""),
         *map(str, node.get("semantic_types") or ())]
    ).lower()
    for domain, keywords in DOMAIN_QUERIES.items():
        if any(keyword in text for keyword in keywords):
            return domain
    return None


def _dedupe(locations: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for location in locations:
        key = (location.get("path"), location.get("startLine"), location.get("symbol"))
        if key in seen:
            continue
        seen.add(key)
        result.append({k: v for k, v in dict(location).items() if v is not None})
    return result


def _source_anchors(graph: Mapping[str, Any]) -> list[dict[str, Any]]:
    anchors = []
    for anchor in (graph.get("source_anchors") or ())[:MAX_SOURCE_ANCHORS]:
        if not isinstance(anchor, Mapping):
            continue
        anchors.append(
            {
                "anchorId": anchor.get("anchor_id"),
                "path": anchor.get("file_path"),
                "startLine": anchor.get("start_line"),
                "endLine": anchor.get("end_line"),
                "symbol": anchor.get("symbol_ref"),
                "sourceHash": anchor.get("source_hash"),
            }
        )
    return anchors


def _coverage(
    payload: Mapping[str, Any],
    graph: Mapping[str, Any],
    nodes: list[Mapping[str, Any]],
    limitations: list[str],
) -> dict[str, Any]:
    def state(raw: Any) -> str:
        value = str(raw or "").upper()
        if value == "READY":
            return COVERAGE_STATES["ready"]
        if value == "PARTIAL":
            return COVERAGE_STATES["partial"]
        return COVERAGE_STATES["failed"]

    ai = payload.get("ai_discovery") or {}
    notes = [str(note) for note in payload.get("coverageLimitations") or ()]
    unanchored = sum(1 for node in nodes if not node.get("source"))
    graph_gaps = []
    if unanchored:
        graph_gaps.append(f"{unanchored} scanner graph node(s) have no source location")
    if "CODEBASE_MEMORY_INDEX_UNAVAILABLE" in limitations:
        graph_gaps.append("Codebase Memory index was not available to the Scanner")
    global_state = state(payload.get("technicalCoverageState"))
    if global_state == "READY" and graph_gaps:
        global_state = COVERAGE_STATES["partial"]
    return {
        "global": global_state,
        "aiDiscovery": state(ai.get("coverage_state")),
        "sourceCoverageGaps": notes,
        "graphCoverageGaps": graph_gaps,
        "excludedOrGeneratedAreas": [
            note for note in notes
            if re.search(r"exclud|generat|vendor|skipp|ignored", note, re.IGNORECASE)
        ],
        "unresolvedFrontiers": [
            *map(str, graph.get("unresolved_frontiers") or ()),
            *map(str, ai.get("material_unresolved_frontiers") or ()),
        ],
    }


def _graph_hints(
    nodes: list[Mapping[str, Any]], domains: Mapping[str, list[dict[str, Any]]]
) -> dict[str, Any]:
    return {
        "scannerNodeTypes": sorted({str(node.get("node_type")) for node in nodes}),
        "domainSymbols": {
            domain: [
                location["qualifiedName"]
                for location in locations
                if location.get("qualifiedName")
            ][:MAX_GRAPH_HINTS_PER_GROUP]
            for domain, locations in domains.items()
        },
    }


def _high_signal_files(
    seeds: list[dict[str, Any]], anchors: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    counts = Counter(
        [seed["path"] for seed in seeds if seed.get("path")]
        + [anchor["path"] for anchor in anchors if anchor.get("path")]
    )
    return [
        {"path": path, "signalCount": count}
        for path, count in counts.most_common(MAX_HIGH_SIGNAL_FILES)
    ]


__all__ = [
    "REPOSITORY_INTELLIGENCE_PACK_KEY",
    "summarize_pack_for_interview",
    "REPOSITORY_INTELLIGENCE_PACK_VERSION",
    "build_repository_intelligence_pack",
    "pack_content_version",
    "repository_intelligence_pack_from_evidence",
    "sanitize_pack",
]
