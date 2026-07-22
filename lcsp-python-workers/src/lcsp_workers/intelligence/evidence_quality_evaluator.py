from __future__ import annotations

from dataclasses import dataclass
from typing import Any


EVIDENCE_QUALITY_HIGH = "high"
EVIDENCE_QUALITY_MEDIUM = "medium"
EVIDENCE_QUALITY_LOW = "low"
EVIDENCE_QUALITY_INSUFFICIENT = "insufficient"

CRITICAL_TOOL_NAMES = ("syft", "semgrep")


@dataclass(frozen=True)
class EvidenceQualityResult:
    evidence_quality: str
    coverage_notes: list[str]
    tool_coverage: dict[str, bool]


class EvidenceQualityEvaluator:
    def evaluate(
        self,
        *,
        tools_version: dict[str, str],
        tool_failures: list[dict[str, Any]],
        ai_usage_signals: list[dict[str, Any]],
        coverage_notes: list[str],
    ) -> EvidenceQualityResult:
        tool_coverage = self._tool_coverage(tools_version, tool_failures)
        critical_tools_failed = [
            name for name in CRITICAL_TOOL_NAMES if tool_coverage.get(name) is False
        ]

        if len(critical_tools_failed) == len(CRITICAL_TOOL_NAMES):
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_INSUFFICIENT,
                coverage_notes=self._coverage_notes(
                    coverage_notes,
                    critical_tools_failed,
                ),
                tool_coverage=tool_coverage,
            )

        if critical_tools_failed:
            return EvidenceQualityResult(
                evidence_quality=EVIDENCE_QUALITY_MEDIUM,
                coverage_notes=self._coverage_notes(
                    coverage_notes,
                    critical_tools_failed,
                ),
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

    def _tool_coverage(
        self,
        tools_version: dict[str, str],
        tool_failures: list[dict[str, Any]],
    ) -> dict[str, bool]:
        failed_tools = {
            str(record.get("tool_name", "")).strip()
            for record in tool_failures
            if record.get("tool_name")
        }
        available_tools = {str(name) for name in tools_version}

        semgrep_available = any(name.startswith("semgrep") for name in available_tools)
        semgrep_failed = any(name.startswith("semgrep") for name in failed_tools)

        coverage = {
            "syft": "syft" in available_tools and "syft" not in failed_tools,
            "semgrep": semgrep_available and not semgrep_failed,
        }

        for tool_name in sorted(available_tools - {"syft"}):
            if tool_name.startswith("semgrep"):
                continue
            coverage[tool_name] = tool_name not in failed_tools

        return coverage

    def _coverage_notes(
        self,
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

