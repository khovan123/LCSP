"""Evaluate Deep Agent repository evidence quality from runtime coverage."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


EVIDENCE_QUALITY_HIGH = "high"
EVIDENCE_QUALITY_MEDIUM = "medium"
EVIDENCE_QUALITY_LOW = "low"
EVIDENCE_QUALITY_INSUFFICIENT = "insufficient"

CRITICAL_TOOL_NAMES = ("deepagents", "repository-analysis")


@dataclass(frozen=True)
class EvidenceQualityResult:
    """Evidence quality classification and the runtime coverage facts behind it."""

    evidence_quality: str
    coverage_notes: list[str]
    tool_coverage: dict[str, bool]


class EvidenceQualityEvaluator:
    """Derive quality from the Deep Agent analysis runtime and reported coverage."""

    def evaluate(
        self,
        *,
        tools_version: dict[str, str],
        tool_failures: list[dict[str, Any]],
        ai_usage_signals: list[dict[str, Any]],
        coverage_notes: list[str],
        ai_discovery_gate: str | None = None,
    ) -> EvidenceQualityResult:
        tool_coverage = self._tool_coverage(tools_version, tool_failures)
        critical_tools_failed = [
            name for name in CRITICAL_TOOL_NAMES if tool_coverage.get(name) is False
        ]

        if len(critical_tools_failed) == len(CRITICAL_TOOL_NAMES):
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_INSUFFICIENT,
                coverage_notes=self._coverage_notes(
                    coverage_notes, critical_tools_failed
                ),
                tool_coverage=tool_coverage,
            )
        if critical_tools_failed:
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_MEDIUM,
                coverage_notes=self._coverage_notes(
                    coverage_notes, critical_tools_failed
                ),
                tool_coverage=tool_coverage,
            )

        if ai_discovery_gate == "AI_ABSENT_CONFIRMED":
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_HIGH,
                coverage_notes=list(coverage_notes),
                tool_coverage=tool_coverage,
            )
        if not ai_usage_signals:
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_LOW,
                coverage_notes=list(coverage_notes),
                tool_coverage=tool_coverage,
            )
        return EvidenceQualityResult(
            evidence_quality=EVIDENCE_QUALITY_HIGH,
            coverage_notes=list(coverage_notes),
            tool_coverage=tool_coverage,
        )

    @staticmethod
    def _tool_coverage(
        tools_version: dict[str, str],
        tool_failures: list[dict[str, Any]],
    ) -> dict[str, bool]:
        failed_tools = {
            str(record.get("tool_name", "")).strip()
            for record in tool_failures
            if record.get("tool_name")
        }
        available_tools = {str(name) for name in tools_version}
        coverage = {
            name: name in available_tools and name not in failed_tools
            for name in CRITICAL_TOOL_NAMES
        }
        for tool_name in sorted(available_tools):
            coverage[tool_name] = tool_name not in failed_tools
        return coverage

    @staticmethod
    def _coverage_notes(
        existing_notes: list[str],
        failed_tools: list[str],
    ) -> list[str]:
        notes = list(existing_notes)
        if failed_tools:
            notes.append(
                "Evidence coverage is limited because "
                + ", ".join(sorted(failed_tools))
                + " did not produce usable results."
            )
        return notes
