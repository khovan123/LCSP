"""Offline LCSP Jev decision evaluation over frozen response fixtures."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from statistics import median
from typing import Any

from .contracts import DECISION_TYPES, DecisionRequest, DecisionResult
from .policy import DEFAULT_DECISION_POLICIES
from .typesafe_client import TypeSafeJevError, _map_response


DEFAULT_DATASET = Path(__file__).with_name("eval_fixtures") / "lcsp_decision_eval_v1.json"
DEFAULT_THRESHOLDS = (0.5, 0.7, 0.8, 0.85, 0.9)


@dataclass(frozen=True)
class EvalRecord:
    record_id: str
    decision_class: str
    risk_tier: str
    expected_decision: Any
    label_source: str
    request: DecisionRequest
    response: dict[str, Any] | None
    fixture_status: str
    latency_ms: int
    baseline_latency_ms: int | None
    removed_generative_calls: int
    baseline_input_tokens: int | None
    baseline_output_tokens: int | None
    artifact_metadata: dict[str, Any]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate LCSP Jev decision fixtures without live credentials."
    )
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET))
    parser.add_argument("--output", default=None)
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--require-policy-pass", action="store_true")
    args = parser.parse_args(argv)

    report = evaluate_dataset(Path(args.dataset))
    encoded = json.dumps(report, indent=2 if args.pretty else None, sort_keys=True)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(encoded + "\n", encoding="utf-8")
    else:
        print(encoded)
    return 1 if args.require_policy_pass and not report["policy"]["passed"] else 0


def evaluate_dataset(path: Path = DEFAULT_DATASET) -> dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    records = [_record(item) for item in raw["records"]]
    dataset_hash = "sha256:" + sha256(
        json.dumps(raw, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    per_version: dict[str, list[tuple[EvalRecord, DecisionResult | None, str | None]]] = defaultdict(list)
    for record in records:
        result: DecisionResult | None = None
        failure: str | None = None
        if record.response is None or record.fixture_status != "OK":
            failure = record.fixture_status
        else:
            try:
                result = _map_response(
                    request=record.request,
                    response=record.response,
                    policy_version=record.request.policy_version or "LCSP_JEV_EVAL_POLICY_V1",
                    latency_ms=record.latency_ms,
                )
            except TypeSafeJevError as exc:
                failure = exc.reason_code
        model_version = result.model_version if result else "NO_PROVIDER_RESULT"
        per_version[model_version].append((record, result, failure))

    version_reports = {
        model_version: _metrics_for_group(model_version, items)
        for model_version, items in sorted(per_version.items())
    }
    decision_reports = _per_decision_metrics(records)
    policy = _activation_policy(decision_reports, version_reports)
    return {
        "schemaVersion": "LCSP_JEV_DECISION_EVAL_REPORT_V1",
        "dataset": {
            "id": raw["dataset_id"],
            "version": raw["dataset_version"],
            "hash": dataset_hash,
            "recordCount": len(records),
        },
        "models": version_reports,
        "perDecision": decision_reports,
        "policy": policy,
    }


def _metrics_for_group(
    model_version: str,
    items: list[tuple[EvalRecord, DecisionResult | None, str | None]],
) -> dict[str, Any]:
    records = [record for record, _, _ in items]
    successes = [(record, result) for record, result, failure in items if result and not failure]
    failures = [failure for _, _, failure in items if failure]
    agreements = [
        _prediction(result) == record.expected_decision
        for record, result in successes
        if _single_label(record.expected_decision)
    ]
    confidences = [result.confidence for _, result in successes]
    latencies = [record.latency_ms for record in records]
    usage = [_usage(result) for _, result in successes]
    high_risk = [
        (_prediction(result), record.expected_decision)
        for record, result in successes
        if record.risk_tier == "HIGH" and _single_label(record.expected_decision)
    ]
    return {
        "modelVersion": model_version,
        "recordCount": len(records),
        "agreementAccuracy": _ratio(sum(agreements), len(agreements)),
        "brierScore": _brier(successes),
        "expectedCalibrationError": _ece(successes),
        "confidenceDistribution": _confidence_distribution(confidences),
        "coverageByThreshold": _coverage(confidences),
        "highRiskFalseNegativeRate": _false_negative_rate(high_risk),
        "providerSchemaFailureRate": _failure_rate(failures, "PROVIDER_SCHEMA_INVALID", len(records)),
        "timeoutRate": _failure_rate(failures, "PROVIDER_TIMEOUT", len(records)),
        "fallbackRate": _ratio(len(failures), len(records)),
        "driftDetected": _drift_detected(model_version),
        "performance": {
            "p50LatencyMs": _percentile(latencies, 0.50),
            "p95LatencyMs": _percentile(latencies, 0.95),
            "jevProviderCost": round(sum(item["cost"] for item in usage), 6),
            "removedGenerativeCalls": sum(record.removed_generative_calls for record in records),
            "reasoningInputTokenReduction": _token_reduction(records, "input"),
            "reasoningOutputTokenReduction": _token_reduction(records, "output"),
            "stageLatencyChangeMs": _stage_latency_change(records),
        },
    }


def _per_decision_metrics(records: list[EvalRecord]) -> dict[str, Any]:
    grouped: dict[str, list[EvalRecord]] = defaultdict(list)
    for record in records:
        grouped[record.decision_class].append(record)
    return {
        decision_type: _decision_policy_state(decision_type, items)
        for decision_type, items in sorted(grouped.items())
    }


def _decision_policy_state(decision_type: str, records: list[EvalRecord]) -> dict[str, Any]:
    policy = DEFAULT_DECISION_POLICIES.get(decision_type)
    sample_size = len(records)
    return {
        "sampleSize": sample_size,
        "riskTierCounts": _counts(record.risk_tier for record in records),
        "labelSources": _counts(record.label_source for record in records),
        "activationMode": "SHADOW",
        "activationRecommendation": "REMAIN_SHADOW",
        "requirements": {
            "sufficientEvalSampleSize": sample_size >= (policy.min_eval_sample_size if policy else 50),
            "decisionClassQualityThresholdConfigured": policy is not None,
            "boundedFalseNegativeRateConfigured": bool(policy and policy.max_false_negative_rate >= 0),
            "acceptableCalibrationConfigured": bool(policy and policy.max_expected_calibration_error >= 0),
            "privacyFindingClear": bool(policy and policy.privacy_review_clear),
            "fallbackPathTested": bool(policy and policy.fallback_path_tested),
            "exactModelVersionCaptured": True,
            "rollbackSwitchAvailable": bool(policy and policy.rollback_switch_available),
        },
    }


def _activation_policy(
    decision_reports: dict[str, Any],
    version_reports: dict[str, Any],
) -> dict[str, Any]:
    blocked = []
    for decision_type, report in decision_reports.items():
        missing = [
            key for key, value in report["requirements"].items() if value is not True
        ]
        if missing:
            blocked.append({"decisionType": decision_type, "missing": missing})
    drifted = [
        version
        for version, report in version_reports.items()
        if report.get("driftDetected") is True
    ]
    return {
        "passed": len(blocked) == 0 and len(drifted) == 0,
        "defaultMode": "SHADOW",
        "recommendation": "DO_NOT_PROMOTE" if blocked or drifted else "PROMOTION_ELIGIBLE_BY_ALLOWLIST",
        "blockedDecisionTypes": blocked,
        "driftedModelVersions": drifted,
        "permanentExclusions": [
            "LEGAL",
            "COMPLIANCE",
            "FINAL_RISK",
            "FINAL_READINESS",
            "FINAL_ASSESSMENT",
        ],
    }


def _record(value: dict[str, Any]) -> EvalRecord:
    return EvalRecord(
        record_id=value["record_id"],
        decision_class=value["decision_class"],
        risk_tier=value["risk_tier"],
        expected_decision=value["expected_decision"],
        label_source=value["label_source"],
        request=DecisionRequest(**value["request"]),
        response=value.get("captured_response"),
        fixture_status=value.get("fixture_status", "OK"),
        latency_ms=int(value.get("latency_ms", 0)),
        baseline_latency_ms=value.get("baseline_latency_ms"),
        removed_generative_calls=int(value.get("removed_generative_calls", 0)),
        baseline_input_tokens=value.get("baseline_input_tokens"),
        baseline_output_tokens=value.get("baseline_output_tokens"),
        artifact_metadata=dict(value.get("artifact_metadata") or {}),
    )


def _prediction(result: DecisionResult) -> Any:
    first = result.question_results[0]
    if first.selected_choice is not None:
        return first.selected_choice
    if first.score is not None:
        return first.score
    return first.noul


def _single_label(value: Any) -> bool:
    return isinstance(value, str | bool | int | float)


def _usage(result: DecisionResult) -> dict[str, float]:
    usage = result.usage
    return {
        "cost": float(usage.get("costUsd") or usage.get("cost_usd") or 0.0),
        "input": float(usage.get("inputTokens") or usage.get("input_tokens") or 0.0),
        "output": float(usage.get("outputTokens") or usage.get("output_tokens") or 0.0),
    }


def _brier(items: list[tuple[EvalRecord, DecisionResult]]) -> float | None:
    values = []
    for record, result in items:
        prediction = _prediction(result)
        probability = result.question_results[0].probability
        if probability is None or not _single_label(record.expected_decision):
            continue
        actual = 1.0 if prediction == record.expected_decision else 0.0
        values.append((probability - actual) ** 2)
    return round(sum(values) / len(values), 6) if values else None


def _ece(items: list[tuple[EvalRecord, DecisionResult]], buckets: int = 10) -> float | None:
    bucket_values: list[list[tuple[float, bool]]] = [[] for _ in range(buckets)]
    for record, result in items:
        if not _single_label(record.expected_decision):
            continue
        confidence = result.confidence
        index = min(buckets - 1, int(confidence * buckets))
        bucket_values[index].append((confidence, _prediction(result) == record.expected_decision))
    total = sum(len(bucket) for bucket in bucket_values)
    if total == 0:
        return None
    ece = 0.0
    for bucket in bucket_values:
        if not bucket:
            continue
        avg_confidence = sum(item[0] for item in bucket) / len(bucket)
        accuracy = sum(1 for _, correct in bucket if correct) / len(bucket)
        ece += (len(bucket) / total) * abs(avg_confidence - accuracy)
    return round(ece, 6)


def _confidence_distribution(values: list[float]) -> dict[str, int]:
    return {
        "0.00-0.50": sum(1 for value in values if value < 0.5),
        "0.50-0.70": sum(1 for value in values if 0.5 <= value < 0.7),
        "0.70-0.85": sum(1 for value in values if 0.7 <= value < 0.85),
        "0.85-1.00": sum(1 for value in values if value >= 0.85),
    }


def _coverage(values: list[float]) -> dict[str, float]:
    return {str(threshold): _ratio(sum(1 for value in values if value >= threshold), len(values)) for threshold in DEFAULT_THRESHOLDS}


def _false_negative_rate(items: list[tuple[Any, Any]]) -> float | None:
    positives = [item for item in items if item[1] in {"ESCALATE", "DEEP_REVIEW", "NEEDS_INPUT", "TRACE_STATIC_FLOW"}]
    if not positives:
        return None
    misses = sum(1 for predicted, actual in positives if predicted != actual)
    return _ratio(misses, len(positives))


def _failure_rate(failures: list[str | None], reason: str, total: int) -> float:
    return _ratio(sum(1 for failure in failures if failure == reason), total)


def _drift_detected(model_version: str) -> bool:
    approved = {
        model
        for policy in DEFAULT_DECISION_POLICIES.values()
        for model in policy.approved_model_versions
    }
    return bool(approved and model_version not in approved and model_version != "NO_PROVIDER_RESULT")


def _token_reduction(records: list[EvalRecord], kind: str) -> int:
    field = "baseline_input_tokens" if kind == "input" else "baseline_output_tokens"
    return sum(int(getattr(record, field) or 0) for record in records)


def _stage_latency_change(records: list[EvalRecord]) -> int | None:
    values = [
        record.latency_ms - record.baseline_latency_ms
        for record in records
        if record.baseline_latency_ms is not None
    ]
    return int(sum(values)) if values else None


def _percentile(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * percentile))
    return int(ordered[index])


def _ratio(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 6) if denominator else None


def _counts(values: Any) -> dict[str, int]:
    result: dict[str, int] = {}
    for value in values:
        result[str(value)] = result.get(str(value), 0) + 1
    return result


if __name__ == "__main__":
    raise SystemExit(main())
