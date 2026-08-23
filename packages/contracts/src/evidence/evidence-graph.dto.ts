import type { GraphEdgeType, GraphNodeType, GraphSource, ReconciliationStatus } from "./evidence-graph.constants.ts";

// Basic entity DTOs
export interface GraphNodeDto {
  id: string;
  assessmentId: string;
  canonicalName: string;
  type: GraphNodeType;
  source: GraphSource;
  properties: Record<string, unknown>;
  reconciliationStatus?: ReconciliationStatus;
  reconciledWithNodeId?: string;
}

export interface GraphEdgeDto {
  id: string;
  assessmentId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: GraphEdgeType;
  source: GraphSource;
  properties: Record<string, unknown>;
}

export interface SystemGraphDto {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
}
