from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if text.count(old) != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {text.count(old)}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{path}: regex expected one match, found {count}")
    write(path, updated)


API = "apps/api/src/modules/assessment/application/services/assessment-interview-runtime.service.ts"
MIDDLEWARE = "deepagents/middleware/specialist_handoff_validation.py"
GATE = "deepagents/tools/common/capabilities/assessment/investigation/engineering_rule/interview_gated_boundary.py"
RESUME = "deepagents/tools/common/capabilities/workflow/recovery/interview_boundary.py"
GATE_TEST = "deepagents/tests/investigation/test_interview_gated_engineering_assessment_boundary.py"
TARGET_TEST = "deepagents/tests/test_targeted_interview_registration.py"
RESUME_TEST = "deepagents/tests/test_assessment_interview_resume_boundary.py"
API_E2E = "apps/api/test/assessment-interview.e2e-spec.ts"

# 1) UNAVAILABLE coverage is routed to Root Orchestration recovery before Interview.
replace_once(
    GATE,
    "    def __init__(self, *args: Any, interview_dispatcher: Any | None = None, **kwargs: Any) -> None:\n        super().__init__(*args, **kwargs)\n        self._interview_dispatcher = interview_dispatcher\n",
    "    def __init__(\n        self,\n        *args: Any,\n        interview_dispatcher: Any | None = None,\n        recovery_root: Any | None = None,\n        **kwargs: Any,\n    ) -> None:\n        super().__init__(*args, **kwargs)\n        self._interview_dispatcher = interview_dispatcher\n        self._recovery_root = recovery_root\n",
)
replace_once(
    GATE,
    "    ) -> dict[str, Any] | None:\n        state = self._api_client.get_interview_worker_state(assessment_id)\n",
    "    ) -> dict[str, Any] | None:\n        coverage_state, coverage_notes = _technical_coverage(evidence_report)\n        if coverage_state == \"UNAVAILABLE\":\n            self._route_unavailable_coverage_to_recovery(\n                assessment_id=assessment_id,\n                evidence_report_id=evidence_report_id,\n                coverage_notes=coverage_notes,\n                correlation_id=correlation_id,\n            )\n            return None\n\n        state = self._api_client.get_interview_worker_state(assessment_id)\n",
)
replace_once(
    GATE,
    "\n\ndef _initial_interview_instruction(\n",
    "\n\n    def _route_unavailable_coverage_to_recovery(\n        self,\n        *,\n        assessment_id: str,\n        evidence_report_id: str,\n        coverage_notes: list[str],\n        correlation_id: str,\n    ) -> None:\n        root = self._recovery_root\n        if root is None:\n            from agent import agent\n\n            root = agent\n        root.invoke(\n            {\n                \"messages\": [\n                    {\n                        \"role\": \"user\",\n                        \"content\": (\n                            \"Technical evidence coverage is UNAVAILABLE. Do not enter Initial Interview, \"\n                            \"EngineeringRule, Planner, or Investigator. Run Root Orchestration recovery \"\n                            \"for the pinned technical evidence first (for example targeted re-analysis or \"\n                            \"a governed re-scan), then re-enter the assessment only from newly accepted \"\n                            \"technical evidence. \"\n                            f\"Assessment: {assessment_id}. Evidence report: {evidence_report_id}. \"\n                            f\"Bounded coverage notes: {json.dumps(coverage_notes, ensure_ascii=False)}\"\n                        ),\n                    }\n                ]\n            },\n            config={\n                \"configurable\": {\"thread_id\": f\"assessment:{assessment_id}:coverage-recovery\"},\n                \"metadata\": {\n                    \"assessment_id\": assessment_id,\n                    \"technical_evidence_report_id\": evidence_report_id,\n                    \"correlationId\": correlation_id,\n                    \"trigger\": \"TECHNICAL_COVERAGE_UNAVAILABLE_RECOVERY\",\n                },\n            },\n        )\n\n\ndef _technical_coverage(evidence_report: dict[str, Any]) -> tuple[str, list[str]]:\n    payload = evidence_report.get(\"evidence_payload\") or evidence_report.get(\"evidencePayload\")\n    graph = payload.get(\"evidence_graph\") if isinstance(payload, dict) else None\n    coverage_state = \"UNKNOWN\"\n    coverage_notes: list[str] = []\n    if isinstance(graph, dict):\n        coverage_state = str(graph.get(\"coverage_state\") or graph.get(\"coverageState\") or \"UNKNOWN\").upper()\n        raw_notes = graph.get(\"coverage_notes\") or graph.get(\"coverageNotes\") or []\n        if isinstance(raw_notes, list):\n            coverage_notes = [str(item)[:240] for item in raw_notes[:8]]\n    return coverage_state, coverage_notes\n\n\ndef _initial_interview_instruction(\n",
)
regex_once(
    GATE,
    r"    payload = evidence_report\.get\(\"evidence_payload\"\) or evidence_report\.get\(\"evidencePayload\"\)\n    graph = payload\.get\(\"evidence_graph\"\) if isinstance\(payload, dict\) else None\n    coverage_state = \"UNKNOWN\"\n    coverage_notes: list\[str\] = \[\]\n    if isinstance\(graph, dict\):\n        coverage_state = str\(graph\.get\(\"coverage_state\"\) or graph\.get\(\"coverageState\"\) or \"UNKNOWN\"\)\n        raw_notes = graph\.get\(\"coverage_notes\"\) or graph\.get\(\"coverageNotes\"\) or \[\]\n        if isinstance\(raw_notes, list\):\n            coverage_notes = \[str\(item\)\[:240\] for item in raw_notes\[:8\]\]\n",
    "    coverage_state, coverage_notes = _technical_coverage(evidence_report)\n",
)

