/**
 * Cluster Builder Service
 *
 * Aggregates nodes into file/module clusters for overview mode visualization.
 * Computes cluster-level metadata:
 * - Total finding count
 * - Severity distribution (HIGH/MEDIUM/LOW breakdown)
 * - List of node IDs in cluster
 */

import { Injectable } from "@nestjs/common";
import type {
  EvidenceGraphNode,
  OverviewCluster,
} from "../../contracts/evidence/evidence-graph.contract.js";

interface EvidencePayload {
  schema_version?: string;
  tools_version?: Record<string, string>;
  config_hash?: Record<string, string>;
  ai_usage_signals?: Array<{
    signal_type?: string;
    provider?: string;
    framework?: string;
    confidence?: string;
    file_path?: string;
    line_number?: number;
    rule_id?: string;
    evidence_ref?: string;
  }>;
  sbom_entries?: Array<{
    name: string;
    version?: string;
    type?: string;
  }>;
  tool_failures?: Array<{
    tool: string;
    error_code: string;
    message: string;
  }>;
  coverage_notes?: string[];
  privacy_flags?: {
    contains_source_code: boolean;
    secrets_redacted: boolean;
  };
}

interface ClusterData {
  id: string;
  type: "file" | "module";
  label: string;
  filePath: string;
  nodeIds: Set<string>;
  severityCount: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  findingCount: number;
}

@Injectable()
export class ClusterBuilderService {
  /**
   * Build clusters from nodes and payload.
   * Groups nodes by file/module path.
   * Computes severity distribution and node lists.
   */
  buildClusters(
    nodes: EvidenceGraphNode[],
    payload: EvidencePayload,
  ): OverviewCluster[] {
    void payload;
    const clusterMap = new Map<string, ClusterData>();

    // Process each node to assign to cluster
    for (const node of nodes) {
      if (!node.cluster) {
        // Nodes without cluster (e.g., dependency nodes) are skipped in overview
        continue;
      }

      let clusterData = clusterMap.get(node.cluster);
      if (!clusterData) {
        // Extract file path from node metadata
        const filePath = node.metadata.filePath || "unknown";
        const label = this.extractClusterLabel(filePath);

        clusterData = {
          id: node.cluster,
          type: this.inferClusterType(filePath),
          label,
          filePath,
          nodeIds: new Set(),
          severityCount: {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
          },
          findingCount: 0,
        };
        clusterMap.set(node.cluster, clusterData);
      }

      // Add node to cluster
      clusterData.nodeIds.add(node.id);
      clusterData.findingCount += node.metadata.findingCount ?? 1;

      // Increment severity count
      if (node.metadata.severity) {
        clusterData.severityCount[node.metadata.severity]++;
      }
    }

    // Convert map to array and sort deterministically
    const clusters = Array.from(clusterMap.values()).map(
      (cd): OverviewCluster => {
        return {
          id: cd.id,
          type: cd.type,
          label: cd.label,
          findingCount: cd.findingCount,
          severityDistribution: {
            HIGH: cd.severityCount.HIGH,
            MEDIUM: cd.severityCount.MEDIUM,
            LOW: cd.severityCount.LOW,
          },
          nodeIds: Array.from(cd.nodeIds),
          metadata: {
            filePath: cd.filePath,
          },
        };
      },
    );

    // Sort deterministically
    return clusters.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Extract user-friendly cluster label from file path.
   * e.g., "/src/auth" → "auth", "/lib/utils/helpers.ts" → "helpers.ts"
   */
  private extractClusterLabel(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    // Prefer directory name if it exists
    if (parts.length > 1) {
      return parts[parts.length - 2];
    }
    // Fallback to filename
    return parts[parts.length - 1] || "root";
  }

  /**
   * Infer cluster type from file path.
   * Usually "file" (individual file), occasionally "module" (directory).
   */
  private inferClusterType(filePath: string): "file" | "module" {
    // Simple heuristic: if path ends in .ts/.js, it's a file cluster
    // Otherwise, treat as module (directory)
    if (filePath.match(/\.(ts|js|tsx|jsx)$/i)) {
      return "file";
    }
    return "module";
  }
}
