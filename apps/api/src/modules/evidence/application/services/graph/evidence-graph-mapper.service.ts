/**
 * Evidence Graph Mapper Service
 *
 * Transforms raw TechnicalEvidenceReport.evidencePayload into graph structures:
 * - Nodes (files, functions, AI invocations, decisions, dependencies)
 * - Edges (calls, data flows, decision outputs, human reviews)
 * - Clusters (for overview mode aggregation)
 *
 * Design: Deterministic hashing ensures stable node/edge IDs across re-renders.
 */

import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import type {
  Confidence,
  EvidenceGraphEdge,
  EvidenceGraphNode,
  EvidenceGraphNodeMetadata,
  GraphScope,
  Severity,
} from "../../contracts/evidence/evidence-graph.contract.js";

interface EvidencePayload {
  evidence_graph?: Record<string, unknown>;
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

interface AISignal {
  signal_type?: string;
  provider?: string;
  framework?: string;
  confidence?: string;
  file_path?: string;
  line_number?: number;
  rule_id?: string;
  evidence_ref?: string;
}

interface SBOMEntry {
  name: string;
  version?: string;
  type?: string;
}

@Injectable()
export class EvidenceGraphMapperService {
  mapGraphFromWorkerArtifact(
    graph: Record<string, unknown>,
    scope: GraphScope = "overview",
    clusterId?: string,
  ): {
    nodes: EvidenceGraphNode[];
    edges: EvidenceGraphEdge[];
  } {
    const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];
    const nodes = rawNodes
      .filter((value): value is Record<string, unknown> => isRecord(value))
      .map((node) => this.mapWorkerNode(node))
      .filter((node): node is EvidenceGraphNode => node !== null);
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = rawEdges
      .filter((value): value is Record<string, unknown> => isRecord(value))
      .map((edge) => this.mapWorkerEdge(edge))
      .filter(
        (edge): edge is EvidenceGraphEdge =>
          edge !== null && nodeIds.has(edge.source) && nodeIds.has(edge.target),
      );

