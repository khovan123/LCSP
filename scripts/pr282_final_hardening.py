from __future__ import annotations

from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    file_path.write_text(text.replace(old, new, 1))


# Fix the Initial Interview bootstrap syntax error.
replace_once(
    "deepagents/tools/common/capabilities/assessment/investigation/engineering_rule/interview_gated_boundary.py",
    '        "Return WAITING_FOR_CUSTOMER with exactly one bounded activeQuestion.\n"\n',
    '        "Return WAITING_FOR_CUSTOMER with exactly one bounded activeQuestion.\\n"\n',
    "initial interview newline",
)

service = "apps/api/src/modules/assessment/application/services/assessment-interview-runtime.service.ts"
replace_once(
    service,
    "  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,\n  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,\n  ASSESSMENT_INTERVIEW_OUTCOMES,\n",
    "  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES,\n  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,\n  ASSESSMENT_INTERVIEW_CONTROLS,\n  ASSESSMENT_INTERVIEW_OUTCOMES,\n  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,\n",
    "authority constants imports",
)
replace_once(
    service,
    "  authority: AssessmentContextAuthorityStatus;\n  sourceVersion: string;\n",
    "  authority: AssessmentContextAuthorityStatus;\n  questionIntent?: NonNullable<\n    AssessmentInterviewRuntimeState[\"activeQuestion\"]\n  >[\"intent\"];\n  questionControl?: NonNullable<\n    AssessmentInterviewRuntimeState[\"activeQuestion\"]\n  >[\"control\"];\n  sourceVersion: string;\n",
    "private revision question provenance",
)
replace_once(
    service,
    "        authority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,\n        sourceVersion: provenance.sourceVersion,\n",
    "        authority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,\n        questionIntent: thread.state.activeQuestion.intent,\n        questionControl: thread.state.activeQuestion.control,\n        sourceVersion: provenance.sourceVersion,\n",
    "persist question provenance",
)
replace_once(
    service,
    "      const revisions = thread.privateRevisions.map((revision) =>\n        revision.contextRevision === decision.expectedContextRevision\n          ? { ...revision, processedAt: new Date().toISOString() }\n          : revision,\n      );\n",
    "      const revisions = thread.privateRevisions.map((revision) =>\n        revision.contextRevision === decision.expectedContextRevision\n          ? {\n              ...revision,\n              authority: decision.contextAuthority ?? revision.authority,\n              processedAt: new Date().toISOString(),\n            }\n          : revision,\n      );\n",
    "persist guarded authority",
)
replace_once(
    service,
    "  if (\n    decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.contextReady &&\n    !isAuthoritative(decision.contextAuthority)\n  ) {\n",
    "  assertAuthorityProvenance(\n    decision.contextAuthority,\n    privateRevision,\n    correlationId,\n  );\n  if (\n    decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.contextReady &&\n    !isAuthoritative(decision.contextAuthority)\n  ) {\n",
    "invoke authority provenance guard",
)
replace_once(
    service,
    "function decisionState(\n  current: AssessmentInterviewRuntimeState,\n",
    "function assertAuthorityProvenance(\n  authority: AssessmentContextAuthorityStatus | undefined,\n  privateRevision: PrivateInterviewAnswerRevision | undefined,\n  correlationId: string,\n): void {\n  if (!isAuthoritative(authority)) {\n    return;\n  }\n  if (!privateRevision) {\n    throw problemException(\n      \"INTERVIEW_AUTHORITATIVE_CONTEXT_REQUIRES_CUSTOMER_REVISION\",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n\n  const explicitlyConfirmed =\n    privateRevision.questionControl ===\n      ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust &&\n    privateRevision.answer.confirmed === true &&\n    privateRevision.answer.adjusted !== true;\n\n  if (\n    authority === ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed\n  ) {\n    if (!explicitlyConfirmed) {\n      throw problemException(\n        \"INTERVIEW_CUSTOMER_CONFIRMED_REQUIRES_EXPLICIT_CONFIRMATION\",\n        correlationId,\n        { status: HttpStatus.CONFLICT },\n      );\n    }\n    return;\n  }\n\n  if (\n    privateRevision.questionIntent !== ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask ||\n    privateRevision.questionControl ===\n      ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust ||\n    privateRevision.answer.adjusted === true\n  ) {\n    throw problemException(\n      \"INTERVIEW_CONFIRMED_REQUIRES_DIRECT_ASK\",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n}\n\nfunction decisionState(\n  current: AssessmentInterviewRuntimeState,\n",
    "authority provenance helper",
)

