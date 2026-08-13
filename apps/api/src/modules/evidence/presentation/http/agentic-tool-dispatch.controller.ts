import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import {
  AGENTIC_TOOL_NAMES,
  EVIDENCE_ERROR_CODES,
} from "@lcsp/contracts/evidence";

import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { GetScanCoverageQuery } from "../../application/queries/get-scan-coverage/get-scan-coverage.query.js";
import { SearchEvidenceQuery } from "../../application/queries/search-evidence/search-evidence.query.js";
import { SEARCH_EVIDENCE_CONFIDENCE } from "../../application/contracts/evidence/search-evidence.contract.js";
import { GetFindingDetailQuery } from "../../application/queries/get-finding-detail/get-finding-detail.query.js";
import { FindProviderInvocationsQuery } from "../../application/queries/find-provider-invocations/find-provider-invocations.query.js";
import { GetEvidenceSubgraphQuery } from "../../application/queries/get-evidence-subgraph/get-evidence-subgraph.query.js";
import { GetSymbolContextQuery } from "../../application/queries/get-symbol-context/get-symbol-context.query.js";
import { TraceStaticFlowQuery } from "../../application/queries/trace-static-flow/trace-static-flow.query.js";
import { InspectHumanReviewPathQuery } from "../../application/queries/inspect-human-review-path/inspect-human-review-path.query.js";
import { InspectDecisionPathQuery } from "../../application/queries/inspect-decision-path/inspect-decision-path.query.js";
import { InspectDataPathQuery } from "../../application/queries/inspect-data-path/inspect-data-path.query.js";
import { FindSimilarSymbolsQuery } from "../../application/queries/find-similar-symbols/find-similar-symbols.query.js";
import { InspectDeploymentContextQuery } from "../../application/queries/inspect-deployment-context/inspect-deployment-context.query.js";
import { GetAssessmentContextQuery } from "../../../reconciliation/application/queries/get-assessment-context/get-assessment-context.query.js";
import { GetArtifactChainQuery } from "../../../reconciliation/application/queries/get-artifact-chain/get-artifact-chain.query.js";
import { GetReconciliationContextQuery } from "../../../reconciliation/application/queries/get-reconciliation-context/get-reconciliation-context.query.js";
import { ProposeMissingTargetsQuery } from "../../../reconciliation/application/queries/propose-missing-targets/propose-missing-targets.query.js";
import { GetVerifiedProfileQuery } from "../../../reconciliation/application/queries/get-verified-profile/get-verified-profile.query.js";
import { GetClassificationBaselineQuery } from "../../../classification/application/queries/get-classification-baseline/get-classification-baseline.query.js";
import { GetGapEvidenceTraceQuery } from "../../../classification/application/queries/get-gap-evidence-trace/get-gap-evidence-trace.query.js";
import { ProposeGapRemediationQuery } from "../../../classification/application/queries/propose-gap-remediation/propose-gap-remediation.query.js";
import { ValidateClassificationProposalQuery } from "../../../classification/application/queries/validate-classification-proposal/validate-classification-proposal.query.js";
import { EvaluateGapMatrixQuery } from "../../../classification/application/queries/evaluate-gap-matrix/evaluate-gap-matrix.query.js";
import { GetLegalCorpusReadinessQuery } from "../../../legal-rule-catalog/application/queries/get-legal-corpus-readiness/get-legal-corpus-readiness.query.js";
import { RetrieveLegalBasisQuery } from "../../../legal-rule-catalog/application/queries/retrieve-legal-basis/retrieve-legal-basis.query.js";
import { GetLegalRuleMatchQuery } from "../../../legal-rule-catalog/application/queries/get-legal-rule-match/get-legal-rule-match.query.js";
import { ValidateCitationSetQuery } from "../../../legal-rule-catalog/application/queries/validate-citation-set/validate-citation-set.query.js";

type DispatchRequest = {
  tool_name?: unknown;
  assessment_id?: unknown;
  organization_id?: unknown;
  user_id?: unknown;
  artifact_versions?: unknown;
  input?: unknown;
  correlation_id?: unknown;
};