# 2) Preserve true Investigator execution/checkpoint/workflow and its validated artifact pins.
replace_once(
    MIDDLEWARE,
    "    _persist_targeted_interview_need(\n        subagent_type=subagent_type,\n        payload=payload,\n        context=context,\n        metadata=metadata,\n    )\n",
    "    _persist_targeted_interview_need(\n        subagent_type=subagent_type,\n        payload=payload,\n        context=context,\n        metadata=metadata,\n        execution_id=str(tool_call.get(\"id\") or \"\").strip() or None,\n    )\n",
)
replace_once(
    MIDDLEWARE,
    "    metadata: dict[str, Any],\n) -> None:\n",
    "    metadata: dict[str, Any],\n    execution_id: str | None = None,\n) -> None:\n",
)
replace_once(
    MIDDLEWARE,
    "    execution_id = context.checkpoint_id or context.workflow_run_id\n    if not execution_id:\n        raise RuntimeError(\"Targeted Interview registration requires a trusted Investigator execution reference\")\n",
    "    if not execution_id:\n        raise RuntimeError(\"Targeted Interview registration requires the original Investigator task execution id\")\n    if not context.workflow_run_id or not context.checkpoint_id:\n        raise RuntimeError(\"Targeted Interview registration requires original workflow and checkpoint pins\")\n",
)
replace_once(
    MIDDLEWARE,
    "    originating_reference = f\"investigator:{execution_id}:{need_id}\"\n    register(\n",
    "    artifact_versions = payload.get(\"artifact_versions\")\n    if not isinstance(artifact_versions, dict) or not artifact_versions:\n        raise RuntimeError(\"Targeted Interview registration requires validated Investigator artifact pins\")\n    if dict(artifact_versions) != dict(context.artifact_versions):\n        raise RuntimeError(\"Investigator artifact pins drifted from immutable runtime context\")\n    originating_reference = f\"investigator:{execution_id}:{need_id}\"\n    register(\n",
)
replace_once(
    MIDDLEWARE,
    "            \"investigatorExecutionId\": execution_id,\n            \"checkpointId\": context.checkpoint_id,\n            \"affectedRuleIds\": list(affected_rule_ids),\n",
    "            \"investigatorExecutionId\": execution_id,\n            \"workflowRunId\": context.workflow_run_id,\n            \"checkpointId\": context.checkpoint_id,\n            \"affectedRuleIds\": list(affected_rule_ids),\n            \"artifactVersions\": dict(artifact_versions),\n",
)

