from __future__ import annotations

from dataclasses import dataclass

from .tools.tool_base import ToolExecutionResult


@dataclass(frozen=True)
class ToolProvenance:
    tool_name: str
    tool_version: str
    config_hash: str
    outcome: str


class ToolRegistry:
    def __init__(self) -> None:
        self._results: list[ToolExecutionResult] = []

    def register(self, result: ToolExecutionResult) -> None:
        self._results.append(result)

    def all(self) -> list[ToolProvenance]:
        return [
            ToolProvenance(
                tool_name=result.tool_name,
                tool_version=result.tool_version,
                config_hash=result.config_hash,
                outcome=result.outcome,
            )
            for result in self._results
        ]
