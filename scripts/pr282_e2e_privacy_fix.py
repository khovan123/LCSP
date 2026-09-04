from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    file_path.write_text(text.replace(old, new, 1))


service = "apps/api/src/modules/assessment/application/services/assessment-interview-runtime.service.ts"
replace_once(
    service,
    '      outputSummary: { assessmentInterview: publicState(result) },\n      waitingReason: blocked.action,\n',
    '      outputSummary: {\n        assessmentInterview: publicState({ ...result, pendingDraft: undefined }),\n      },\n      waitingReason: blocked.action,\n',
    "redact pending draft from runtime event",
)

test = "apps/api/test/assessment-interview.e2e-spec.ts"
replace_once(
    test,
    '    assert.doesNotMatch(JSON.stringify(privateTarget.body), /checkpoint-1/u);\n    assert.doesNotMatch(\n      JSON.stringify(privateTarget.body),\n      /investigator-run-1/u,\n    );\n',
    '    const serializedPrivateTarget = JSON.stringify(privateTarget.body);\n    assert.doesNotMatch(serializedPrivateTarget, /checkpoint-1/u);\n    assert.doesNotMatch(serializedPrivateTarget, /"checkpointId"/u);\n    assert.doesNotMatch(serializedPrivateTarget, /"investigatorExecutionId"/u);\n    assert.doesNotMatch(serializedPrivateTarget, /"targetedContinuation"/u);\n    assert.match(\n      serializedPrivateTarget,\n      /investigator:investigator-run-1:need-decision-authority/u,\n    );\n',
    "targeted safe origin assertion",
)

print("PR #282 E2E privacy fixes applied")