# 3) API provenance is authoritative-now, not whatever the Interview thread last stored.
replace_once(
    API,
    "type TargetedInterviewContinuation = {\n  originatingInvestigationReference: string;\n  investigatorExecutionId: string;\n  checkpointId?: string;\n  affectedRuleIds: string[];\n  artifactVersions: { sourceVersion: string; pgeVersion: string };\n};\n",
    "type TargetedInterviewContinuation = {\n  originatingInvestigationReference: string;\n  investigatorExecutionId: string;\n  workflowRunId: string;\n  checkpointId: string;\n  affectedRuleIds: string[];\n  artifactVersions: Record<string, string>;\n  sourceVersion: string;\n  pgeVersion: string;\n};\n",
)
replace_once(
    API,
    "  investigatorExecutionId: string;\n  checkpointId?: string;\n  affectedRuleIds: string[];\n};\n",
    "  investigatorExecutionId: string;\n  workflowRunId: string;\n  checkpointId: string;\n  affectedRuleIds: string[];\n  artifactVersions: Record<string, string>;\n};\n",
)
replace_once(
    API,
    "      const priorRevision = thread.contextRevision;\n",
    "      assertAnswerMatchesQuestion(answer, thread.state.activeQuestion);\n      const priorRevision = thread.contextRevision;\n",
)
regex_once(
    API,
    r"  async getPrivateContextForWorker\(input: \{\n    assessmentId: string;\n    contextRevision: number;\n    sourceVersion\?: string;\n    pgeVersion\?: string;\n  \}\): Promise<WorkerPrivateContext> \{.*?\n  \}\n\n  async registerTargetedNeedForWorker",
    '''  async getPrivateContextForWorker(input: {\n    assessmentId: string;\n    contextRevision: number;\n    sourceVersion?: string;\n    pgeVersion?: string;\n  }): Promise<WorkerPrivateContext> {\n    const thread = await this.readThread(input.assessmentId);\n    const authoritative = await this.assessmentProvenance(input.assessmentId);\n    const privateRevision = thread.privateRevisions.find(\n      (revision) => revision.contextRevision === input.contextRevision,\n    );\n    const target = thread.privateStore.targetedNeed;\n    const provenanceChanged =\n      (input.sourceVersion && input.sourceVersion !== authoritative.sourceVersion) ||\n      (input.pgeVersion && input.pgeVersion !== authoritative.pgeVersion) ||\n      thread.sourceVersion !== authoritative.sourceVersion ||\n      thread.pgeVersion !== authoritative.pgeVersion ||\n      (!!privateRevision &&\n        (privateRevision.sourceVersion !== authoritative.sourceVersion ||\n          privateRevision.pgeVersion !== authoritative.pgeVersion)) ||\n      (!!target &&\n        (target.sourceVersion !== authoritative.sourceVersion ||\n          target.pgeVersion !== authoritative.pgeVersion));\n    const status = provenanceChanged\n      ? "STALE_PROVENANCE"\n      : thread.processedRevision >= input.contextRevision\n        ? "DUPLICATE"\n        : thread.contextRevision === input.contextRevision && privateRevision\n          ? "CURRENT"\n          : "STALE";\n    return {\n      status,\n      assessmentId: input.assessmentId,\n      threadId: this.threadId(input.assessmentId),\n      requestedRevision: input.contextRevision,\n      currentRevision: thread.contextRevision,\n      processedRevision: thread.processedRevision,\n      sourceVersion: authoritative.sourceVersion,\n      pgeVersion: authoritative.pgeVersion,\n      publicState: thread.state,\n      privateRevision,\n      targetedNeed: target,\n    };\n  }\n\n  async registerTargetedNeedForWorker''',
)
replace_once(
    API,
    "      const provenance = await this.assessmentProvenance(\n        input.assessmentId,\n        tx,\n      );\n      const targetedNeed: TargetedInterviewNeed = {\n",
    "      const provenance = await this.assessmentProvenance(\n        input.assessmentId,\n        tx,\n      );\n      if (\n        !thread.sourceVersion ||\n        !thread.pgeVersion ||\n        thread.sourceVersion !== provenance.sourceVersion ||\n        thread.pgeVersion !== provenance.pgeVersion\n      ) {\n        throw problemException(\n          \"INTERVIEW_TARGETED_REGISTRATION_STALE_PROVENANCE\",\n          input.correlationId,\n          { status: HttpStatus.CONFLICT },\n        );\n      }\n      const targetedNeed: TargetedInterviewNeed = {\n",
)
replace_once(
    API,
    "        sourceVersion: provenance.sourceVersion,\n        pgeVersion: provenance.pgeVersion,\n      };\n      const targetedContinuation: TargetedInterviewContinuation = {\n        originatingInvestigationReference:\n          target.originatingInvestigationReference,\n        investigatorExecutionId: target.investigatorExecutionId,\n        checkpointId: target.checkpointId,\n        affectedRuleIds: target.affectedRuleIds,\n        artifactVersions: {\n          sourceVersion: provenance.sourceVersion,\n          pgeVersion: provenance.pgeVersion,\n        },\n      };\n",
    "        sourceVersion: thread.sourceVersion,\n        pgeVersion: thread.pgeVersion,\n      };\n      const targetedContinuation: TargetedInterviewContinuation = {\n        originatingInvestigationReference:\n          target.originatingInvestigationReference,\n        investigatorExecutionId: target.investigatorExecutionId,\n        workflowRunId: target.workflowRunId,\n        checkpointId: target.checkpointId,\n        affectedRuleIds: target.affectedRuleIds,\n        artifactVersions: target.artifactVersions,\n        sourceVersion: thread.sourceVersion,\n        pgeVersion: thread.pgeVersion,\n      };\n",
)
replace_once(
    API,
    "        sourceVersion: provenance.sourceVersion,\n        pgeVersion: provenance.pgeVersion,\n      });\n      await this.outboxRepository.enqueue(\n",
    "        sourceVersion: thread.sourceVersion,\n        pgeVersion: thread.pgeVersion,\n      });\n      await this.outboxRepository.enqueue(\n",
)
replace_once(
    API,
    "          sourceVersion: provenance.sourceVersion,\n          pgeVersion: provenance.pgeVersion,\n          resumeReason: \"TARGETED_INTERVIEW_REQUIRED\",\n",
    "          sourceVersion: thread.sourceVersion,\n          pgeVersion: thread.pgeVersion,\n          resumeReason: \"TARGETED_INTERVIEW_REQUIRED\",\n",
)
replace_once(
    API,
    "      const latestPrivate = thread.privateRevisions.find(\n        (revision) =>\n          revision.contextRevision === decision.expectedContextRevision,\n      );\n",
    "      const latestPrivate = thread.privateRevisions.find(\n        (revision) =>\n          revision.contextRevision === decision.expectedContextRevision,\n      );\n      const authoritative = await this.assessmentProvenance(\n        input.assessmentId,\n        tx,\n      );\n      if (\n        thread.sourceVersion !== authoritative.sourceVersion ||\n        thread.pgeVersion !== authoritative.pgeVersion ||\n        (!!latestPrivate &&\n          (latestPrivate.sourceVersion !== authoritative.sourceVersion ||\n            latestPrivate.pgeVersion !== authoritative.pgeVersion))\n      ) {\n        throw problemException(\n          \"INTERVIEW_DECISION_STALE_PROVENANCE\",\n          input.correlationId,\n          { status: HttpStatus.CONFLICT },\n        );\n      }\n",
)
replace_once(
    API,
    "      outputSummary: { assessmentInterview: publicState(result.state) },\n",
    "      outputSummary: { assessmentInterview: runtimeEventState(result.state) },\n",
)
regex_once(
    API,
    r"function parseTargetedNeedRegistration\(\n  value: unknown,\n\): TargetedNeedRegistrationInput \{.*?\n\}\n\nfunction parseAgentDecision",
    '''function parseTargetedNeedRegistration(\n  value: unknown,\n): TargetedNeedRegistrationInput {\n  const record = objectRecord(value);\n  const criteria = Array.isArray(record?.resolutionCriteria)\n    ? record.resolutionCriteria.filter(\n        (item): item is string =>\n          typeof item === "string" && item.trim().length > 0,\n      )\n    : [];\n  const affectedRuleIds = Array.isArray(record?.affectedRuleIds)\n    ? record.affectedRuleIds.filter(\n        (item): item is string =>\n          typeof item === "string" && item.trim().length > 0,\n      )\n    : [];\n  const rawArtifactVersions = objectRecord(record?.artifactVersions);\n  const artifactVersions = Object.fromEntries(\n    Object.entries(rawArtifactVersions ?? {}).filter(\n      (entry): entry is [string, string] =>\n        typeof entry[1] === "string" && entry[1].trim().length > 0,\n    ),\n  );\n  if (\n    !record ||\n    typeof record.actorId !== "string" ||\n    typeof record.needId !== "string" ||\n    typeof record.businessContextNeed !== "string" ||\n    !criteria.length ||\n    typeof record.originatingInvestigationReference !== "string" ||\n    typeof record.investigatorExecutionId !== "string" ||\n    typeof record.workflowRunId !== "string" ||\n    typeof record.checkpointId !== "string" ||\n    !affectedRuleIds.length ||\n    !Object.keys(artifactVersions).length\n  ) {\n    throw new BadRequestException({ code: "INTERVIEW_TARGETED_NEED_INVALID" });\n  }\n  return {\n    actorId: record.actorId,\n    needId: record.needId,\n    businessContextNeed: record.businessContextNeed,\n    resolutionCriteria: criteria,\n    originatingInvestigationReference: record.originatingInvestigationReference,\n    investigatorExecutionId: record.investigatorExecutionId,\n    workflowRunId: record.workflowRunId,\n    checkpointId: record.checkpointId,\n    affectedRuleIds,\n    artifactVersions,\n  };\n}\n\nfunction parseAgentDecision''',
)
regex_once(
    API,
    r"function parseStoredTargetedContinuation\(\n  value: unknown,\n\): TargetedInterviewContinuation \| undefined \{.*?\n\}\n\nfunction isPrivateRevision",
    '''function parseStoredTargetedContinuation(\n  value: unknown,\n): TargetedInterviewContinuation | undefined {\n  const record = objectRecord(value);\n  const artifactVersions = objectRecord(record?.artifactVersions);\n  if (\n    !record ||\n    typeof record.originatingInvestigationReference !== "string" ||\n    typeof record.investigatorExecutionId !== "string" ||\n    typeof record.workflowRunId !== "string" ||\n    typeof record.checkpointId !== "string" ||\n    !Array.isArray(record.affectedRuleIds) ||\n    !artifactVersions ||\n    Object.keys(artifactVersions).length === 0 ||\n    Object.values(artifactVersions).some((value) => typeof value !== "string") ||\n    typeof record.sourceVersion !== "string" ||\n    typeof record.pgeVersion !== "string"\n  ) {\n    return undefined;\n  }\n  return record as TargetedInterviewContinuation;\n}\n\nfunction isPrivateRevision''',
)
replace_once(
    API,
    "    continuation.artifactVersions.sourceVersion !== thread.sourceVersion ||\n    continuation.artifactVersions.pgeVersion !== thread.pgeVersion\n",
    "    continuation.sourceVersion !== thread.sourceVersion ||\n    continuation.pgeVersion !== thread.pgeVersion\n",
)
replace_once(
    API,
    "function decisionState(\n",
    '''function assertAnswerMatchesQuestion(\n  answer: AssessmentInterviewAnswerInput,\n  question: NonNullable<AssessmentInterviewRuntimeState["activeQuestion"]>,\n): void {\n  const invalid = () => {\n    throw new BadRequestException({ code: "INTERVIEW_ANSWER_CONTROL_INVALID" });\n  };\n  const selected = answer.selectedChoiceIds ?? [];\n  if (new Set(selected).size !== selected.length) {\n    invalid();\n  }\n  const choiceById = new Map((question.choices ?? []).map((choice) => [choice.id, choice]));\n  const unknownChoice = selected.some((choiceId) => !choiceById.has(choiceId));\n  const requiresOtherText = selected.some(\n    (choiceId) => choiceById.get(choiceId)?.requiresFreeText === true,\n  );\n  const hasOtherText = Boolean(answer.otherText?.trim());\n  const hasFreeText = Boolean(answer.freeText?.trim());\n\n  if (question.control === ASSESSMENT_INTERVIEW_CONTROLS.freeText) {\n    if (!hasFreeText || selected.length || answer.confirmed || answer.adjusted || hasOtherText) invalid();\n    return;\n  }\n  if (question.control === ASSESSMENT_INTERVIEW_CONTROLS.boolean) {\n    if (selected.length !== 1 || !["yes", "no"].includes(selected[0] ?? "") || answer.confirmed || answer.adjusted || hasOtherText) invalid();\n    return;\n  }\n  if (question.control === ASSESSMENT_INTERVIEW_CONTROLS.singleSelect) {\n    if (selected.length !== 1 || unknownChoice || answer.confirmed || answer.adjusted) invalid();\n    if (requiresOtherText !== hasOtherText) invalid();\n    return;\n  }\n  if (question.control === ASSESSMENT_INTERVIEW_CONTROLS.multiSelect) {\n    if (!selected.length || unknownChoice || answer.confirmed || answer.adjusted) invalid();\n    if (requiresOtherText !== hasOtherText) invalid();\n    return;\n  }\n  if (question.control === ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust) {\n    if (answer.confirmed === answer.adjusted || selected.length || hasOtherText) invalid();\n    return;\n  }\n  invalid();\n}\n\nfunction decisionState(\n''',
)
replace_once(
    API,
    "function objectRecord(value: unknown): Record<string, unknown> | null {\n",
    '''function runtimeEventState(\n  state: AssessmentInterviewRuntimeState,\n): AssessmentInterviewRuntimeState {\n  return { ...publicState(state), pendingDraft: undefined };\n}\n\nfunction objectRecord(value: unknown): Record<string, unknown> | null {\n''',
)

