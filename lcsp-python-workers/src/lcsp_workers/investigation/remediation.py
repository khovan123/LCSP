"""Evidence-bound remediation proposals; a proposal never closes a finding."""
from __future__ import annotations
from dataclasses import asdict, dataclass
from typing import Any
@dataclass(frozen=True)
class RemediationSuggestion:
    remediation_id: str; finding_ref: str; problem: str; why_it_matters: str; locations: tuple[dict[str, Any], ...]; suggested_changes: tuple[str, ...]; verification_steps: tuple[str, ...]; evidence_refs: tuple[str, ...]; status: str = "PROPOSED"
    def to_dict(self): return asdict(self)
