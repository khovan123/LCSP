"""Deterministic repair for evidence refs the API refuses to authorize.

The worker-side turn ledger authorizes every ref a governed tool returned during
the Interview turn (for example PGE source locators). The API authorizes a
narrower, persisted set derived from the accepted Technical Evidence Report. A
ref outside that set is rejected with ``INTERVIEW_EVIDENCE_REF_UNAUTHORIZED``
and names the offending ref in ``meta.unauthorizedRef``.

Dropping that ref only narrows the provenance a candidate claims, so the worker
can strip it and re-submit instead of failing the whole run. The API guard stays
authoritative: every re-submission is validated again.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any, TypeVar

import structlog

from tools.common.capabilities.platform.api_client import (
    InterviewDecisionRepairableCallbackError,
)

logger = structlog.get_logger(__name__)

EVIDENCE_REF_UNAUTHORIZED_CODE = "INTERVIEW_EVIDENCE_REF_UNAUTHORIZED"

_EVIDENCE_REF_LIST_KEYS = frozenset({
    "evidenceRefs",
    "evidence_refs",
    "governedEvidenceRefs",
    "governed_evidence_refs",
    "whyEvidenceRefs",
})
# Each accepted repair removes one distinct ref, so this only bounds a
# misbehaving API that keeps naming refs the payload does not contain.
_MAX_REF_REPAIRS = 32

T = TypeVar("T")


def strip_evidence_ref(
    payload: Any,
    ref: str,
    *,
    fallback_refs: Iterable[str] = (),
) -> bool:
    """Remove ``ref`` from every evidence-ref list in ``payload``, in place.

    A list emptied by the removal is refilled with ``fallback_refs`` so a
    question keeps pointing at governed provenance. Returns whether anything
    was removed.
    """
    target = str(ref).strip()
    if not target:
        return False
    fallback = [
        cleaned
        for cleaned in dict.fromkeys(str(item).strip() for item in fallback_refs)
        if cleaned and cleaned != target
    ]
    removed = False

    def _walk(item: Any) -> None:
        nonlocal removed
        if isinstance(item, dict):
            for key, value in item.items():
                if key in _EVIDENCE_REF_LIST_KEYS and isinstance(value, list):
                    kept = [
                        entry
                        for entry in value
                        if not (isinstance(entry, str) and entry.strip() == target)
                    ]
                    if len(kept) != len(value):
                        removed = True
                        item[key] = kept or list(fallback)
                else:
                    _walk(value)
        elif isinstance(item, list):
            for entry in item:
                _walk(entry)

    _walk(payload)
    return removed


def post_with_evidence_ref_repair(
    post: Callable[[dict], T],
    payload: dict,
    *,
    fallback_refs: Iterable[str] = (),
    assessment_id: str = "",
) -> T:
    """POST ``payload``, stripping each ref the API rejects as unauthorized.

    Any other rejection, or an unauthorized ref the payload does not carry,
    propagates unchanged.
    """
    fallback = tuple(fallback_refs)
    repairs = 0
    while True:
        try:
            return post(payload)
        except InterviewDecisionRepairableCallbackError as exc:
            if exc.error_code != EVIDENCE_REF_UNAUTHORIZED_CODE or repairs >= _MAX_REF_REPAIRS:
                raise
            rejected = exc.meta.get("unauthorizedRef")
            if not isinstance(rejected, str) or not strip_evidence_ref(
                payload, rejected, fallback_refs=fallback
            ):
                raise
            repairs += 1
            # The rejected ref may be a source locator; log only the count.
            logger.warning(
                "INTERVIEW_EVIDENCE_REF_UNAUTHORIZED_STRIPPED",
                assessment_id=assessment_id,
                repairs=repairs,
            )
