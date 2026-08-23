import { QueryHandler } from "@nestjs/cqrs";
import type { IQueryHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetSystemGraphQuery } from "./get-system-graph.query.js";
import type { SystemGraphDto, GraphNodeDto, GraphEdgeDto } from "@lcsp/contracts/evidence";
import type { GraphSource, GraphNodeType, GraphEdgeType } from "@lcsp/contracts/evidence";
import { fromPrismaReconciliationStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";

@QueryHandler(GetSystemGraphQuery)
export class GetSystemGraphHandler implements IQueryHandler<GetSystemGraphQuery, SystemGraphDto> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetSystemGraphQuery): Promise<SystemGraphDto> {
    const { assessmentId } = query;

    // Fetch all nodes
    const nodes = await this.prisma.evidenceGraphNode.findMany({
      where: { assessmentId }
    });

    // Fetch all edges
    const edges = await this.prisma.evidenceGraphEdge.findMany({
      where: { assessmentId }
    });

    // Fetch reconciliation results to decorate the graph
    const reconciliations = await this.prisma.graphReconciliationResult.findMany({
      where: { assessmentId }
    });

    // Create a map to quickly look up reconciliation status by Node ID
    // We map both declaredNodeId and observedNodeId to the status
    const reconciliationMap = new Map<string, { status: any, partnerId?: string }>();
    
    for (const r of reconciliations) {
      const status = fromPrismaReconciliationStatus(r.status);
      
      if (r.declaredNodeId) {
        reconciliationMap.set(r.declaredNodeId, { status, partnerId: r.observedNodeId || undefined });
      }
      if (r.observedNodeId) {
        reconciliationMap.set(r.observedNodeId, { status, partnerId: r.declaredNodeId || undefined });
      }
    }

    const nodeDtos: GraphNodeDto[] = nodes.map((node) => {
      const rec = reconciliationMap.get(node.id);
      return {
        id: node.id,
        assessmentId: node.assessmentId,
        canonicalName: node.canonicalName,
        type: node.type as GraphNodeType,
        source: node.source as GraphSource,
        properties: (node.properties as Record<string, unknown>) || {},
        reconciliationStatus: rec?.status,
        reconciledWithNodeId: rec?.partnerId,
      };
    });

    const edgeDtos: GraphEdgeDto[] = edges.map((edge) => ({
      id: edge.id,
      assessmentId: edge.assessmentId,
      sourceNodeId: edge.sourceId,
      targetNodeId: edge.targetId,
      type: edge.type as GraphEdgeType,
      source: edge.sourceType as GraphSource,
      properties: (edge.properties as Record<string, unknown>) || {},
    }));

    return {
      nodes: nodeDtos,
      edges: edgeDtos,
    };
  }
}