# 4) Exact targeted continuation re-enters original workflow/checkpoint, not Interview thread.
replace_once(
    RESUME,
    "from tools.common.capabilities.managed.boundary import AgentBoundaryBase\n",
    "from orchestration.context import LCSPRunContext\nfrom tools.common.capabilities.managed.boundary import AgentBoundaryBase\n",
)
regex_once(
    RESUME,
    r"        root = self\._root_agent or self\._load_root_agent\(\)\n        root\.invoke\(\n            \{\n                \"messages\": \[\n                    \{\n                        \"role\": \"user\",\n                        \"content\": _guarded_downstream_prompt\(.*?\n        \)\n",
    '''        self._resume_exact_investigator(\n            assessment_id=assessment_id,\n            context_revision=context_revision,\n            continuation=continuation,\n            correlationId=correlationId,\n        )\n''',
)
replace_once(
    RESUME,
    "    def _reenter_root_for_revalidation(\n",
    '''    def _resume_exact_investigator(\n        self,\n        *,\n        assessment_id: str,\n        context_revision: int,\n        continuation: dict[str, Any],\n        correlationId: str,\n    ) -> None:\n        workflow_run_id = _required_text(continuation, "workflowRunId")\n        checkpoint_id = _required_text(continuation, "checkpointId")\n        execution_id = _required_text(continuation, "investigatorExecutionId")\n        originating_reference = _required_text(\n            continuation, "originatingInvestigationReference"\n        )\n        affected_rule_ids = continuation.get("affectedRuleIds")\n        artifact_versions = continuation.get("artifactVersions")\n        if (\n            not isinstance(affected_rule_ids, list)\n            or not affected_rule_ids\n            or any(not isinstance(item, str) or not item for item in affected_rule_ids)\n        ):\n            raise ValueError("guarded continuation requires affectedRuleIds")\n        if (\n            not isinstance(artifact_versions, dict)\n            or not artifact_versions\n            or any(not isinstance(key, str) or not isinstance(value, str) for key, value in artifact_versions.items())\n        ):\n            raise ValueError("guarded continuation requires immutable artifactVersions")\n\n        root = self._root_agent or self._load_root_agent()\n        root.invoke(\n            {\n                "messages": [\n                    {\n                        "role": "user",\n                        "content": (\n                            "Targeted Customer context has passed the protected Interview guard. "\n                            "Resume the already-checkpointed Investigator continuation only; do not "\n                            "start a new Initial Interview, Planner pass, or unrelated Investigator. "\n                            "The exact execution/checkpoint/scope/artifact pins are supplied as immutable "\n                            "runtime context and metadata, not as model-authored continuation data."\n                        ),\n                    }\n                ]\n            },\n            config={\n                "configurable": {\n                    "thread_id": workflow_run_id,\n                    "checkpoint_id": checkpoint_id,\n                },\n                "metadata": {\n                    "lcsp_thread_id": workflow_run_id,\n                    "assessment_id": assessment_id,\n                    "context_revision": context_revision,\n                    "correlationId": correlationId,\n                    "trigger": "TARGETED_INTERVIEW_EXACT_INVESTIGATOR_RESUME",\n                    "investigator_execution_id": execution_id,\n                    "originating_investigation_reference": originating_reference,\n                    "checkpoint_id": checkpoint_id,\n                    "affected_rule_ids": list(affected_rule_ids),\n                    "artifact_versions": dict(artifact_versions),\n                },\n            },\n            context=LCSPRunContext(\n                assessment_id=assessment_id,\n                workflow_run_id=workflow_run_id,\n                checkpoint_id=checkpoint_id,\n                artifact_versions=dict(artifact_versions),\n                engineering_rule_ids=tuple(affected_rule_ids),\n                idempotency_key=f"resume:{execution_id}:{context_revision}",\n            ),\n        )\n\n    def _reenter_root_for_revalidation(\n''',
)
# Remove obsolete prompt serializer now that continuation is never put into a Root prompt.
regex_once(
    RESUME,
    r"\n\ndef _guarded_downstream_prompt\(.*?\n\ndef _required_text",
    "\n\ndef _required_text",
)

