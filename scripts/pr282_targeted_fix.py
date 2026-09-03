from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def p(path: str) -> Path:
    return ROOT / path


def read(path: str) -> str:
    return p(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = p(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    content = read(path)
    if content.count(old) < count:
        raise RuntimeError(f"expected snippet not found enough times in {path}: {old[:160]!r}")
    write(path, content.replace(old, new, count))


def replace_between(path: str, start: str, end: str, new: str) -> None:
    content = read(path)
    a = content.find(start)
    if a < 0:
        raise RuntimeError(f"start marker missing in {path}: {start!r}")
    b = content.find(end, a)
    if b < 0:
        raise RuntimeError(f"end marker missing in {path}: {end!r}")
    write(path, content[:a] + new + content[b:])


# ---------------------------------------------------------------------------
# Python structured contracts: Investigator may request bounded Customer input,
# but opaque continuation/origin are derived by trusted orchestration middleware.
# ---------------------------------------------------------------------------
replace(
    "deepagents/contracts/handoffs.py",
    '''class InvestigatorResult(BaseModel):\n    """Typed Investigator-to-deterministic-gate handoff."""\n''',
    '''class BusinessContextNeed(BaseModel):\n    """Bounded Investigator-authored business-context need for Targeted Interview."""\n\n    model_config = ConfigDict(extra="forbid")\n\n    need_id: str = Field(min_length=1, max_length=240)\n    business_context_need: str = Field(min_length=1, max_length=2_000)\n    resolution_criteria: list[str] = Field(min_length=1, max_length=20)\n\n\nclass InvestigatorResult(BaseModel):\n    """Typed Investigator-to-deterministic-gate handoff."""\n''',
)
replace(
    "deepagents/contracts/handoffs.py",
    '''    missing_input: str | None = Field(default=None, max_length=1_000)\n    next_step: Literal["GATE", "RESOLVE"]\n''',
    '''    missing_input: str | None = Field(default=None, max_length=1_000)\n    business_context_need: BusinessContextNeed | None = None\n    next_step: Literal["GATE", "RESOLVE"]\n''',
)
replace(
    "deepagents/contracts/handoffs.py",
    '''            if self.missing_input:\n                raise ValueError("READY Investigator output cannot carry missing_input")\n            return self\n        if self.next_step != "RESOLVE":\n            raise ValueError("NEEDS_INPUT Investigator output must transition to RESOLVE")\n        if not self.missing_input:\n            raise ValueError("NEEDS_INPUT Investigator output requires missing_input")\n        return self\n''',
    '''            if self.missing_input or self.business_context_need is not None:\n                raise ValueError("READY Investigator output cannot carry business-context input")\n            return self\n        if self.next_step != "RESOLVE":\n            raise ValueError("NEEDS_INPUT Investigator output must transition to RESOLVE")\n        if not self.missing_input or self.business_context_need is None:\n            raise ValueError("NEEDS_INPUT Investigator output requires a bounded business_context_need")\n        return self\n''',
)
replace(
    "deepagents/contracts/handoffs.py",
    '''    "GraphSeed",\n''',
    '''    "BusinessContextNeed",\n    "GraphSeed",\n''',
)

# Trusted middleware persists the target need/continuation before Root sees the
# handoff. The model never supplies provenance pins, actor identity or checkpoint.
replace(
    "deepagents/middleware/specialist_handoff_validation.py",
    '''    validate_specialist_handoff(\n        subagent_type,\n        payload,\n        graph=graph,\n        pinned_rule_ids=tuple(context.engineering_rule_ids if context is not None else ()),\n        pinned_versions=dict(context.artifact_versions if context is not None else {}),\n    )\n    return result\n''',
    '''    validate_specialist_handoff(\n        subagent_type,\n        payload,\n        graph=graph,\n        pinned_rule_ids=tuple(context.engineering_rule_ids if context is not None else ()),\n        pinned_versions=dict(context.artifact_versions if context is not None else {}),\n    )\n    _persist_targeted_interview_need(\n        subagent_type=subagent_type,\n        payload=payload,\n        context=context,\n        metadata=metadata,\n    )\n    return result\n''',
)
replace(
    "deepagents/middleware/specialist_handoff_validation.py",
    '''def _task_tool_message_content(result: ToolMessage | Command) -> str | None:\n''',
    '''def _persist_targeted_interview_need(\n    *,\n    subagent_type: str,\n    payload: dict[str, Any],\n    context: LCSPRunContext | None,\n    metadata: dict[str, Any],\n) -> None:\n    if subagent_type != "investigator" or payload.get("status") != "NEEDS_INPUT":\n        return\n    if context is None or not context.assessment_id or not context.user_id:\n        raise RuntimeError("Targeted Interview registration requires trusted assessment/user context")\n    execution_id = context.checkpoint_id or context.workflow_run_id\n    if not execution_id:\n        raise RuntimeError("Targeted Interview registration requires a trusted Investigator execution reference")\n    affected_rule_ids = tuple(context.engineering_rule_ids)\n    if not affected_rule_ids:\n        raise RuntimeError("Targeted Interview registration requires pinned EngineeringRule scope")\n    need = payload.get("business_context_need")\n    if not isinstance(need, dict):\n        raise RuntimeError("Investigator NEEDS_INPUT handoff is missing business_context_need")\n    need_id = str(need.get("need_id") or "").strip()\n    business_need = str(need.get("business_context_need") or "").strip()\n    criteria = need.get("resolution_criteria")\n    if not need_id or not business_need or not isinstance(criteria, list) or not criteria:\n        raise RuntimeError("Investigator business_context_need is incomplete")\n    api_client = metadata.get("api_client") or _worker_api_client_from_env()\n    if api_client is None:\n        raise RuntimeError("Targeted Interview registration requires WorkerApiClient")\n    register = getattr(api_client, "post_interview_targeted_need", None)\n    if not callable(register):\n        raise RuntimeError("WorkerApiClient cannot register Targeted Interview needs")\n    originating_reference = f"investigator:{execution_id}:{need_id}"\n    register(\n        context.assessment_id,\n        {\n            "actorId": context.user_id,\n            "needId": need_id,\n            "businessContextNeed": business_need,\n            "resolutionCriteria": [str(item) for item in criteria],\n            "originatingInvestigationReference": originating_reference,\n            "investigatorExecutionId": execution_id,\n            "checkpointId": context.checkpoint_id,\n            "affectedRuleIds": list(affected_rule_ids),\n        },\n    )\n\n\ndef _task_tool_message_content(result: ToolMessage | Command) -> str | None:\n''',
)

# ---------------------------------------------------------------------------
# Worker client route for deterministic Targeted Interview registration.
# ---------------------------------------------------------------------------
replace(
    "deepagents/tools/common/capabilities/package/contract/api_client_contracts.py",
    '''    INTERVIEW_INITIAL_QUESTION = "/internal/assessment-interviews/{assessment_id}/initial-question"\n''',
    '''    INTERVIEW_INITIAL_QUESTION = "/internal/assessment-interviews/{assessment_id}/initial-question"\n    INTERVIEW_TARGETED_NEED = "/internal/assessment-interviews/{assessment_id}/targeted-needs"\n''',
)
replace(
    "deepagents/tools/common/capabilities/platform/api_client.py",
    '''    def dispatch_agentic_tool(self, payload: dict) -> dict:\n''',
    '''    def post_interview_targeted_need(self, assessment_id: str, payload: dict) -> dict:\n        """Persist a server-guarded Targeted Interview need and opaque continuation."""\n        path = InternalPath.INTERVIEW_TARGETED_NEED.format(assessment_id=assessment_id)\n        data = self._post_with_retry(path, payload)\n        if not isinstance(data, dict):\n            raise WorkerCallbackError("Interview targeted need response was invalid.")\n        return data\n\n    def dispatch_agentic_tool(self, payload: dict) -> dict:\n''',
)

# ---------------------------------------------------------------------------
# API runtime private store: backward-compatible with legacy revision arrays.
# Safe targeted need is worker-readable; opaque continuation is never returned to
# Interview and only leaves the API after a successful CONTEXT_RESOLVED guard.
# ---------------------------------------------------------------------------
service = "apps/api/src/modules/assessment/application/services/assessment-interview-runtime.service.ts"
replace(
    service,
    '''};\n\ntype WorkerPrivateContext = {\n''',
    '''};\n\ntype TargetedInterviewNeed = {\n  needId: string;\n  businessContextNeed: string;\n  resolutionCriteria: string[];\n  originatingInvestigationReference: string;\n  sourceVersion: string;\n  pgeVersion: string;\n};\n\ntype TargetedInterviewContinuation = {\n  originatingInvestigationReference: string;\n  investigatorExecutionId: string;\n  checkpointId?: string;\n  affectedRuleIds: string[];\n  artifactVersions: { sourceVersion: string; pgeVersion: string };\n};\n\ntype PrivateInterviewStore = {\n  revisions: PrivateInterviewAnswerRevision[];\n  targetedNeed?: TargetedInterviewNeed;\n  targetedContinuation?: TargetedInterviewContinuation;\n};\n\ntype TargetedNeedRegistrationInput = {\n  actorId: string;\n  needId: string;\n  businessContextNeed: string;\n  resolutionCriteria: string[];\n  originatingInvestigationReference: string;\n  investigatorExecutionId: string;\n  checkpointId?: string;\n  affectedRuleIds: string[];\n};\n\ntype WorkerPrivateContext = {\n''',
)
replace(
    service,
    '''  privateRevision?: PrivateInterviewAnswerRevision;\n};\n''',
    '''  privateRevision?: PrivateInterviewAnswerRevision;\n  targetedNeed?: TargetedInterviewNeed;\n};\n''',
)
replace(
    service,
    '''  resolutionCriteria?: string[];\n  originatingInvestigationReference?: string;\n  continuation?: {\n    originatingInvestigationReference?: string;\n    consumed?: boolean;\n    investigatorExecutionId?: string;\n    affectedRuleIds?: string[];\n    artifactVersions?: Record<string, string>;\n  };\n''',
    '''''',
)
replace(
    service,
    '''          privateContextJson: toJson([\n            ...thread.privateRevisions,\n            privateRevision,\n          ]),\n''',
    '''          privateContextJson: toJson({\n            ...thread.privateStore,\n            revisions: [...thread.privateRevisions, privateRevision],\n          }),\n''',
)
replace(
    service,
    '''        privateRevisions: current.privateRevisions,\n''',
    '''        privateStore: current.privateStore,\n''',
)
replace(
    service,
    '''      publicState: thread.state,\n      privateRevision,\n    };\n  }\n\n  async getWorkerStateForWorker''',
    '''      publicState: thread.state,\n      privateRevision,\n      targetedNeed: thread.privateStore.targetedNeed,\n    };\n  }\n\n  async registerTargetedNeedForWorker(input: {\n    assessmentId: string;\n    correlationId: string;\n    target: TargetedNeedRegistrationInput;\n  }): Promise<AssessmentInterviewRuntimeState> {\n    const target = parseTargetedNeedRegistration(input.target);\n    return this.prisma.$transaction(async (tx) => {\n      const thread = await this.readThread(input.assessmentId, tx);\n      if (thread.state.outcome !== ASSESSMENT_INTERVIEW_OUTCOMES.contextReady) {\n        throw problemException(\n          "INTERVIEW_TARGETED_NEED_REQUIRES_READY_CONTEXT",\n          input.correlationId,\n          { status: HttpStatus.CONFLICT },\n        );\n      }\n      const provenance = await this.assessmentProvenance(input.assessmentId, tx);\n      const targetedNeed: TargetedInterviewNeed = {\n        needId: target.needId,\n        businessContextNeed: target.businessContextNeed,\n        resolutionCriteria: target.resolutionCriteria,\n        originatingInvestigationReference: target.originatingInvestigationReference,\n        sourceVersion: provenance.sourceVersion,\n        pgeVersion: provenance.pgeVersion,\n      };\n      const targetedContinuation: TargetedInterviewContinuation = {\n        originatingInvestigationReference: target.originatingInvestigationReference,\n        investigatorExecutionId: target.investigatorExecutionId,\n        checkpointId: target.checkpointId,\n        affectedRuleIds: target.affectedRuleIds,\n        artifactVersions: {\n          sourceVersion: provenance.sourceVersion,\n          pgeVersion: provenance.pgeVersion,\n        },\n      };\n      const nextState: AssessmentInterviewRuntimeState = {\n        ...thread.state,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n        activeQuestion: undefined,\n        orchestrationRequested: true,\n      };\n      const privateStore: PrivateInterviewStore = {\n        ...thread.privateStore,\n        targetedNeed,\n        targetedContinuation,\n      };\n      await this.persistThreadState(input.assessmentId, nextState, tx, {\n        contextRevision: thread.contextRevision,\n        activeQuestionId: null,\n        processedRevision: thread.processedRevision,\n        privateStore,\n        sourceVersion: provenance.sourceVersion,\n        pgeVersion: provenance.pgeVersion,\n      });\n      await this.outboxRepository.enqueue(\n        this.interviewAgentResumeCommand({\n          assessmentId: input.assessmentId,\n          actorId: target.actorId,\n          correlationId: input.correlationId,\n          contextRevision: thread.contextRevision,\n          questionId: target.needId,\n          sourceVersion: provenance.sourceVersion,\n          pgeVersion: provenance.pgeVersion,\n          resumeReason: "TARGETED_INTERVIEW_REQUIRED",\n        }),\n        tx,\n      );\n      return nextState;\n    });\n  }\n\n  async getWorkerStateForWorker''',
)

replace_between(
    service,
    '''  async recordAgentDecision(input: {\n''',
    '''  async seedInitialQuestionForWorker(input: {\n''',
    '''  async recordAgentDecision(input: {\n    assessmentId: string;\n    correlationId: string;\n    decision: AgentDecisionInput;\n  }): Promise<\n    AssessmentInterviewRuntimeState & { continuation?: TargetedInterviewContinuation }\n  > {\n    const decision = parseAgentDecision(input.decision);\n    const result = await this.prisma.$transaction(async (tx) => {\n      const thread = await this.readThread(input.assessmentId, tx);\n      if (decision.expectedContextRevision !== thread.contextRevision) {\n        throw problemException(\n          "INTERVIEW_DECISION_STALE_REVISION",\n          input.correlationId,\n          { status: HttpStatus.CONFLICT },\n        );\n      }\n      const latestPrivate = thread.privateRevisions.find(\n        (revision) =>\n          revision.contextRevision === decision.expectedContextRevision,\n      );\n      const isBlockedFollowup =\n        thread.state.outcome ===\n          ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved &&\n        decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer;\n      const isTargetedBootstrap =\n        decision.mode === "TARGETED_INTERVIEW" &&\n        decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer &&\n        thread.state.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer &&\n        !thread.activeQuestionId &&\n        !!thread.privateStore.targetedNeed;\n      assertGuardedDecision(\n        decision,\n        latestPrivate,\n        thread,\n        input.correlationId,\n        { isBlockedFollowup, isTargetedBootstrap },\n      );\n      const state = decisionState(thread.state, decision);\n      const revisions = thread.privateRevisions.map((revision) =>\n        revision.contextRevision === decision.expectedContextRevision\n          ? { ...revision, processedAt: new Date().toISOString() }\n          : revision,\n      );\n      const updated = await tx.assessmentInterviewThread.updateMany({\n        where: {\n          assessmentId: input.assessmentId,\n          contextRevision: decision.expectedContextRevision,\n          activeQuestionId: thread.activeQuestionId,\n          processedRevision:\n            isBlockedFollowup || isTargetedBootstrap\n              ? thread.processedRevision\n              : { lt: decision.expectedContextRevision },\n        },\n        data: {\n          stateJson: toJson(state),\n          contextRevision: thread.contextRevision,\n          activeQuestionId: state.activeQuestion?.id ?? null,\n          processedRevision: decision.expectedContextRevision,\n          privateContextJson: toJson({\n            ...thread.privateStore,\n            revisions,\n          }),\n        },\n      });\n      if (updated.count !== 1) {\n        throw problemException(\n          "INTERVIEW_DECISION_ALREADY_PROCESSED",\n          input.correlationId,\n          { status: HttpStatus.CONFLICT },\n        );\n      }\n      return {\n        state,\n        continuation:\n          decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved\n            ? thread.privateStore.targetedContinuation\n            : undefined,\n      };\n    });\n\n    await this.runtimeEvents.recordToolWaitingInput({\n      assessmentId: input.assessmentId,\n      runId: this.threadId(input.assessmentId),\n      correlationId: input.correlationId,\n      stage: ASSESSMENT_RUNTIME_STAGE_CODES.interview,\n      toolName: INTERVIEW_TOOL_NAME,\n      summary:\n        "Interview Agent guarded decision persisted for customer or orchestration continuation.",\n      inputSummary: { decisionOutcome: result.state.outcome },\n      outputSummary: { assessmentInterview: publicState(result.state) },\n      waitingReason:\n        result.state.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer\n          ? "WAITING_FOR_CUSTOMER"\n          : null,\n      startedAt: new Date(),\n    });\n    return result.continuation\n      ? { ...result.state, continuation: result.continuation }\n      : result.state;\n  }\n\n''',
)

replace(
    service,
    '''      privateRevisions: [],\n''',
    '''      privateStore: { revisions: [] },\n''',
)

replace_between(
    service,
    '''  private async readThread(\n''',
    '''  private interviewAgentResumeCommand(input: {\n''',
    '''  private async readThread(\n    assessmentId: string,\n    tx?: Prisma.TransactionClient,\n  ): Promise<{\n    state: AssessmentInterviewRuntimeState;\n    privateStore: PrivateInterviewStore;\n    privateRevisions: PrivateInterviewAnswerRevision[];\n    contextRevision: number;\n    activeQuestionId: string | null;\n    processedRevision: number;\n    sourceVersion: string | null;\n    pgeVersion: string | null;\n  }> {\n    const client = tx ?? this.prisma;\n    const thread = await client.assessmentInterviewThread.findUnique({\n      where: { assessmentId },\n    });\n    const fallbackState: AssessmentInterviewRuntimeState = {\n      outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n      threadId: this.threadId(assessmentId),\n      contextRevision: 0,\n      answerHistory: [],\n    };\n    if (!thread) {\n      const privateStore: PrivateInterviewStore = { revisions: [] };\n      return {\n        state: fallbackState,\n        privateStore,\n        privateRevisions: privateStore.revisions,\n        contextRevision: 0,\n        activeQuestionId: null,\n        processedRevision: 0,\n        sourceVersion: null,\n        pgeVersion: null,\n      };\n    }\n    const state = parsePublicInterviewState(thread.stateJson) ?? fallbackState;\n    const privateStore = parsePrivateStore(thread.privateContextJson);\n    return {\n      state,\n      privateStore,\n      privateRevisions: privateStore.revisions,\n      contextRevision: thread.contextRevision,\n      activeQuestionId: thread.activeQuestionId,\n      processedRevision: thread.processedRevision,\n      sourceVersion: thread.sourceVersion,\n      pgeVersion: thread.pgeVersion,\n    };\n  }\n\n  private async persistThreadState(\n    assessmentId: string,\n    state: AssessmentInterviewRuntimeState,\n    tx?: Prisma.TransactionClient,\n    input?: {\n      contextRevision: number;\n      activeQuestionId: string | null;\n      processedRevision: number;\n      privateStore: PrivateInterviewStore;\n      sourceVersion: string;\n      pgeVersion: string;\n    },\n  ): Promise<void> {\n    const client = tx ?? this.prisma;\n    await client.assessmentInterviewThread.upsert({\n      where: { assessmentId },\n      update: {\n        stateJson: toJson(state),\n        ...(input\n          ? {\n              privateContextJson: toJson(input.privateStore),\n              contextRevision: input.contextRevision,\n              activeQuestionId: input.activeQuestionId,\n              processedRevision: input.processedRevision,\n              sourceVersion: input.sourceVersion,\n              pgeVersion: input.pgeVersion,\n            }\n          : {}),\n      },\n      create: {\n        id: this.threadId(assessmentId),\n        assessmentId,\n        stateJson: toJson(state),\n        privateContextJson: toJson(input?.privateStore ?? { revisions: [] }),\n        contextRevision: input?.contextRevision ?? state.contextRevision ?? 0,\n        activeQuestionId: input?.activeQuestionId ?? state.activeQuestion?.id,\n        processedRevision: input?.processedRevision ?? 0,\n        sourceVersion: input?.sourceVersion,\n        pgeVersion: input?.pgeVersion,\n      },\n    });\n  }\n\n''',
)
replace(
    service,
    '''      idempotencyKey: `${input.assessmentId}:${input.contextRevision}:${ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox}`,\n''',
    '''      idempotencyKey: `${input.assessmentId}:${input.contextRevision}:${input.resumeReason}:${input.questionId}:${ASSESSMENT_EVENT_TYPES.interviewAgentResumeRequestedOutbox}`,\n''',
)

# Decision parsing no longer accepts criteria/origin/continuation supplied by the
# Interview worker. These are loaded exclusively from the private server store.
replace(
    service,
    '''    resolutionCriteria: Array.isArray(record.resolutionCriteria)\n      ? record.resolutionCriteria.filter(\n          (item): item is string => typeof item === "string",\n        )\n      : undefined,\n    originatingInvestigationReference:\n      typeof record.originatingInvestigationReference === "string"\n        ? record.originatingInvestigationReference\n        : undefined,\n    continuation: objectRecord(record.continuation)\n      ? (record.continuation as AgentDecisionInput["continuation"])\n      : undefined,\n''',
    '''''',
)
replace(
    service,
    '''function parseAgentDecision(value: unknown): AgentDecisionInput {\n''',
    '''function parseTargetedNeedRegistration(\n  value: unknown,\n): TargetedNeedRegistrationInput {\n  const record = objectRecord(value);\n  const criteria = Array.isArray(record?.resolutionCriteria)\n    ? record.resolutionCriteria.filter(\n        (item): item is string => typeof item === "string" && item.trim().length > 0,\n      )\n    : [];\n  const affectedRuleIds = Array.isArray(record?.affectedRuleIds)\n    ? record.affectedRuleIds.filter(\n        (item): item is string => typeof item === "string" && item.trim().length > 0,\n      )\n    : [];\n  if (\n    !record ||\n    typeof record.actorId !== "string" ||\n    typeof record.needId !== "string" ||\n    typeof record.businessContextNeed !== "string" ||\n    !criteria.length ||\n    typeof record.originatingInvestigationReference !== "string" ||\n    typeof record.investigatorExecutionId !== "string" ||\n    !affectedRuleIds.length\n  ) {\n    throw new BadRequestException({ code: "INTERVIEW_TARGETED_NEED_INVALID" });\n  }\n  return {\n    actorId: record.actorId,\n    needId: record.needId,\n    businessContextNeed: record.businessContextNeed,\n    resolutionCriteria: criteria,\n    originatingInvestigationReference: record.originatingInvestigationReference,\n    investigatorExecutionId: record.investigatorExecutionId,\n    checkpointId:\n      typeof record.checkpointId === "string" ? record.checkpointId : undefined,\n    affectedRuleIds,\n  };\n}\n\nfunction parseAgentDecision(value: unknown): AgentDecisionInput {\n''',
)
replace_between(
    service,
    '''function parsePrivateRevisions(\n''',
    '''function isPrivateRevision(\n''',
    '''function parsePrivateStore(value: unknown): PrivateInterviewStore {\n  if (Array.isArray(value)) {\n    return { revisions: value.filter(isPrivateRevision) };\n  }\n  const record = objectRecord(value);\n  if (!record) {\n    return { revisions: [] };\n  }\n  const revisions = Array.isArray(record.revisions)\n    ? record.revisions.filter(isPrivateRevision)\n    : [];\n  const targetedNeed = parseStoredTargetedNeed(record.targetedNeed);\n  const targetedContinuation = parseStoredTargetedContinuation(\n    record.targetedContinuation,\n  );\n  return { revisions, targetedNeed, targetedContinuation };\n}\n\nfunction parseStoredTargetedNeed(value: unknown): TargetedInterviewNeed | undefined {\n  const record = objectRecord(value);\n  if (\n    !record ||\n    typeof record.needId !== "string" ||\n    typeof record.businessContextNeed !== "string" ||\n    !Array.isArray(record.resolutionCriteria) ||\n    typeof record.originatingInvestigationReference !== "string" ||\n    typeof record.sourceVersion !== "string" ||\n    typeof record.pgeVersion !== "string"\n  ) {\n    return undefined;\n  }\n  return record as TargetedInterviewNeed;\n}\n\nfunction parseStoredTargetedContinuation(\n  value: unknown,\n): TargetedInterviewContinuation | undefined {\n  const record = objectRecord(value);\n  const artifactVersions = objectRecord(record?.artifactVersions);\n  if (\n    !record ||\n    typeof record.originatingInvestigationReference !== "string" ||\n    typeof record.investigatorExecutionId !== "string" ||\n    !Array.isArray(record.affectedRuleIds) ||\n    !artifactVersions ||\n    typeof artifactVersions.sourceVersion !== "string" ||\n    typeof artifactVersions.pgeVersion !== "string"\n  ) {\n    return undefined;\n  }\n  return record as TargetedInterviewContinuation;\n}\n\n''',
)
replace_between(
    service,
    '''function assertGuardedDecision(\n''',
    '''function decisionState(\n''',
    '''function assertGuardedDecision(\n  decision: AgentDecisionInput,\n  privateRevision: PrivateInterviewAnswerRevision | undefined,\n  thread: {\n    state: AssessmentInterviewRuntimeState;\n    sourceVersion: string | null;\n    pgeVersion: string | null;\n    privateStore: PrivateInterviewStore;\n  },\n  correlationId: string,\n  followup: { isBlockedFollowup: boolean; isTargetedBootstrap: boolean },\n): void {\n  if (!privateRevision && !followup.isBlockedFollowup && !followup.isTargetedBootstrap) {\n    throw problemException(\n      "INTERVIEW_PRIVATE_REVISION_NOT_FOUND",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (\n    decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer &&\n    !decision.activeQuestion\n  ) {\n    throw problemException(\n      "INTERVIEW_WAITING_REQUIRES_QUESTION",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (\n    decision.outcome !== ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer &&\n    decision.activeQuestion\n  ) {\n    throw problemException(\n      "INTERVIEW_ACTIVE_QUESTION_OUTCOME_INVALID",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (\n    decision.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.contextReady &&\n    !isAuthoritative(decision.contextAuthority)\n  ) {\n    throw problemException(\n      "INTERVIEW_CONTEXT_READY_REQUIRES_AUTHORITY",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (decision.outcome !== ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved) {\n    return;\n  }\n  if (decision.mode !== "TARGETED_INTERVIEW") {\n    throw problemException(\n      "INTERVIEW_CONTEXT_RESOLVED_REQUIRES_TARGETED_MODE",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (!isAuthoritative(decision.contextAuthority)) {\n    throw problemException(\n      "INTERVIEW_CONTEXT_RESOLVED_REQUIRES_AUTHORITY",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  const target = thread.privateStore.targetedNeed;\n  const continuation = thread.privateStore.targetedContinuation;\n  if (!target || !continuation) {\n    throw problemException(\n      "INTERVIEW_TARGETED_CONTEXT_NOT_REGISTERED",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (\n    target.originatingInvestigationReference !==\n    continuation.originatingInvestigationReference\n  ) {\n    throw problemException(\n      "INTERVIEW_CONTINUATION_ORIGIN_MISMATCH",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  if (\n    target.sourceVersion !== thread.sourceVersion ||\n    target.pgeVersion !== thread.pgeVersion ||\n    continuation.artifactVersions.sourceVersion !== thread.sourceVersion ||\n    continuation.artifactVersions.pgeVersion !== thread.pgeVersion\n  ) {\n    throw problemException("INTERVIEW_CONTINUATION_STALE", correlationId, {\n      status: HttpStatus.CONFLICT,\n    });\n  }\n  if (!continuation.affectedRuleIds.length) {\n    throw problemException(\n      "INTERVIEW_CONTINUATION_SCOPE_REQUIRED",\n      correlationId,\n      { status: HttpStatus.CONFLICT },\n    );\n  }\n  const context = decision.confirmedContext ?? {};\n  const missing = target.resolutionCriteria.filter(\n    (criterion) => !(criterion in context),\n  );\n  if (missing.length > 0) {\n    throw problemException(\n      "INTERVIEW_RESOLUTION_CRITERIA_UNSATISFIED",\n      correlationId,\n      {\n        status: HttpStatus.CONFLICT,\n        meta: { missing: missing.join(",") },\n      },\n    );\n  }\n}\n\n''',
)

# Internal worker endpoint for middleware-owned registration.
controller = "apps/api/src/modules/assessment/presentation/http/assessment.controller.ts"
replace(
    controller,
    '''  @Post(":assessmentId/agent-decisions")\n''',
    '''  @Post(":assessmentId/targeted-needs")\n  async registerTargetedNeed(\n    @Param("assessmentId") assessmentId: string,\n    @Body() body: unknown,\n    @Req() request: AuthenticatedRequest,\n  ) {\n    return resultEnvelope(\n      await this.interviewRuntime.registerTargetedNeedForWorker({\n        assessmentId,\n        correlationId: request.correlationId ?? "worker-interview-context",\n        target: body as never,\n      }),\n    );\n  }\n\n  @Post(":assessmentId/agent-decisions")\n''',
)

# Boundary allows a same-revision targeted bootstrap, gives Interview only safe need,
# enforces TARGETED mode, and gives Root only the server-returned continuation.
boundary = "deepagents/tools/common/capabilities/workflow/recovery/interview_boundary.py"
replace(
    boundary,
    '''        if resume_reason != "PROVIDE_MORE_CONTEXT":\n            if status == DUPLICATE_CONTEXT or status == STALE_CONTEXT:\n                return\n            if status != CURRENT_CONTEXT:\n                raise ValueError(f"unexpected Interview private context status: {status}")\n        elif status not in {CURRENT_CONTEXT, DUPLICATE_CONTEXT}:\n            if status == STALE_CONTEXT:\n                return\n            raise ValueError(f"unexpected Interview private context status: {status}")\n''',
    '''        targeted_need = context.get("targetedNeed")\n        targeted_mode = isinstance(targeted_need, dict)\n        same_revision_resume = resume_reason == "PROVIDE_MORE_CONTEXT" or targeted_mode\n        if not same_revision_resume:\n            if status == DUPLICATE_CONTEXT or status == STALE_CONTEXT:\n                return\n            if status != CURRENT_CONTEXT:\n                raise ValueError(f"unexpected Interview private context status: {status}")\n        elif status not in {CURRENT_CONTEXT, DUPLICATE_CONTEXT}:\n            if status == STALE_CONTEXT:\n                return\n            raise ValueError(f"unexpected Interview private context status: {status}")\n''',
)
replace(
    boundary,
    '''        handoff["expectedContextRevision"] = context_revision\n        return handoff\n''',
    '''        handoff["expectedContextRevision"] = context_revision\n        targeted_need = context.get("targetedNeed")\n        if isinstance(targeted_need, dict):\n            if handoff.get("mode") != "TARGETED_INTERVIEW":\n                raise ValueError("Targeted Interview specialist must return TARGETED_INTERVIEW mode")\n            question = handoff.get("activeQuestion")\n            if isinstance(question, dict) and question.get("needId") not in {\n                None,\n                targeted_need.get("needId"),\n            }:\n                raise ValueError("Targeted Interview question escaped its registered need")\n        return handoff\n''',
)
replace(
    boundary,
    '''        root = self._root_agent or self._load_root_agent()\n        root.invoke(\n''',
    '''        continuation = guarded_state.get("continuation")\n        if outcome == "CONTEXT_RESOLVED" and not isinstance(continuation, dict):\n            raise ValueError("guarded CONTEXT_RESOLVED is missing server-owned continuation")\n\n        root = self._root_agent or self._load_root_agent()\n        root.invoke(\n''',
    count=1,
)
replace(
    boundary,
    '''                            outcome=outcome,\n                        ),\n''',
    '''                            outcome=outcome,\n                            continuation=continuation if isinstance(continuation, dict) else None,\n                        ),\n''',
)
replace(
    boundary,
    '''        "privateCustomerRevision": private_revision,\n    }\n''',
    '''        "privateCustomerRevision": private_revision,\n        "targetedNeed": context.get("targetedNeed"),\n    }\n''',
)
# Update helper signature/body near bottom without relying on exact prose body.
content = read(boundary)
old_sig = '''def _guarded_downstream_prompt(\n    *,\n    assessment_id: str,\n    thread_id: str,\n    context_revision: int,\n    pge_version: str,\n    outcome: str,\n) -> str:\n'''
if old_sig not in content:
    raise RuntimeError("guarded downstream signature not found")
content = content.replace(
    old_sig,
    '''def _guarded_downstream_prompt(\n    *,\n    assessment_id: str,\n    thread_id: str,\n    context_revision: int,\n    pge_version: str,\n    outcome: str,\n    continuation: dict[str, Any] | None = None,\n) -> str:\n''',
    1,
)
marker = '''    return (\n        "Interview Agent decision has passed the protected persistence guard. "'''
pos = content.find(marker)
if pos < 0:
    raise RuntimeError("guarded downstream body marker not found")
# Add continuation suffix just before this function's return closes by replacing its known final clause.
old_clause = '''        f"Persisted outcome: {outcome}. "\n        "Do not reuse raw Customer answer text; downstream work may use only persisted guarded context."\n    )\n'''
new_clause = '''        f"Persisted outcome: {outcome}. "\n        "Do not reuse raw Customer answer text; downstream work may use only persisted guarded context. "\n        + (\n            "Resume only the exact server-owned Investigator continuation: "\n            + json.dumps(continuation, ensure_ascii=False, sort_keys=True)\n            if continuation is not None\n            else ""\n        )\n    )\n'''
if old_clause not in content:
    raise RuntimeError("guarded downstream final clause not found")
write(boundary, content.replace(old_clause, new_clause, 1))

# ---------------------------------------------------------------------------
# API E2E: private store compatibility + prove forged worker criteria/continuation
# cannot resolve Targeted Interview; server-owned continuation is returned only
# after stored criteria are satisfied by a later Customer revision.
# ---------------------------------------------------------------------------
e2e = "apps/api/test/assessment-interview.e2e-spec.ts"
replace(
    e2e,
    '''    assert.equal(\n      Array.isArray(thread.privateContextJson)\n        ? thread.privateContextJson.length\n        : 0,\n      1,\n    );\n''',
    '''    const privateStore = jsonRecord(thread.privateContextJson);\n    const revisions = Array.isArray(privateStore.revisions)\n      ? privateStore.revisions\n      : [];\n    assert.equal(revisions.length, 1);\n''',
)
replace_between(
    e2e,
    '''  it("blocks targeted false resolved decisions that do not satisfy criteria", async () => {\n''',
    '''  it("re-enters Interview when Customer chooses Provide More Context", async () => {\n''',
    '''  it("uses server-owned targeted criteria and continuation before exact resume", async () => {\n    await seedWaitingQuestion(prisma);\n    await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({ questionId: QUESTION_ID, freeText: RAW_ANSWER });\n\n    const ready = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/agent-decisions")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        expectedContextRevision: 1,\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextReady,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { baseline: "confirmed" },\n      });\n    assert.equal(ready.status, 201, JSON.stringify(ready.body));\n\n    const registered = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/targeted-needs")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        actorId: "user-1",\n        needId: "need-decision-authority",\n        businessContextNeed: "Who has final decision authority?",\n        resolutionCriteria: ["decision_authority"],\n        originatingInvestigationReference:\n          "investigator:investigator-run-1:need-decision-authority",\n        investigatorExecutionId: "investigator-run-1",\n        checkpointId: "checkpoint-1",\n        affectedRuleIds: ["ENG-1"],\n      });\n    assert.equal(registered.status, 201, JSON.stringify(registered.body));\n\n    const privateTarget = await httpRequest(app)\n      .get("/internal/assessment-interviews/assessment-1/private-context/1")\n      .set("x-worker-api-key", WORKER_KEY);\n    assert.equal(privateTarget.status, 200, JSON.stringify(privateTarget.body));\n    const privateTargetState = successBody<{\n      status: string;\n      targetedNeed: { needId: string; resolutionCriteria: string[] };\n    }>(privateTarget);\n    assert.equal(privateTargetState.status, "DUPLICATE");\n    assert.equal(privateTargetState.targetedNeed.needId, "need-decision-authority");\n    assert.deepEqual(privateTargetState.targetedNeed.resolutionCriteria, [\n      "decision_authority",\n    ]);\n    assert.doesNotMatch(JSON.stringify(privateTarget.body), /checkpoint-1/u);\n    assert.doesNotMatch(JSON.stringify(privateTarget.body), /investigator-run-1/u);\n\n    const question = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/agent-decisions")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        expectedContextRevision: 1,\n        mode: "TARGETED_INTERVIEW",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer,\n        activeQuestion: {\n          id: "target-question-1",\n          needId: "need-decision-authority",\n          intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,\n          control: ASSESSMENT_INTERVIEW_CONTROLS.freeText,\n          prompt: "Who has final decision authority?",\n        },\n      });\n    assert.equal(question.status, 201, JSON.stringify(question.body));\n\n    const targetedAnswer = await httpRequest(app)\n      .post("/assessments/assessment-1/interview/answers")\n      .set("Authorization", `Bearer ${token}`)\n      .send({\n        questionId: "target-question-1",\n        freeText: "The human operations lead has final approval.",\n      });\n    assert.equal(targetedAnswer.status, 201, JSON.stringify(targetedAnswer.body));\n\n    const forged = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/agent-decisions")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        expectedContextRevision: 2,\n        mode: "TARGETED_INTERVIEW",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { unrelated: "yes" },\n        resolutionCriteria: ["unrelated"],\n        originatingInvestigationReference: "forged-origin",\n        continuation: {\n          investigatorExecutionId: "forged-run",\n          affectedRuleIds: ["FORGED"],\n        },\n      });\n    assert.equal(forged.status, 409, JSON.stringify(forged.body));\n\n    const resolved = await httpRequest(app)\n      .post("/internal/assessment-interviews/assessment-1/agent-decisions")\n      .set("x-worker-api-key", WORKER_KEY)\n      .send({\n        expectedContextRevision: 2,\n        mode: "TARGETED_INTERVIEW",\n        outcome: ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n        contextAuthority:\n          ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,\n        confirmedContext: { decision_authority: "human operations lead" },\n        resolutionCriteria: ["forged"],\n        continuation: { investigatorExecutionId: "forged-run" },\n      });\n    assert.equal(resolved.status, 201, JSON.stringify(resolved.body));\n    const resolvedState = successBody<{\n      outcome: string;\n      continuation: {\n        originatingInvestigationReference: string;\n        investigatorExecutionId: string;\n        checkpointId: string;\n        affectedRuleIds: string[];\n      };\n    }>(resolved);\n    assert.equal(\n      resolvedState.outcome,\n      ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved,\n    );\n    assert.equal(\n      resolvedState.continuation.originatingInvestigationReference,\n      "investigator:investigator-run-1:need-decision-authority",\n    );\n    assert.equal(\n      resolvedState.continuation.investigatorExecutionId,\n      "investigator-run-1",\n    );\n    assert.equal(resolvedState.continuation.checkpointId, "checkpoint-1");\n    assert.deepEqual(resolvedState.continuation.affectedRuleIds, ["ENG-1"]);\n  });\n\n''',
)

# Focused Python test for deterministic middleware registration.
write(
    "deepagents/tests/test_targeted_interview_registration.py",
    '''from __future__ import annotations\n\nfrom orchestration.context import LCSPRunContext\nfrom middleware.specialist_handoff_validation import _persist_targeted_interview_need\n\n\nclass RecordingApi:\n    def __init__(self) -> None:\n        self.calls = []\n\n    def post_interview_targeted_need(self, assessment_id, payload):\n        self.calls.append((assessment_id, payload))\n        return {"outcome": "WAITING_FOR_CUSTOMER"}\n\n\ndef test_investigator_needs_input_persists_trusted_target_before_root() -> None:\n    api = RecordingApi()\n    context = LCSPRunContext(\n        assessment_id="assessment-1",\n        user_id="user-1",\n        workflow_run_id="workflow-1",\n        checkpoint_id="checkpoint-7",\n        engineering_rule_ids=("ENG-1", "ENG-2"),\n        artifact_versions={"technicalEvidenceReportId": "ter-1"},\n    )\n    _persist_targeted_interview_need(\n        subagent_type="investigator",\n        payload={\n            "status": "NEEDS_INPUT",\n            "business_context_need": {\n                "need_id": "need-1",\n                "business_context_need": "Who approves this action?",\n                "resolution_criteria": ["decision_authority"],\n            },\n        },\n        context=context,\n        metadata={"api_client": api},\n    )\n\n    assert len(api.calls) == 1\n    assessment_id, payload = api.calls[0]\n    assert assessment_id == "assessment-1"\n    assert payload["actorId"] == "user-1"\n    assert payload["investigatorExecutionId"] == "checkpoint-7"\n    assert payload["checkpointId"] == "checkpoint-7"\n    assert payload["affectedRuleIds"] == ["ENG-1", "ENG-2"]\n    assert payload["originatingInvestigationReference"] == "investigator:checkpoint-7:need-1"\n    assert "artifactVersions" not in payload\n\n\ndef test_non_investigator_or_ready_handoff_does_not_register_target() -> None:\n    api = RecordingApi()\n    context = LCSPRunContext(assessment_id="assessment-1", user_id="user-1")\n    _persist_targeted_interview_need(\n        subagent_type="planner",\n        payload={"status": "NEEDS_INPUT"},\n        context=context,\n        metadata={"api_client": api},\n    )\n    _persist_targeted_interview_need(\n        subagent_type="investigator",\n        payload={"status": "READY"},\n        context=context,\n        metadata={"api_client": api},\n    )\n    assert api.calls == []\n''',
)

print("targeted Interview server-owned guard patch applied")