test = "apps/api/test/assessment-interview.e2e-spec.ts"
replace_once(
    test,
    "    const ready = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 1,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { decision_authority: \"human approval required\" },\n      });\n",
    "    const forgedCustomerConfirmation = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 1,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { decision_authority: \"human approval required\" },\n      });\n    assert.equal(\n      forgedCustomerConfirmation.status,\n      409,\n      JSON.stringify(forgedCustomerConfirmation.body),\n    );\n\n    const ready = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 1,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,\n        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.confirmed,\n        confirmedContext: { decision_authority: \"human approval required\" },\n      });\n",
    "reject forged customer confirmation and allow lossless ASK",
)
replace_once(
    test,
    "        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n      });\n    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));\n",
    "        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.confirmed,\n      });\n    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));\n",
    "duplicate authority status",
)
replace_once(
    test,
    "        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { baseline: \"confirmed\" },\n      });\n    assert.equal(ready.status, 201, JSON.stringify(ready.body));\n\n    const registered = await httpRequest(app)\n",
    "        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.confirmed,\n        confirmedContext: { baseline: \"confirmed\" },\n      });\n    assert.equal(ready.status, 201, JSON.stringify(ready.body));\n\n    const registered = await httpRequest(app)\n",
    "targeted baseline direct ASK authority",
)
replace_once(
    test,
    "    const resolved = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 2,\n        mode: \"TARGETED_INTERVIEW\",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { decision_authority: \"human operations lead\" },\n        resolutionCriteria: [\"forged\"],\n        continuation: { investigatorExecutionId: \"forged-run\" },\n      });\n",
    "    const forgedSystemConfirmation = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 2,\n        mode: \"TARGETED_INTERVIEW\",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.confirmed,\n        confirmedContext: { decision_authority: \"human operations lead\" },\n      });\n    assert.equal(\n      forgedSystemConfirmation.status,\n      409,\n      JSON.stringify(forgedSystemConfirmation.body),\n    );\n\n    const confirmQuestion = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 2,\n        mode: \"TARGETED_INTERVIEW\",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n        contextAuthority: ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerStated,\n        activeQuestion: {\n          id: \"target-confirm-1\",\n          needId: \"need-decision-authority\",\n          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,\n          control: ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust,\n          prompt: \"Please confirm this interpretation before it becomes authoritative.\",\n          priorAnswerSummary: \"The human operations lead has final approval.\",\n        },\n      });\n    assert.equal(\n      confirmQuestion.status,\n      201,\n      JSON.stringify(confirmQuestion.body),\n    );\n\n    const confirmation = await httpRequest(app)\n      .post(\"/assessments/assessment-1/interview/answers\")\n      .set(\"Authorization\", `Bearer ${token}`)\n      .send({\n        questionId: \"target-confirm-1\",\n        confirmed: true,\n      });\n    assert.equal(confirmation.status, 201, JSON.stringify(confirmation.body));\n\n    const resolved = await httpRequest(app)\n      .post(\"/internal/assessment-interviews/assessment-1/agent-decisions\")\n      .set(\"x-worker-api-key\", WORKER_KEY)\n      .send({\n        expectedContextRevision: 3,\n        mode: \"TARGETED_INTERVIEW\",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { decision_authority: \"human operations lead\" },\n        resolutionCriteria: [\"forged\"],\n        continuation: { investigatorExecutionId: \"forged-run\" },\n      });\n",
    "targeted material confirmation flow",
)

print("PR #282 final hardening patch applied")
