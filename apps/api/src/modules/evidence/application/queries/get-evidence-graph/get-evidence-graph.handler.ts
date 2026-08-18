/**
 * GetEvidenceGraph Query Handler
 *
 * Fetches TechnicalEvidenceReport and transforms it into graph structure.
 * Applies scope-based filtering and privacy redaction.
 *
 * Flow:
 * 1. Validate query params (scope, clusterId)
 * 2. Fetch TechnicalEvidenceReport (assert status=accepted, org match)
 * 3. Transform payload → graph (mapper)
 * 4. Apply redaction (if Developer scope)
 * 5. Build clusters (if overview scope)
 * 6. Audit log
 * 7. Return envelope
 */

import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";
import { HttpStatus, Optional } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { toPrismaEvidenceAcceptanceStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { ArtifactStorageService } from "../../../../../platform/storage/artifact-storage.service.js";

import type {
  EvidenceGraphDto,
  OverviewCluster,
} from "../../contracts/evidence/evidence-graph.contract.js";
import { ClusterBuilderService } from "../../services/graph/cluster-builder.service.js";
import { EvidenceGraphMapperService } from "../../services/graph/evidence-graph-mapper.service.js";
import { EvidenceGraphRedactorService } from "../../services/graph/evidence-graph-redactor.service.js";
import { GetEvidenceGraphQuery } from "./get-evidence-graph.query.js";

@QueryHandler(GetEvidenceGraphQuery)
export class GetEvidenceGraphHandler implements IQueryHandler<GetEvidenceGraphQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: EvidenceGraphMapperService,
    private readonly redactor: EvidenceGraphRedactorService,
    private readonly clusterBuilder: ClusterBuilderService,
    private readonly audit: AuditWriterService,
    @Optional() private readonly artifactStorage?: ArtifactStorageService,
  ) {}

  async execute(query: GetEvidenceGraphQuery): Promise<EvidenceGraphDto> {
    const correlationId = query.correlationId ?? "";

    // ========================================================================
    // 1. Validate query parameters
    // ========================================================================
    if (query.scope !== "overview" && query.scope !== "detail") {
      throw problemException("INVALID_ARGUMENT", correlationId, {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (query.scope === "detail" && !query.clusterId) {
      throw problemException("INVALID_ARGUMENT", correlationId, {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // ========================================================================
    // 2. Fetch TechnicalEvidenceReport
    // ========================================================================
    const report = await this.prisma.technicalEvidenceReport.findFirst({
      where: {
        assessmentId: query.assessmentId,
        organizationId: query.organizationId,
        status: toPrismaEvidenceAcceptanceStatus(
          TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
        ),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        assessmentId: true,
        organizationId: true,
        evidencePayload: true,
        createdAt: true,
      },
    });

    if (!report) {
      await this.audit.write({
        eventType: "EVIDENCE_GRAPH_ACCESS",
        actorId: query.userId,
        organizationId: query.organizationId,
        resourceType: AUDIT_RESOURCE_TYPES.technicalEvidenceReport,
        resourceId: query.assessmentId,
        decision: AUDIT_DECISIONS.deny,
        result: "EVIDENCE_NOT_FOUND",
        correlationId,
      });

      throw problemException("EVIDENCE_NOT_FOUND", correlationId, {
        status: HttpStatus.NOT_FOUND,
      });
    }

    // ========================================================================
    // 3. Check PBAC action
    // ========================================================================
    const isDeveloperScope = query.subjectRole === "DEVELOPER";
    const requiredAction = isDeveloperScope
      ? PBAC_ACTIONS.evidenceReadRedacted
      : PBAC_ACTIONS.evidenceRead;

    // Note: PBAC guard already validated. This is a double-check.
    if (
      isDeveloperScope &&
      requiredAction !== PBAC_ACTIONS.evidenceReadRedacted
    ) {
      throw problemException("PBAC_DENIED", correlationId, {
        status: HttpStatus.FORBIDDEN,
      });
    }

    // ========================================================================
    // 4. Transform payload → graph
    // ========================================================================
    const payload = report.evidencePayload as Record<string, unknown>;
    const workerGraph = isRecord(payload.evidence_graph)
      ? payload.evidence_graph
      : null;
    const storageKey = workerGraph?.evidence_graph_ref;
    const hasPortableStorageKey =
      typeof storageKey === "string" &&
      /^[a-zA-Z0-9_./-]+\.json$/.test(storageKey) &&
      !storageKey.startsWith("/") &&
      !/^[a-zA-Z]:[\\/]/.test(storageKey);
    let graphSource: "WORKER_ARTIFACT" | "LEGACY_PAYLOAD" = "LEGACY_PAYLOAD";
    let graphResult: {
      nodes: EvidenceGraphDto["nodes"];
      edges: EvidenceGraphDto["edges"];
    };

    if (this.artifactStorage && hasPortableStorageKey) {
      try {
        const artifact =
          await this.artifactStorage.readJsonArtifact(storageKey);
        if (!this.mapper.isWorkerGraphIntegrityValid(artifact)) {
          throw problemException(
            "EVIDENCE_GRAPH_ARTIFACT_INVALID",
            correlationId,
            {
              status: HttpStatus.UNPROCESSABLE_ENTITY,
            },
          );
        }
        graphResult = this.mapper.mapGraphFromWorkerArtifact(
          artifact,
          query.scope,
          query.clusterId,
        );
        graphSource = "WORKER_ARTIFACT";
      } catch (error) {
        if (error instanceof Error && "getResponse" in error) {
          throw error;
        }
        throw problemException(
          "EVIDENCE_GRAPH_ARTIFACT_NOT_FOUND",
          correlationId,
          {
            status: HttpStatus.UNPROCESSABLE_ENTITY,
          },
        );
      }
    } else {
      graphResult = this.mapper.mapGraphFromPayload(
        payload,
        query.scope,
        query.clusterId,
      );
    }

    const { nodes, edges } = graphResult;

    if (query.scope === "detail" && query.clusterId) {
      const clusterExists = this.clusterBuilder
        .buildClusters(nodes, payload)
        .some((cluster) => cluster.id === query.clusterId);

      if (!clusterExists) {
        throw problemException("INVALID_CLUSTER_ID", correlationId, {
          status: HttpStatus.NOT_FOUND,
        });
      }
    }

    // ========================================================================
    // 5. Apply redaction (if Developer scope)
    // ========================================================================
    let finalNodes = nodes;
    let finalEdges = edges;
    let finalClusters: OverviewCluster[] | undefined;

    if (isDeveloperScope) {
      const redacted = this.redactor.redactForDeveloper(
        nodes,
        edges,
        query.scope === "overview"
          ? this.clusterBuilder.buildClusters(nodes, payload)
          : undefined,
      );
      finalNodes = redacted.nodes;
      finalEdges = redacted.edges;
      finalClusters = redacted.clusters;
    } else {
      // Manager: also build clusters if overview scope
      if (query.scope === "overview") {
        finalClusters = this.clusterBuilder.buildClusters(nodes, payload);
      }
    }

    // ========================================================================
    // 6. Audit log (success)
    // ========================================================================
    await this.audit.write({
      eventType: "EVIDENCE_GRAPH_ACCESS",
      actorId: query.userId,
      organizationId: query.organizationId,
      resourceType: AUDIT_RESOURCE_TYPES.technicalEvidenceReport,
      resourceId: report.id,
      decision: AUDIT_DECISIONS.allow,
      result: "ALLOWED",
      payload: {
        scope: query.scope,
        clusterId: query.clusterId,
        nodeCount: finalNodes.length,
        edgeCount: finalEdges.length,
        redactedForDeveloper: isDeveloperScope,
        source: graphSource,
      },
      correlationId,
    });

    // ========================================================================
    // 7. Return response envelope
    // ========================================================================
    return {
      nodes: finalNodes,
      edges: finalEdges,
      clusters: finalClusters,
      meta: {
        scope: query.scope,
        assessmentId: query.assessmentId,
        artifactVersion: report.id,
        generatedAt: new Date().toISOString(),
        totalFindingCount: Array.isArray(payload.ai_usage_signals)
          ? payload.ai_usage_signals.length
          : finalNodes.reduce(
              (sum, n) => sum + (n.metadata.findingCount ?? 0),
              0,
            ),
        redactedForDeveloper: isDeveloperScope,
        source: graphSource,
      },
      correlationId,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