# 5) Regression tests for UNAVAILABLE, true execution pins, exact checkpoint resume.
replace_once(
    GATE_TEST,
    "class NoopPipeline:\n",
    '''class RecordingRoot:\n    def __init__(self) -> None:\n        self.calls = []\n\n    def invoke(self, payload, config=None):\n        self.calls.append((payload, config))\n        return {"status": "ROOT_REENTERED"}\n\n\nclass NoopPipeline:\n''',
)
replace_once(
    GATE_TEST,
    "def _boundary(api, dispatcher):\n    return InterviewGatedEngineeringAssessmentBoundary(\n",
    "def _boundary(api, dispatcher, recovery_root=None):\n    return InterviewGatedEngineeringAssessmentBoundary(\n",
)
replace_once(
    GATE_TEST,
    "        interview_dispatcher=dispatcher,\n",
    "        interview_dispatcher=dispatcher,\n        recovery_root=recovery_root,\n",
)
replace_once(
    GATE_TEST,
    "\ndef test_guarded_ready_state_is_the_only_initial_path_to_confirmed_context() -> None:\n",
    '''\ndef test_unavailable_coverage_routes_to_orchestration_before_interview() -> None:\n    api = FakeApi({"outcome": "WAITING_FOR_CUSTOMER", "contextRevision": 0})\n    dispatcher = FakeDispatcher()\n    root = RecordingRoot()\n    boundary = _boundary(api, dispatcher, recovery_root=root)\n    report = _report()\n    report["evidence_payload"]["evidence_graph"]["coverage_state"] = "UNAVAILABLE"\n\n    result = boundary._prepare_interview(\n        evidence_report=report,\n        evidence_report_id="ter-1",\n        assessment_id="assessment-1",\n        correlation_id="corr-1",\n    )\n\n    assert result is None\n    assert dispatcher.calls == []\n    assert api.seeded == []\n    assert len(root.calls) == 1\n    assert root.calls[0][1]["metadata"]["trigger"] == "TECHNICAL_COVERAGE_UNAVAILABLE_RECOVERY"\n    assert "Do not enter Initial Interview" in root.calls[0][0]["messages"][0]["content"]\n\n\ndef test_guarded_ready_state_is_the_only_initial_path_to_confirmed_context() -> None:\n''',
)
replace_once(
    TARGET_TEST,
    "        artifact_versions={\"technicalEvidenceReportId\": \"ter-1\"},\n",
    "        artifact_versions={\"technicalEvidenceReportId\": \"ter-1\", \"repositorySnapshotId\": \"snapshot-1\"},\n",
)
replace_once(
    TARGET_TEST,
    "        metadata={\"api_client\": api},\n    )\n\n    assert len(api.calls) == 1\n",
    "        metadata={\"api_client\": api},\n        execution_id=\"task-call-investigator-17\",\n    )\n\n    assert len(api.calls) == 1\n",
)
replace_once(
    TARGET_TEST,
    "    assert payload[\"investigatorExecutionId\"] == \"checkpoint-7\"\n    assert payload[\"checkpointId\"] == \"checkpoint-7\"\n",
    "    assert payload[\"investigatorExecutionId\"] == \"task-call-investigator-17\"\n    assert payload[\"workflowRunId\"] == \"workflow-1\"\n    assert payload[\"checkpointId\"] == \"checkpoint-7\"\n",
)
replace_once(
    TARGET_TEST,
    "    assert payload[\"originatingInvestigationReference\"] == \"investigator:checkpoint-7:need-1\"\n    assert \"artifactVersions\" not in payload\n",
    "    assert payload[\"originatingInvestigationReference\"] == \"investigator:task-call-investigator-17:need-1\"\n    assert payload[\"artifactVersions\"] == context.artifact_versions\n",
)
replace_once(
    RESUME_TEST,
    "    def invoke(self, payload, config=None):\n",
    "    def invoke(self, payload, config=None, context=None):\n",
)
replace_once(
    RESUME_TEST,
    "        self.calls.append((payload, config))\n",
    "        self.calls.append((payload, config, context))\n",
)
replace_once(
    RESUME_TEST,
    "\ndef test_interview_resume_boundary_rejects_missing_revision() -> None:\n",
    '''\ndef test_context_resolved_reenters_original_investigator_checkpoint() -> None:\n    continuation = {\n        "originatingInvestigationReference": "investigator:task-call-17:need-1",\n        "investigatorExecutionId": "task-call-17",\n        "workflowRunId": "workflow-original",\n        "checkpointId": "checkpoint-original",\n        "affectedRuleIds": ["ENG-1"],\n        "artifactVersions": {\n            "technicalEvidenceReportId": "ter-1",\n            "repositorySnapshotId": "snapshot-1",\n        },\n        "sourceVersion": "snapshot-1:abc",\n        "pgeVersion": "ter-1:v1",\n    }\n\n    class TargetedApi(RecordingApi):\n        def get_interview_private_context(self, *args, **kwargs):\n            result = super().get_interview_private_context(*args, **kwargs)\n            result["targetedNeed"] = {\n                "needId": "need-1",\n                "businessContextNeed": "Who approves?",\n                "resolutionCriteria": ["decision_authority"],\n                "originatingInvestigationReference": continuation["originatingInvestigationReference"],\n            }\n            return result\n\n        def post_interview_agent_decision(self, assessment_id, payload):\n            super().post_interview_agent_decision(assessment_id, payload)\n            return {"outcome": "CONTEXT_RESOLVED", "continuation": continuation}\n\n    targeted_handoff = {\n        "expectedContextRevision": 0,\n        "mode": "TARGETED_INTERVIEW",\n        "outcome": "CONTEXT_RESOLVED",\n        "contextAuthority": "CUSTOMER_CONFIRMED",\n        "confirmedContext": {"decision_authority": "human"},\n        "flags": [],\n        "blockedActions": [],\n        "targetedResolution": {},\n    }\n    api = TargetedApi()\n    root = RecordingRoot()\n    boundary = AssessmentInterviewResumeBoundary(\n        SimpleNamespace(),\n        root_agent=root,\n        api_client=api,\n        dispatcher=RecordingDispatcher(targeted_handoff),\n    )\n\n    boundary.handle(_message(reason="TARGETED_INTERVIEW_REQUIRED"), "corr-1")\n\n    assert len(root.calls) == 1\n    payload, config, context = root.calls[0]\n    assert config["configurable"] == {\n        "thread_id": "workflow-original",\n        "checkpoint_id": "checkpoint-original",\n    }\n    assert config["metadata"]["investigator_execution_id"] == "task-call-17"\n    assert config["metadata"]["artifact_versions"] == continuation["artifactVersions"]\n    assert context.workflow_run_id == "workflow-original"\n    assert context.checkpoint_id == "checkpoint-original"\n    assert context.engineering_rule_ids == ("ENG-1",)\n    assert "checkpoint-original" not in payload["messages"][0]["content"]\n    assert "task-call-17" not in payload["messages"][0]["content"]\n\n\ndef test_interview_resume_boundary_rejects_missing_revision() -> None:\n''',
)

