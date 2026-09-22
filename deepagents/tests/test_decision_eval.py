import json

from decision.eval import DEFAULT_DATASET, evaluate_dataset


def test_offline_decision_eval_reports_per_model_and_blocks_activation():
    report = evaluate_dataset(DEFAULT_DATASET)

    assert report["schemaVersion"] == "LCSP_JEV_DECISION_EVAL_REPORT_V1"
    assert report["dataset"]["hash"].startswith("sha256:")
    assert report["dataset"]["recordCount"] == 5
    assert "jev-2026-09-22.eval" in report["models"]
    model = report["models"]["jev-2026-09-22.eval"]
    assert model["agreementAccuracy"] == 1.0
    assert model["performance"]["removedGenerativeCalls"] == 5
    assert model["fallbackRate"] == 0.0
    assert report["policy"]["defaultMode"] == "SHADOW"
    assert report["policy"]["passed"] is False
    assert report["policy"]["recommendation"] == "DO_NOT_PROMOTE"


def test_offline_decision_eval_report_is_machine_readable_json():
    report = evaluate_dataset(DEFAULT_DATASET)
    encoded = json.dumps(report, sort_keys=True)

    decoded = json.loads(encoded)
    assert decoded["perDecision"]["INVESTIGATOR_NEXT_ACTION"]["activationMode"] == "SHADOW"
    assert "FINAL_READINESS" in decoded["policy"]["permanentExclusions"]
