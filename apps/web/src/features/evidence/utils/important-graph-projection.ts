import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
  OverviewCluster,
} from "../types/evidence-graph.types";

export const GRAPH_FLOW_IDS = {
  topology: "topology",
} as const;

export type GraphFlowId = (typeof GRAPH_FLOW_IDS)[keyof typeof GRAPH_FLOW_IDS];

const MAX_TOPOLOGY_NODES = 300;
const MAX_TOPOLOGY_EDGES = 900;
const MAX_HOPS = 6;

const FLOW_NODE_TYPES = new Set([
  "HTTP_ROUTE",
  "EVENT",
  "QUEUE",
  "COMMAND",
  "QUERY",
  "CALL_SITE",
  "FUNCTION",
  "METHOD",
  "AI_MODEL_INVOCATION",
  "AI_PROVIDER",
  "AI_OUTPUT",
  "BRANCH",
  "APPROVAL",
  "REJECTION",
  "HUMAN_REVIEW",
  "BUSINESS_ACTION",
  "STATUS_CHANGE",
  "WORKER",
  "CONSUMER",
]);

const FLOW_EDGE_TYPES = new Set([
  "CALLS",
  "CALLS_API",
  "HANDLED_BY",
  "PUBLISHES_EVENT",
  "CONSUMES_EVENT",
  "PUBLISHES_TO_QUEUE",
  "CONSUMES_FROM_QUEUE",
  "PUBLISHES_COMMAND",
  "HANDLES_COMMAND",
  "PUBLISHES_QUERY",
  "HANDLES_QUERY",
  "TRIGGERS",
  "AFFECTS",
  "SENDS_TO_AI",
  "RECEIVES_FROM_AI",
  "REVIEWED_BY",
  "OVERRIDDEN_BY",
]);

export type ImportantGraphProjection = {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  clusters?: OverviewCluster[];
  totalNodes: number;
  totalEdges: number;
  flow: GraphFlowId;
  truncated: boolean;
  coverage: "SUFFICIENT" | "LIMITED";
  limitations: string[];
};

export function projectImportantGraph(
  nodes: EvidenceGraphNode[],
  edges: EvidenceGraphEdge[],
  clusters: OverviewCluster[] | undefined,
  flow: GraphFlowId = GRAPH_FLOW_IDS.topology,
): ImportantGraphProjection {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const topologyEdges = edges.filter((edge) =>
    FLOW_EDGE_TYPES.has(edge.metadata.semanticType ?? ""),
  );
  const adjacency = buildAdjacency(topologyEdges);
  const entrypoints = nodes.filter((node) => isEntrypoint(node));
  const selectedIds = new Set<string>();
  const frontier = entrypoints.map((node) => ({ id: node.id, hop: 0 }));

  for (const node of entrypoints) selectedIds.add(node.id);
  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current || current.hop >= MAX_HOPS) continue;
    for (const neighbor of adjacency.get(current.id) ?? []) {
      if (selectedIds.has(neighbor)) continue;
      selectedIds.add(neighbor);
      frontier.push({ id: neighbor, hop: current.hop + 1 });
    }
  }

  const selectedNodes = [...selectedIds]
    .map((id) => nodeById.get(id))
    .filter((node): node is EvidenceGraphNode => node !== undefined)
    .sort((left, right) => topologyRank(right) - topologyRank(left))
    .slice(0, MAX_TOPOLOGY_NODES);
  const visibleNodeIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = topologyEdges
    .filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, MAX_TOPOLOGY_EDGES);
  const selectedClusters = clusters?.flatMap((cluster) => {
    const nodeIds = cluster.nodeIds.filter((nodeId) =>
      visibleNodeIds.has(nodeId),
    );
    return nodeIds.length > 0 ? [{ ...cluster, nodeIds }] : [];
  });
  const limitations: string[] = [];
  if (entrypoints.length === 0)
    limitations.push("No semantic flow entrypoint was resolved.");
  if (selectedEdges.length === 0)
    limitations.push("No semantic flow edge was resolved.");
  if (selectedNodes.length < selectedIds.size)
    limitations.push("Topology projection node budget reached.");
  if (selectedEdges.length < topologyEdges.length)
    limitations.push("Topology projection edge budget reached.");

  return {
    nodes: selectedNodes,
    edges: selectedEdges,
    clusters: selectedClusters,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    flow,
    truncated:
      selectedNodes.length < nodes.length ||
      selectedEdges.length < edges.length,
    coverage: limitations.length === 0 ? "SUFFICIENT" : "LIMITED",
    limitations,
  };
}

function buildAdjacency(edges: EvidenceGraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    adjacency.set(edge.source, [
      ...(adjacency.get(edge.source) ?? []),
      edge.target,
    ]);
    adjacency.set(edge.target, [
      ...(adjacency.get(edge.target) ?? []),
      edge.source,
    ]);
  }
  return adjacency;
}

function isEntrypoint(node: EvidenceGraphNode): boolean {
  const semanticType = node.metadata.semanticType ?? "";
  return (
    semanticType === "HTTP_ROUTE" ||
    semanticType === "EVENT" ||
    semanticType === "QUEUE" ||
    semanticType === "AI_MODEL_INVOCATION" ||
    semanticType === "AI_PROVIDER" ||
    semanticType === "WORKER" ||
    semanticType === "CONSUMER" ||
    (FLOW_NODE_TYPES.has(semanticType) &&
      /route|consumer|worker|queue|event/i.test(node.label))
  );
}

function topologyRank(node: EvidenceGraphNode): number {
  const semanticType = node.metadata.semanticType ?? "";
  if (
    semanticType === "HTTP_ROUTE" ||
    semanticType === "QUEUE" ||
    semanticType === "EVENT"
  )
    return 100;
  if (semanticType === "WORKER" || semanticType === "CONSUMER") return 95;
  if (
    semanticType === "FUNCTION" ||
    semanticType === "METHOD" ||
    semanticType === "CALL_SITE"
  )
    return 90;
  if (semanticType === "AI_MODEL_INVOCATION" || semanticType === "AI_PROVIDER")
    return 85;
  if (semanticType === "BRANCH" || semanticType === "HUMAN_REVIEW") return 80;
  return 50;
}
