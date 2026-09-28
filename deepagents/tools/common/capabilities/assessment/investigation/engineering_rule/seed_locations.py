"""Where the Scanner already found a rule's evidence, for the Investigator to start from.

Program Evidence Graph nodes carry the source location the Scanner observed them
at. Investigation packets hold the rule's seed nodes; surfacing their locations
lets the Investigator open and trace those places first instead of rediscovering
the repository with broad searches.
"""

from __future__ import annotations

from typing import Any

from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    InvestigationPacket,
)

MAX_START_LOCATIONS = 20


def node_source_location(node: dict[str, Any]) -> dict[str, Any] | None:
    source = node.get("source")
    if not isinstance(source, dict):
        return None
    file_path = source.get("file_path") or source.get("filePath")
    if not isinstance(file_path, str) or not file_path:
        return None
    location: dict[str, Any] = {"path": file_path}
    for key, target in (
        ("start_line", "startLine"),
        ("end_line", "endLine"),
        ("symbol_ref", "symbol"),
    ):
        value = source.get(key)
        if value not in (None, ""):
            location[target] = value
    return location


def starting_source_locations(packet: InvestigationPacket) -> list[dict[str, Any]]:
    """Distinct source locations of the rule's seed evidence, in seed order."""
    seen: set[tuple[Any, ...]] = set()
    locations: list[dict[str, Any]] = []
    for item in packet.initial_results:
        if not isinstance(item, dict):
            continue
        for node in item.get("nodes") or ():
            if not isinstance(node, dict):
                continue
            location = node_source_location(node)
            if location is None:
                continue
            key = (location["path"], location.get("startLine"), location.get("symbol"))
            if key in seen:
                continue
            seen.add(key)
            locations.append({**location, "label": node.get("label")})
            if len(locations) >= MAX_START_LOCATIONS:
                return locations
    return locations


__all__ = ["node_source_location", "starting_source_locations"]
