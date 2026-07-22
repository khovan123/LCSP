from __future__ import annotations

from collections import defaultdict
from dataclasses import replace

from lcsp_workers.scanner.tools.syft_tool import SBOMEntry

from .dependency_fact import (
    DependencyUsageFact,
    PackageDependency,
    USAGE_DECLARED,
    USAGE_MISSING,
    USAGE_TRANSITIVE,
    USAGE_USED,
    is_ai_package,
    normalize_package_name,
)


class DependencyNormalizer:
    def normalize(
        self,
        *,
        sbom_entries: list[SBOMEntry],
        usage_facts: list[DependencyUsageFact],
    ) -> list[PackageDependency]:
        facts_by_package: dict[str, list[DependencyUsageFact]] = defaultdict(list)
        for fact in usage_facts:
            facts_by_package[normalize_package_name(fact.package_name)].append(fact)

        packages: dict[str, PackageDependency] = {}

        for entry in sbom_entries:
            key = normalize_package_name(entry.name)
            facts = list(facts_by_package.pop(key, []))
            if not facts:
                facts.append(
                    DependencyUsageFact(
                        package_name=entry.name,
                        version=entry.version or None,
                        ecosystem=entry.ecosystem,
                        usage_state=self._sbom_only_state(entry),
                        source_tool="syft",
                        file_refs=[entry.location] if entry.location else [],
                        is_ai_relevant=is_ai_package(entry.name),
                    )
                )

            packages[key] = PackageDependency(
                name=entry.name,
                version=entry.version or None,
                ecosystem=entry.ecosystem,
                purl=entry.purl or None,
                usage_facts=self._normalize_ai_flags(facts),
                confidence_boost=self._confidence_boost(facts),
                is_ai_relevant=is_ai_package(entry.name),
            )

        for key, facts in facts_by_package.items():
            first = facts[0]
            packages[key] = PackageDependency(
                name=first.package_name,
                version=first.version,
                ecosystem=first.ecosystem,
                purl=None,
                usage_facts=self._normalize_ai_flags(facts),
                confidence_boost=self._confidence_boost(facts),
                is_ai_relevant=is_ai_package(first.package_name),
            )

        return [packages[key] for key in sorted(packages)]

    def _sbom_only_state(self, entry: SBOMEntry) -> str:
        location = entry.location.lower()
        if any(name in location for name in ("lock", "node_modules", "site-packages")):
            return USAGE_TRANSITIVE
        return USAGE_DECLARED

    def _confidence_boost(self, facts: list[DependencyUsageFact]) -> float:
        confirming_tools = {
            fact.source_tool
            for fact in facts
            if fact.usage_state in {USAGE_USED, USAGE_MISSING}
        }
        return min(0.15, round(0.05 * len(confirming_tools), 2))

    def _normalize_ai_flags(
        self, facts: list[DependencyUsageFact]
    ) -> list[DependencyUsageFact]:
        return [
            replace(fact, is_ai_relevant=is_ai_package(fact.package_name))
            for fact in facts
        ]
