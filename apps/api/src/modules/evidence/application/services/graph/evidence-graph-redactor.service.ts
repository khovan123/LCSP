/**
 * Evidence Graph Redactor Service
 *
 * Handles privacy redaction for Developer scope.
 * Removes/nullifies sensitive metadata:
 * - File paths (set to null)
 * - Line numbers (set to null)
 *
 * Manager scope passes through unchanged.
 */

import { Injectable } from "@nestjs/common";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
  OverviewCluster,
} from "../../contracts/evidence/evidence-graph.contract.js";

@Injectable()
export class EvidenceGraphRedactorService {
  /**
   * Redact sensitive metadata for Developer scope.
   * Returns new arrays (non-mutating).
   */
  redactForDeveloper(
    nodes: EvidenceGraphNode[],
    edges: EvidenceGraphEdge[],
    clusters?: OverviewCluster[],
  ): {
    nodes: EvidenceGraphNode[];
    edges: EvidenceGraphEdge[];
    clusters?: OverviewCluster[];
  } {
    const redactedNodes = nodes.map((node) => ({
      ...node,
      metadata: {
        ...node.metadata,
        filePath: null, // Redact file path
        lineNumber: null, // Redact line number
      },
    }));

    // Edges don't contain sensitive metadata in typical case
    // but keep them for safety
    const redactedEdges = edges.map((edge) => ({
      ...edge,
      metadata: {
        ...edge.metadata,
      },
    }));

    // Redact cluster paths
    const redactedClusters = clusters?.map((cluster) => ({
      ...cluster,
      metadata: {
        ...cluster.metadata,
        filePath: null, // Redact cluster file path
      },
    }));

    return {
      nodes: redactedNodes,
      edges: redactedEdges,
      clusters: redactedClusters,
    };
  }

  /**
   * Check if metadata is already redacted (safe for inclusion).
   * Used for validation/auditing.
   */
  isRedacted(node: EvidenceGraphNode): boolean {
    if (node.type !== "file") return true;

    return node.metadata.filePath === null && node.metadata.lineNumber === null;
  }
}
