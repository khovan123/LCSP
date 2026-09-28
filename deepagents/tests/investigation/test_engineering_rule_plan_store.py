from __future__ import annotations

import json

from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    EvidenceClaim,
)
from tools.common.capabilities.assessment.planning.engineering_rule.plan_store import (
    EphemeralEngineeringRulePlanStore,
    deserialize_claims,
    serialize_claims,
)


def _claim(claim_id: str) -> EvidenceClaim:
    return EvidenceClaim(
        claim_id=claim_id,
        engineering_rule_id="eng-1",
        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
        value=None,
        evidence_refs=(),
        confidence=0,
    )


def test_claim_cache_envelope_requires_matching_investigation_version() -> None:
    payload = serialize_claims([_claim("claim-v1")], investigation_version="v1")

    assert json.loads(payload)["investigationVersion"] == "v1"
    assert deserialize_claims(
        payload,
        expected_investigation_version="v2",
    ) is None
    restored = deserialize_claims(
        payload,
        expected_investigation_version="v1",
    )
    assert [claim.claim_id for claim in restored or ()] == ["claim-v1"]


def test_legacy_unversioned_claim_rows_are_cache_misses() -> None:
    legacy_payload = json.dumps([_claim("legacy").to_dict()])

    assert deserialize_claims(
        legacy_payload,
        expected_investigation_version="v1",
    ) is None


def test_recomputed_claims_replace_a_stale_version_without_schema_change() -> None:
    store = EphemeralEngineeringRulePlanStore()
    store.put_rule_claims(
        "plan-1",
        "eng-1",
        [_claim("claim-v1")],
        investigation_version="v1",
    )

    assert (
        store.get_rule_claims(
            "plan-1",
            "eng-1",
            investigation_version="v2",
        )
        is None
    )

    store.put_rule_claims(
        "plan-1",
        "eng-1",
        [_claim("claim-v2")],
        investigation_version="v2",
    )
    restored = store.get_rule_claims(
        "plan-1",
        "eng-1",
        investigation_version="v2",
    )
    assert [claim.claim_id for claim in restored or ()] == ["claim-v2"]
    assert (
        store.get_rule_claims(
            "plan-1",
            "eng-1",
            investigation_version="v1",
        )
        is None
    )
