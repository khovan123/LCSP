/**
 * Evidence Graph Frontend Types
 *
 * Mirrors backend contract types from:
 * apps/api/src/modules/evidence/application/contracts/evidence/evidence-graph.contract.ts
 *
 * Used for type safety across API requests and frontend state management.
 */

// ============================================================================
// Type Aliases
// ============================================================================

export type GraphNodeType =
  "file" | "function" | "ai_invocation" | "decision" | "dependency";

export type GraphEdgeType =
  "call" | "data_flow" | "output_to_decision" | "human_review" | "dependency";

export type GraphScope = "overview" | "detail";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type GraphUserRole = "MANAGER" | "DEVELOPER";

// ============================================================================
// Node & Edge Metadata
// ============================================================================

/**
 * Metadata attached to graph nodes.
 * For Developer scope, filePath and lineNumber are redacted (set to null).
 */
export interface EvidenceGraphNodeMetadata {
  filePath?: string | null; // Relative path; null if redacted
  lineNumber?: number | null; // Null if redacted
  provider?: string; // AI provider ("OPENAI", "GOOGLE", etc.)
  framework?: string; // AI framework ("OPENAI_SDK", etc.)
  confidence?: Confidence; // Confidence level of detection
  severity?: Severity; // Aggregated finding severity
  findingCount?: number; // Number of findings linked to node
  packageName?: string; // For dependency nodes
}

/**
 * Node in the evidence graph.
 * Represents a distinct entity: file, function, AI invocation, decision point, or dependency.
 */
export interface EvidenceGraphNode {
  id: string; // Deterministic hash (SHA-256 prefix)
  type: GraphNodeType; // Node category
  label: string; // Display name (filename, function name, provider, etc.)
  metadata: EvidenceGraphNodeMetadata;
  cluster?: string; // Cluster ref (optional, for detail view)
}

/**
 * Metadata attached to graph edges.
 */
export interface EvidenceGraphEdgeMetadata {
  severity?: Severity; // Edge-level severity (if applicable)
  requiresReview?: boolean; // True if no human review evidence found
  label?: string; // Display label (optional)
}

/**
 * Edge in the evidence graph.
 * Represents a relationship: call, data flow, decision output, etc.
 */
export interface EvidenceGraphEdge {
  id: string; // Deterministic hash (SHA-256 prefix)
  source: string; // Source node ID
  target: string; // Target node ID
  type: GraphEdgeType; // Relationship type
  metadata: EvidenceGraphEdgeMetadata;
}

// ============================================================================
// Cluster (for Overview Mode)
// ============================================================================

/**
 * Cluster metadata (for overview mode visualization).
 * Groups nodes at file/module level.
 */
export interface OverviewClusterMetadata {
  filePath?: string | null; // Module path; null if redacted
}

/**
 * Cluster containing grouped nodes (file/module level).
 * Used in overview mode for high-level graph representation.
 */
export interface OverviewCluster {
  id: string; // Cluster hash
  type: "file" | "module"; // Cluster type
  label: string; // Module/file name
  findingCount: number; // Total findings in cluster
  severityDistribution: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  nodeIds: string[]; // Node IDs within this cluster
  metadata: OverviewClusterMetadata;
}

// ============================================================================
// API Response
// ============================================================================

/**
 * Metadata about the graph response.
 */
export interface EvidenceGraphResponseMeta {
  scope: GraphScope; // "overview" or "detail"
  assessmentId: string; // Assessment this graph is for
  artifactVersion: string; // TechnicalEvidenceReport.id
  generatedAt: string; // ISO 8601 timestamp
  totalFindingCount: number; // Total findings analyzed
  redactedForDeveloper: boolean; // Whether paths/metadata redacted
  source?: "WORKER_ARTIFACT" | "LEGACY_PAYLOAD";
}

/**
 * Complete evidence graph response.
 * Returned by GET /assessments/:assessmentId/evidence-graph
 */
export interface EvidenceGraphDto {
  nodes: EvidenceGraphNode[]; // All nodes in graph
  edges: EvidenceGraphEdge[]; // All edges in graph
  clusters?: OverviewCluster[]; // Clusters (only if scope=overview)
  meta: EvidenceGraphResponseMeta;
  correlationId: string; // For request tracing
}

// ============================================================================
// API Response Problem
// ============================================================================

/**
 * Problem details structure for error responses.
 */
export interface GraphErrorProblem {
  type:
    | "INVALID_ARGUMENT"
    | "PBAC_DENIED"
    | "EVIDENCE_NOT_FOUND"
    | "INVALID_CLUSTER_ID";
  status: number;
  code: string;
  titleKey: string;
  detailKey: string;
}

/**
 * Full API envelope for error responses.
 */
export interface GraphApiErrorResponse {
  ok: false;
  problem: GraphErrorProblem;
}

/**
 * Full API envelope for success responses.
 */
export interface GraphApiSuccessResponse {
  ok: true;
  data: EvidenceGraphDto;
}

/**
 * Complete API response envelope (success or error).
 */
export type GraphApiResponse = GraphApiSuccessResponse | GraphApiErrorResponse;