    const filteredNodes =
      scope === "detail" && clusterId
        ? nodes.filter((node) => node.cluster === clusterId)
        : nodes;
    const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));

    return {
      nodes: this.sortDeterministically(filteredNodes),
      edges: this.sortEdgesDeterministically(
        edges.filter(
          (edge) =>
            filteredNodeIds.has(edge.source) &&
            filteredNodeIds.has(edge.target),
        ),
      ),
    };
  }

  isWorkerGraphIntegrityValid(graph: Record<string, unknown>): boolean {
    const graphHash = stringValue(graph.graph_hash ?? graph.graphHash);
    if (!graphHash.startsWith("sha256:")) return false;

    const body = {
      schema_version: graph.schema_version ?? graph.schemaVersion,
      snapshot_id: graph.snapshot_id ?? graph.snapshotId,
      commit_sha: graph.commit_sha ?? graph.commitSha,
      nodes: graph.nodes ?? [],
      edges: graph.edges ?? [],
      source_anchors: graph.source_anchors ?? graph.sourceAnchors ?? [],
      indexes: graph.indexes ?? {},
      unresolved_frontiers:
        graph.unresolved_frontiers ?? graph.unresolvedFrontiers ?? [],
      coverage_state: graph.coverage_state ?? graph.coverageState,
      coverage_notes: graph.coverage_notes ?? graph.coverageNotes ?? [],
      provenance: graph.provenance ?? {},
      evidence_refs: graph.evidence_refs ?? graph.evidenceRefs ?? [],
    };

    return `sha256:${this.hashString(canonicalJson(body), 64)}` === graphHash;
  }

  /**
   * Transform evidence payload into graph nodes and edges.
   * Respects scope: overview (cluster-level) or detail (full detail).
   */
  mapGraphFromPayload(
    payload: EvidencePayload,
    scope: GraphScope = "overview",
    clusterId?: string,
  ): {
    nodes: EvidenceGraphNode[];
    edges: EvidenceGraphEdge[];
  } {
    const aiSignals = payload.ai_usage_signals ?? [];
    const sbomEntries = payload.sbom_entries ?? [];

    // Build all node types
    const aiNodes = this.mapAiInvocationNodes(aiSignals);
    const fileNodes = this.mapFileNodes(aiSignals);
    const dependencyNodes = this.mapDependencyNodes(sbomEntries);

    // Combine all nodes
    const allNodes = [...aiNodes, ...fileNodes, ...dependencyNodes];

    // Build edges
    const edges = this.mapEdges(aiSignals, allNodes);

    // Filter by cluster if detail scope
    let filteredNodes = allNodes;
    if (scope === "detail" && clusterId) {
      filteredNodes = allNodes.filter((node) => node.cluster === clusterId);
    }

    const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
    const filteredEdges = edges.filter(
      (edge) =>
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target),
    );

    // Sort deterministically for stable rendering
    const sortedNodes = this.sortDeterministically(filteredNodes);
    const sortedEdges = this.sortEdgesDeterministically(filteredEdges);

    return {
      nodes: sortedNodes,
      edges: sortedEdges,
    };
  }

  /**
   * Map AI usage signals to AI invocation nodes.
   * Each distinct provider invocation becomes one node.
   */
  private mapAiInvocationNodes(signals: AISignal[]): EvidenceGraphNode[] {
    const nodeMap = new Map<string, EvidenceGraphNode>();

    for (const signal of signals) {
      if (signal.signal_type !== "PROVIDER_INVOCATION") continue;

      const provider = signal.provider ?? "UNKNOWN";
      const framework = signal.framework ?? "";
      const label = framework ? `${provider} (${framework})` : provider;

      // Hash unique provider/framework combo
      const hash = this.hashString(provider + framework);
      const nodeId = `node:ai:${hash}`;

      if (!nodeMap.has(nodeId)) {
        const metadata: EvidenceGraphNodeMetadata = {
          provider,
          framework: framework || undefined,
          confidence: this.normalizeConfidence(signal.confidence),
          severity: this.mapConfidenceToSeverity(signal.confidence),
          findingCount: 0,
        };

        nodeMap.set(nodeId, {
          id: nodeId,
          type: "ai_invocation",
          label,
          metadata,
        });
      }

      // Increment finding count
      const node = nodeMap.get(nodeId)!;
      node.metadata.findingCount = (node.metadata.findingCount ?? 0) + 1;
    }

    return Array.from(nodeMap.values());
  }

  /**
   * Map file paths from signals to file nodes.
   * Each unique file becomes one node.
   */
  private mapFileNodes(signals: AISignal[]): EvidenceGraphNode[] {
    const fileMap = new Map<string, EvidenceGraphNode>();

    for (const signal of signals) {
      const filePath = signal.file_path;
      if (!filePath) continue;

      const hash = this.hashString(filePath);
      const nodeId = `node:file:${hash}`;

      if (!fileMap.has(nodeId)) {
        const fileLabel = this.extractFileName(filePath);

        // Cluster reference: extract directory
        const directory = this.extractDirectory(filePath);
        const clusterId = directory
          ? `cluster:${this.hashString(directory)}`
          : undefined;

        const metadata: EvidenceGraphNodeMetadata = {
          filePath,
          lineNumber: signal.line_number ?? undefined,
          severity: this.mapConfidenceToSeverity(signal.confidence),
          findingCount: 0,
        };

        fileMap.set(nodeId, {
          id: nodeId,
          type: "file",
          label: fileLabel,
          metadata,
          cluster: clusterId,
        });
      }

      // Increment finding count
      const node = fileMap.get(nodeId)!;
      node.metadata.findingCount = (node.metadata.findingCount ?? 0) + 1;
    }

    return Array.from(fileMap.values());
  }

  /**
   * Map SBOM entries to dependency nodes.
   * Each package becomes one node.
   */
  private mapDependencyNodes(entries: SBOMEntry[]): EvidenceGraphNode[] {
    const nodeMap = new Map<string, EvidenceGraphNode>();

    for (const entry of entries) {
      const { name, version } = entry;
      const label = version ? `${name}@${version}` : name;

      const hash = this.hashString(name + (version ?? ""));
      const nodeId = `node:dep:${hash}`;

      if (!nodeMap.has(nodeId)) {
        const metadata: EvidenceGraphNodeMetadata = {
          packageName: name,
        };

        nodeMap.set(nodeId, {
          id: nodeId,
          type: "dependency",
          label,
          metadata,
        });
      }
    }

    return Array.from(nodeMap.values());
  }

  /**
   * Infer edges from signal sequence.
   * Main patterns:
   * - AI invocation → file (invocation targets file)
   * - file → file (data flow between files)
   * - AI invocation → decision (output used in decision)
   */
  private mapEdges(
    signals: AISignal[],
    nodes: EvidenceGraphNode[],
  ): EvidenceGraphEdge[] {
    const edges: EvidenceGraphEdge[] = [];
    const edgeSet = new Set<string>();

    for (let i = 0; i < signals.length; i++) {
      const current = signals[i];
      const next = i + 1 < signals.length ? signals[i + 1] : null;

      // Current signal: AI invocation
      if (current.signal_type === "PROVIDER_INVOCATION" && current.provider) {
        // AI invocation → file (if current targets a file)
        if (current.file_path) {
          const sourceId = `node:ai:${this.hashString(current.provider + (current.framework ?? ""))}`;
          const targetId = `node:file:${this.hashString(current.file_path)}`;

          if (
            this.nodeExists(sourceId, nodes) &&
            this.nodeExists(targetId, nodes)
          ) {
            const edgeKey = `${sourceId}→${targetId}:invocation`;
            if (!edgeSet.has(edgeKey)) {
              edges.push({
                id: `edge:${this.hashString(edgeKey)}`,
                source: sourceId,
                target: targetId,
                type: "call",
                metadata: {
                  severity: this.mapConfidenceToSeverity(current.confidence),
                },
              });
              edgeSet.add(edgeKey);
            }
          }
        }

        // AI invocation → next signal (output to next)
        if (
          next &&
          next.signal_type === "PROVIDER_INVOCATION" &&
          next.provider
        ) {
          const sourceId = `node:ai:${this.hashString(current.provider + (current.framework ?? ""))}`;
          const targetId = `node:ai:${this.hashString(next.provider + (next.framework ?? ""))}`;

          if (
            this.nodeExists(sourceId, nodes) &&
            this.nodeExists(targetId, nodes)
          ) {
            const edgeKey = `${sourceId}→${targetId}:output`;
            if (!edgeSet.has(edgeKey)) {
              edges.push({
                id: `edge:${this.hashString(edgeKey)}`,
                source: sourceId,
                target: targetId,
                type: "output_to_decision",
                metadata: {
                  requiresReview: true, // Assume decision point needs review
                },
              });
              edgeSet.add(edgeKey);
            }
          }
        }
      }
    }

    return edges;
  }

  /**
   * Normalize confidence string to typed Confidence.
   */
  private normalizeConfidence(confidence?: string): Confidence | undefined {
    if (!confidence) return undefined;
    const upper = confidence.toUpperCase();
    if (["LOW", "MEDIUM", "HIGH"].includes(upper)) {
      return upper as Confidence;
    }
    return undefined;
  }

  /**
   * Map confidence level to severity.
   * HIGH confidence → MEDIUM severity
   * MEDIUM confidence → LOW severity
   * LOW confidence → LOW severity
   */
  private mapConfidenceToSeverity(confidence?: string): Severity {
    const normalized = this.normalizeConfidence(confidence);
    if (normalized === "HIGH") return "MEDIUM";
    if (normalized === "MEDIUM") return "LOW";
    return "LOW";
  }

  /**
   * Extract filename from path.
   * e.g., "/src/auth/login.ts" → "login.ts"
   */
  private extractFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
  }

  /**
   * Extract directory from path.
   * e.g., "/src/auth/login.ts" → "/src/auth"
   */
  private extractDirectory(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    parts.pop(); // Remove filename
    return parts.join("/");
  }

  /**
   * Check if node exists in list by ID.
   */
  private nodeExists(nodeId: string, nodes: EvidenceGraphNode[]): boolean {
    return nodes.some((n) => n.id === nodeId);
  }

  /**
   * Sort nodes deterministically by ID for stable rendering.
   */
  private sortDeterministically(
    nodes: EvidenceGraphNode[],
  ): EvidenceGraphNode[] {
    return nodes.slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Sort edges deterministically by ID.
   */
  private sortEdgesDeterministically(
    edges: EvidenceGraphEdge[],
  ): EvidenceGraphEdge[] {
    return edges.slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Hash string to deterministic short hex.
   * Uses SHA-256 prefix (first 12 chars).
   */
  private hashString(input: string, length = 12): string {
    return createHash("sha256")
      .update(input)
      .digest("hex")
      .substring(0, length);
  }

  private mapWorkerNode(
    raw: Record<string, unknown>,
  ): EvidenceGraphNode | null {
    const nodeId = stringValue(raw.node_id ?? raw.nodeId);
    if (!nodeId) return null;
    const nodeType = stringValue(raw.node_type ?? raw.nodeType);
    const type = mapWorkerNodeType(nodeType);
    const source = isRecord(raw.source) ? raw.source : {};
    const filePath = stringValue(source.file_path ?? source.filePath);
    const attributes = isRecord(raw.attributes) ? raw.attributes : {};
    const provider = stringValue(attributes.provider);

    return {
      id: nodeId,
      type,
      label: stringValue(raw.label) || nodeId,
      metadata: {
        semanticType: nodeType || undefined,
        filePath: filePath || undefined,
        lineNumber: numberValue(source.start_line ?? source.startLine),
        provider: provider || undefined,
        findingCount: Array.isArray(raw.evidence_refs)
          ? raw.evidence_refs.length
          : 0,
      },
      cluster: filePath
        ? `cluster:${this.hashString(this.extractDirectory(filePath))}`
        : undefined,
    };
  }

  private mapWorkerEdge(
    raw: Record<string, unknown>,
  ): EvidenceGraphEdge | null {
    const id = stringValue(raw.edge_id ?? raw.edgeId);
    const source = stringValue(raw.source_node_id ?? raw.sourceNodeId);
    const target = stringValue(raw.target_node_id ?? raw.targetNodeId);
    if (!id || !source || !target) return null;
    return {
      id,
      source,
      target,
      type: mapWorkerEdgeType(stringValue(raw.edge_type ?? raw.edgeType)),
      metadata: {
        semanticType: stringValue(raw.edge_type ?? raw.edgeType) || undefined,
        requiresReview: false,
      },
    };
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function mapWorkerNodeType(value: string): EvidenceGraphNode["type"] {
  if (["FILE", "MODULE"].includes(value)) return "file";
  if (["FUNCTION", "METHOD", "CLASS"].includes(value)) return "function";
  if (["AI_MODEL_INVOCATION", "AI_PROVIDER"].includes(value)) {
    return "ai_invocation";
  }
  if (["BRANCH", "APPROVAL", "REJECTION", "BUSINESS_ACTION"].includes(value)) {
    return "decision";
  }
  return "dependency";
}

function mapWorkerEdgeType(value: string): EvidenceGraphEdge["type"] {
  if (["CALLS", "CALLS_EXTERNAL", "CALLS_DYNAMICALLY"].includes(value)) {
    return "call";
  }
  if (
    ["BRANCHES_ON", "TRIGGERS", "APPROVES", "REJECTS", "AFFECTS"].includes(
      value,
    )
  ) {
    return "output_to_decision";
  }
  if (["REVIEWED_BY", "OVERRIDDEN_BY"].includes(value)) {
    return "human_review";
  }
  if (["DEPENDS_ON", "IMPORTS"].includes(value)) return "dependency";
  return "data_flow";
}