# 6) API E2E: original pins required, control validation, authoritative-now revalidation, event-safe draft.
replace_once(
    API_E2E,
    "        investigatorExecutionId: \"investigator-run-1\",\n        checkpointId: \"checkpoint-1\",\n        affectedRuleIds: [\"ENG-1\"],\n",
    "        investigatorExecutionId: \"investigator-run-1\",\n        workflowRunId: \"workflow-run-1\",\n        checkpointId: \"checkpoint-1\",\n        affectedRuleIds: [\"ENG-1\"],\n        artifactVersions: { technicalEvidenceReportId: \"ter-original\" },\n",
)
replace_once(
    API_E2E,
    "        affectedRuleIds: string[];\n      };\n",
    "        workflowRunId: string;\n        affectedRuleIds: string[];\n        artifactVersions: Record<string, string>;\n      };\n",
)
replace_once(
    API_E2E,
    "    assert.equal(resolvedState.continuation.checkpointId, \"checkpoint-1\");\n    assert.deepEqual(resolvedState.continuation.affectedRuleIds, [\"ENG-1\"]);\n",
    "    assert.equal(resolvedState.continuation.workflowRunId, \"workflow-run-1\");\n    assert.equal(resolvedState.continuation.checkpointId, \"checkpoint-1\");\n    assert.deepEqual(resolvedState.continuation.affectedRuleIds, [\"ENG-1\"]);\n    assert.deepEqual(resolvedState.continuation.artifactVersions, {\n      technicalEvidenceReportId: \"ter-original\",\n    });\n",
)
replace_once(
    API_E2E,
    "\n  it(\"uses server-owned targeted criteria and continuation before exact resume\", async () => {\n",
    '''\n  it("re-reads authoritative provenance instead of trusting stale thread pins", async () => {\n    await seedWaitingQuestion(prisma);\n    const answered = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });\n    assert.equal(answered.status, 201, JSON.stringify(answered.body));\n\n    const thread = await prisma.assessmentInterviewThread.findUniqueOrThrow({\n      where: { assessmentId: "assessment-1" },\n    });\n    const store = jsonRecord(thread.privateContextJson);\n    const revisions = Array.isArray(store.revisions) ? store.revisions : [];\n    const staleRevisions = revisions.map((value) => ({\n      ...jsonRecord(value),\n      sourceVersion: "stale-source-pin",\n      pgeVersion: "stale-pge-pin",\n    }));\n    await prisma.assessmentInterviewThread.update({\n      where: { assessmentId: "assessment-1" },\n      data: {\n        sourceVersion: "stale-source-pin",\n        pgeVersion: "stale-pge-pin",\n        privateContextJson: { ...store, revisions: staleRevisions },\n      },\n    });\n\n    const stale = await httpRequest(app)\n      .get("/internal/assessment-interviews/assessment-1/private-context/1")\n      .query({\n        source_version: "stale-source-pin",\n        pge_version: "stale-pge-pin",\n      })\n      .set("x-worker-api-key", WORKER_KEY);\n    assert.equal(stale.status, 200, JSON.stringify(stale.body));\n    assert.equal(successBody<{ status: string }>(stale).status, "STALE_PROVENANCE");\n  });\n\n  it("rejects answers that do not match the active runtime control", async () => {\n    const seeded = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/initial-question")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n        activeQuestion: {\n          id: QUESTION_ID,\n          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,\n          control: ASSESSMENT_INTERVIEW_CONTROLS.boolean,\n          prompt: "Is human approval required?",\n        },\n      });\n    assert.equal(seeded.status, 201, JSON.stringify(seeded.body));\n\n    const empty = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ questionId: QUESTION_ID });\n    assert.equal(empty.status, 400, JSON.stringify(empty.body));\n\n    const invalidChoice = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ questionId: QUESTION_ID, selectedChoiceIds: ["maybe"] });\n    assert.equal(invalidChoice.status, 400, JSON.stringify(invalidChoice.body));\n\n    const valid = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ questionId: QUESTION_ID, selectedChoiceIds: ["yes"] });\n    assert.equal(valid.status, 201, JSON.stringify(valid.body));\n  });\n\n  it("uses server-owned targeted criteria and continuation before exact resume", async () => {\n''',
)
replace_once(
    API_E2E,
    "\n  it(\"re-enters Interview when Customer chooses Provide More Context\", async () => {\n",
    '''\n  it("keeps raw saved draft out of Agent-decision runtime events", async () => {\n    await seedWaitingQuestion(prisma);\n    const saved = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/blocked-actions")\n      .set("Authorization", `Bearer ${token}`)\n      .send({\n        action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,\n        draft: RAW_DRAFT,\n      });\n    assert.equal(saved.status, 201, JSON.stringify(saved.body));\n\n    const more = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/blocked-actions")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ action: ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext });\n    assert.equal(more.status, 201, JSON.stringify(more.body));\n\n    const decision = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/agent-decisions")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        expectedContextRevision: 0,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n        activeQuestion: {\n          id: "more-context-question",\n          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,\n          control: ASSESSMENT_INTERVIEW_CONTROLS.freeText,\n          prompt: "Please provide the additional context.",\n        },\n      });\n    assert.equal(decision.status, 201, JSON.stringify(decision.body));\n\n    const runtimeEvent = await prisma.assessmentRuntimeEvent.findFirstOrThrow({\n      where: {\n        assessmentId: "assessment-1",\n        summary: { contains: "guarded decision persisted" },\n      },\n      orderBy: { sequence: "desc" },\n    });\n    assert.doesNotMatch(JSON.stringify(runtimeEvent.outputSummaryJson), /Need internal legal owner/u);\n  });\n\n  it("re-enters Interview when Customer chooses Provide More Context", async () => {\n''',
)

# Remove helper infrastructure from the final tree; workflow is already loaded for this run.
for helper in [
    ROOT / ".github/scripts/pr282_review_5109135140.py",
    ROOT / ".github/workflows/pr282-review-5109135140.yml",
]:
    if helper.exists():
        helper.unlink()

print("PR #282 review 5109135140 hardening patch applied")
