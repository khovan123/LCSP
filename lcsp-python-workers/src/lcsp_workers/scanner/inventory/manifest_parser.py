from __future__ import annotations

from pathlib import Path

from .manifest_rules import MAX_MANIFEST_FILES, ManifestRule, build_manifest_rules
from .manifest_types import ManifestFact, ManifestParseResult


class ManifestParser:
    def __init__(
        self,
        *,
        rules: list[ManifestRule] | None = None,
        max_manifest_files: int = MAX_MANIFEST_FILES,
    ) -> None:
        self._rules = rules or build_manifest_rules()
        self._max_manifest_files = max_manifest_files

    def parse_workspace(self, workspace_path: str | Path) -> ManifestParseResult:
        workspace = Path(workspace_path).resolve(strict=False)
        candidates = self._discover_candidates(workspace)

        parse_targets = candidates[: self._max_manifest_files]
        skipped = len(candidates) - len(parse_targets)

        facts: list[ManifestFact] = []
        for file_path, rule in parse_targets:
            try:
                facts.append(rule.parser(file_path, workspace))
            except Exception:
                facts.append(
                    ManifestFact(
                        manifest_type=rule.manifest_type,
                        file_path=file_path.resolve(strict=False)
                        .relative_to(workspace)
                        .as_posix(),
                        parse_error=True,
                    )
                )

        coverage_limitations: list[str] = []
        if skipped > 0:
            coverage_limitations.append(
                f"manifest_file_limit_exceeded: parsed={len(parse_targets)} skipped={skipped} limit={self._max_manifest_files}"
            )

        return ManifestParseResult(facts=facts, coverage_limitations=coverage_limitations)

    def _discover_candidates(self, workspace: Path) -> list[tuple[Path, ManifestRule]]:
        matched: dict[Path, ManifestRule] = {}

        for rule in self._rules:
            for pattern in rule.patterns:
                for candidate in workspace.rglob(pattern):
                    if not candidate.is_file():
                        continue
                    resolved = candidate.resolve(strict=False)
                    if resolved not in matched:
                        matched[resolved] = rule

        ordered = sorted(matched.items(), key=lambda item: str(item[0].as_posix()))
        return [(path, rule) for path, rule in ordered]