@Controller("internal/evidence/agentic-tools")
@UseGuards(WorkerApiKeyGuard)
export class InternalAgenticToolDispatchController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post("dispatch")
  @HttpCode(HttpStatus.OK)
  async dispatch(@Body() payload: DispatchRequest) {
    const toolName = requiredString(payload.tool_name);
    const assessmentId = requiredString(payload.assessment_id);
    const organizationId = requiredString(payload.organization_id);
    const userId = requiredString(payload.user_id);
    const correlationId = requiredString(payload.correlation_id);
    const artifactVersions = record(payload.artifact_versions) ?? {};
    const input = record(payload.input) ?? {};

    return resultEnvelope(
      await this.queryBus.execute(
        buildQuery({
          toolName,
          assessmentId,
          organizationId,
          userId,
          correlationId,
          artifactVersions,
          input,
        }),
      ),
    );
  }
}

function buildQuery(args: {
  toolName: string;
  assessmentId: string;
  organizationId: string;
  userId: string;
  correlationId: string;
  artifactVersions: Record<string, unknown>;
  input: Record<string, unknown>;
}) {
  const {
    toolName,
    assessmentId,
    organizationId,
    userId,
    correlationId,
    artifactVersions,
    input,
  } = args;

  switch (toolName) {
    case AGENTIC_TOOL_NAMES.getScanCoverage:
      return new GetScanCoverageQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        numberWithDefault(input.maxResults, 25),
        correlationId,
        stringArray(input.pathPrefixes),
        stringArray(input.languages),
        stringArray(input.dispositions) as Array<
          "ANALYZED" | "SKIPPED" | "LIMITED"
        >,
        optionalString(input.cursor),
      );
    case AGENTIC_TOOL_NAMES.searchEvidence:
      return new SearchEvidenceQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        numberWithDefault(input.maxResults, 25),
        correlationId,
        stringArray(input.findingKinds),
        stringArray(input.providers),
        stringArray(input.pathPrefixes),
        optionalEnum(
          input.minConfidence,
          Object.values(SEARCH_EVIDENCE_CONFIDENCE),
        ),
        optionalString(input.cursor),
      );
    case AGENTIC_TOOL_NAMES.getFindingDetail:
      return new GetFindingDetailQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.findingId), "finding:"),
        stringArray(input.include),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.findProviderInvocations:
      return new FindProviderInvocationsQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        numberWithDefault(input.maxResults, 25),
        correlationId,
        optionalString(input.provider) ?? undefined,
        stringArray(input.pathPrefixes),
        optionalString(input.framework) ?? undefined,
      );
    case AGENTIC_TOOL_NAMES.getEvidenceSubgraph:
      return new GetEvidenceSubgraphQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.seedRef), "node:"),
        requiredString(input.direction),
        numberWithDefault(input.maxDepth, 2),
        numberWithDefault(input.maxNodes, 25),
        numberWithDefault(input.maxEdges, 50),
        correlationId,
        stringArray(input.nodeTypes),
        stringArray(input.edgeTypes),
      );
    case AGENTIC_TOOL_NAMES.getSymbolContext:
      return new GetSymbolContextQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.symbolRef), "symbol:"),
        stringArray(input.include),
        numberWithDefault(input.maxNeighbors, 25),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.traceStaticFlow:
      return new TraceStaticFlowQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.startRef), "node:"),
        requiredString(input.direction),
        numberWithDefault(input.maxHops, 5),
        correlationId,
        stringArray(input.desiredStages),
      );
    case AGENTIC_TOOL_NAMES.inspectHumanReviewPath:
      return new InspectHumanReviewPathQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.startRef), "node:"),
        stringArray(input.reviewKinds),
        numberWithDefault(input.maxHops, 5),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.inspectDecisionPath:
      return new InspectDecisionPathQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.startRef), "node:"),
        stringArray(input.actionCategories),
        numberWithDefault(input.maxHops, 5),
        numberWithDefault(input.maxResults, 25),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.inspectDataPath:
      return new InspectDataPathQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.startRef), "node:"),
        requiredString(input.direction),
        stringArray(input.dataCategories),
        numberWithDefault(input.maxHops, 5),
        numberWithDefault(input.maxResults, 25),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.findSimilarSymbols:
      return new FindSimilarSymbolsQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stripRef(requiredString(input.seedSymbolRef), "symbol:"),
        stringArray(input.dimensions),
        numberWithDefault(input.maxResults, 25),
        correlationId,
        stringArray(input.pathPrefixes),
      );
    case AGENTIC_TOOL_NAMES.inspectDeploymentContext:
      return new InspectDeploymentContextQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stringArray(input.manifestKinds),
        stringArray(input.environments),
        numberWithDefault(input.maxResults, 25),
        correlationId,
        stringArray(input.pathPrefixes),
        optionalString(input.cursor),
      );
    case AGENTIC_TOOL_NAMES.getAssessmentContext:
      return new GetAssessmentContextQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "wizardProfileId"),
        stringArray(input.include),
        stringArray(input.answerFields),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getArtifactChain:
      return new GetArtifactChainQuery(
        assessmentId,
        organizationId,
        correlationId,
        optionalRecord(input.anchor)
          ? optionalString(optionalRecord(input.anchor)?.artifactRef)
          : null,
        stringArray(input.requiredStages),
        input.exactVersions === true,
      );
    case AGENTIC_TOOL_NAMES.getReconciliationContext:
      return new GetReconciliationContextQuery(
        assessmentId,
        organizationId,
        correlationId,
        stripOptionalRef(optionalString(input.flowRef), "flow:"),
        stringArray(input.conflictIds).map((value) =>
          stripRef(value, "conflict:"),
        ),
        optionalString(input.cursor),
        numberWithDefault(input.maxResults, 25),
        stringArray(input.statuses),
      );
    case AGENTIC_TOOL_NAMES.proposeMissingTargets:
      return new ProposeMissingTargetsQuery(
        assessmentId,
        organizationId,
        requiredArtifactVersion(artifactVersions, "wizardProfileId"),
        requiredArtifactVersion(artifactVersions, "technicalEvidenceReportId"),
        stringArray(input.candidateKinds),
        stringArray(input.seedRefs),
        stringArray(input.excludeTargetIds),
        numberWithDefault(input.maxResults, 25),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getVerifiedProfile:
      return new GetVerifiedProfileQuery(
        assessmentId,
        organizationId,
        stripRef(requiredString(input.verifiedProfileId), "verified:"),
        requiredString(input.expectedVersion),
        requiredString(input.requiredFor),
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getClassificationBaseline:
      return new GetClassificationBaselineQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        null,
        null,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getGapEvidenceTrace:
      return new GetGapEvidenceTraceQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.proposeGapRemediation:
      return new ProposeGapRemediationQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.validateClassificationProposal:
      return new ValidateClassificationProposalQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        null,
        null,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.evaluateGapMatrix:
      return new EvaluateGapMatrixQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getLegalCorpusReadiness:
      return new GetLegalCorpusReadinessQuery(
        assessmentId,
        organizationId,
        new Date(`${requiredString(input.effectiveDate)}T00:00:00.000Z`),
        stripOptionalRef(
          optionalString(input.pinnedCorpusVersionId),
          "corpus_",
        ),
        userId,
        null,
        null,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.retrieveLegalBasis:
      return new RetrieveLegalBasisQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        null,
        null,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.getLegalRuleMatch:
      return new GetLegalRuleMatchQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        null,
        null,
        correlationId,
      );
    case AGENTIC_TOOL_NAMES.validateCitationSet:
      return new ValidateCitationSetQuery(
        assessmentId,
        organizationId,
        input as never,
        userId,
        null,
        null,
        correlationId,
      );
    default:
      throw problemException(EVIDENCE_ERROR_CODES.notFound, correlationId, {
        status: HttpStatus.NOT_FOUND,
      });
  }
}

function requiredArtifactVersion(
  input: Record<string, unknown>,
  key: string,
): string {
  return requiredString(input[key]);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalRecord(value: unknown): Record<string, unknown> | null {
  return record(value);
}

function requiredString(value: unknown): string {
  const result = optionalString(value);
  if (!result) {
    throw problemException(
      EVIDENCE_ERROR_CODES.notFound,
      "internal-agentic-dispatch",
      {
        status: HttpStatus.NOT_FOUND,
      },
    );
  }
  return result;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function numberWithDefault(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function stripRef(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function stripOptionalRef(value: string | null, prefix: string): string | null {
  return value ? stripRef(value, prefix) : null;
}

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : undefined;
}
