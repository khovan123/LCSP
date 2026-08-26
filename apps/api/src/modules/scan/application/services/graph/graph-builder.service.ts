import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { EvidenceNormalizerService } from "./evidence-normalizer.service.js";
import {
  GraphSource,
  GraphNodeType,
  GraphEdgeType,
  EvidenceType,
  Prisma,
} from "@prisma/client";

@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: EvidenceNormalizerService,
  ) {}

  async buildAndPersist(
    assessmentId: string,
    snapshotId: string | null,
    repoSubgraph: any,
  ) {
    if (!repoSubgraph || !Array.isArray(repoSubgraph.nodes)) {
      this.logger.debug("No subgraph found in payload");
      return;
    }

    this.logger.log(`Building graph for assessment ${assessmentId}`);
    const source = GraphSource.OBSERVED;

    const { nodes, edges } = repoSubgraph;

    await this.prisma.$transaction(async (tx) => {
      const nodeMap = new Map<string, string>(); // Worker UUID -> DB UUID

      for (const rawNode of nodes) {
        const node = this.normalizer.normalizeNode(rawNode);

        // Ensure node properties exist
        const nodeType = (node.type || "SERVICE") as GraphNodeType;
        const canonicalName = node.canonicalName || "unknown";

        const existing = await tx.evidenceGraphNode.findFirst({
          where: {
            assessmentId,
            canonicalName,
            type: nodeType,
            source,
          },
        });

        let dbNodeId = existing?.id;

        if (existing) {
          nodeMap.set(node.id, existing.id);
        } else {
          const created = await tx.evidenceGraphNode.create({
            data: {
              assessmentId,
              snapshotId,
              source,
              type: nodeType,
              canonicalName,
              properties: (node.properties || {}) as Prisma.InputJsonValue,
            },
          });
          dbNodeId = created.id;
          nodeMap.set(node.id, created.id);
        }

        for (const ev of node.evidences || []) {
          await tx.integrationEvidence.create({
            data: {
              nodeId: dbNodeId,
              evidenceType: (ev.evidenceType || "RUNTIME") as EvidenceType,
              extractor: ev.extractor || "SCANNER",
              repositoryId: ev.repositoryId,
              commitSha: ev.commitSha,
              filePath: ev.filePath,
              lineStart: ev.lineStart,
              lineEnd: ev.lineEnd,
              hash: ev.hash,
              rawValue: ev.rawValue,
            },
          });
        }
      }

      if (Array.isArray(edges)) {
        for (const edge of edges) {
          const sourceId = nodeMap.get(edge.sourceId);
          const targetId = nodeMap.get(edge.targetId);

          if (!sourceId || !targetId) {
            continue; // Missing nodes, skip edge
          }

          const edgeType = (edge.type || "CALLS") as GraphEdgeType;

          const existingEdge = await tx.evidenceGraphEdge.findFirst({
            where: {
              assessmentId,
              sourceId,
              targetId,
              type: edgeType,
              sourceType: source,
            },
          });

          let edgeId = existingEdge?.id;

          if (!existingEdge) {
            const createdEdge = await tx.evidenceGraphEdge.create({
              data: {
                assessmentId,
                sourceId,
                targetId,
                sourceType: source,
                type: edgeType,
                confidence:
                  typeof edge.confidence === "number" ? edge.confidence : 1.0,
                properties: (edge.properties || {}) as Prisma.InputJsonValue,
              },
            });
            edgeId = createdEdge.id;
          }

          for (const ev of edge.evidences || []) {
            await tx.integrationEvidence.create({
              data: {
                edgeId,
                evidenceType: (ev.evidenceType || "RUNTIME") as EvidenceType,
                extractor: ev.extractor || "SCANNER",
                repositoryId: ev.repositoryId,
                commitSha: ev.commitSha,
                filePath: ev.filePath,
                lineStart: ev.lineStart,
                lineEnd: ev.lineEnd,
                hash: ev.hash,
                rawValue: ev.rawValue,
              },
            });
          }
        }
      }
    });

    this.logger.log(`Successfully built graph for assessment ${assessmentId}`);
  }
}
