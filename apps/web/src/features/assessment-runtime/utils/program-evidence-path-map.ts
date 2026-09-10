import type { ProgramEvidenceGraphDetail } from "@/lib/api/evidence-graph-detail-client";

type Node = ProgramEvidenceGraphDetail["paths"]["nodes"][number];
type Edge = ProgramEvidenceGraphDetail["paths"]["edges"][number];
export type EvidenceTopology = {
  nodes: Node[];
  edges: Edge[];
  positions: Map<string, { x: number; y: number }>;
};

export type ViewportState = { zoom: number; pan: { x: number; y: number } };

export function zoomAtPoint(
  state: ViewportState,
  point: { x: number; y: number },
  requestedZoom: number,
  bounds = { min: 0.45, max: 3.5 },
): ViewportState {
  const nextZoom = Math.min(bounds.max, Math.max(bounds.min, requestedZoom));
  const sceneX = (point.x - state.pan.x) / state.zoom;
  const sceneY = (point.y - state.pan.y) / state.zoom;
  return {
    zoom: nextZoom,
    pan: {
      x: point.x - sceneX * nextZoom,
      y: point.y - sceneY * nextZoom,
    },
  };
}
const PRIORITY_KINDS = [
  "HTTP_ROUTE",
  "ENTRYPOINT",
  "FUNCTION",
  "METHOD",
  "CALL_SITE",
  "BUSINESS_ACTION",
  "AI_MODEL_INVOCATION",
  "AI_INPUT",
  "AI_OUTPUT",
  "AI_PROVIDER",
  "AGENT_BOUNDARY_SOURCE",
  "EXTERNAL_SERVICE",
];

export function selectEvidenceTopology(
  nodes: Node[],
  edges: Edge[],
): EvidenceTopology {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const validEdges = edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );
  // The API already provides the bounded, customer-safe projection. Preserve
  // that topology intact; viewport navigation handles dense graphs.
  const projectedNodes = [...nodes].sort(compareNodes);
  const ids = new Set(projectedNodes.map((node) => node.id));
  const projectedEdges = validEdges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .sort((a, b) => a.id.localeCompare(b.id));
  // Pack the bounded scene into a stable 2D grid. This avoids a narrow
  // rank tower while leaving the canonical directed edges untouched.
  const columns = Math.max(
    4,
    Math.ceil(Math.sqrt(projectedNodes.length / 1.5)),
  );
  const positions = new Map<string, { x: number; y: number }>();
  projectedNodes.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions.set(node.id, { x: 90 + column * 230, y: 70 + row * 105 });
  });
  return { nodes: projectedNodes, edges: projectedEdges, positions };
}

function priority(kind: string) {
  const index = PRIORITY_KINDS.indexOf(kind.toUpperCase());
  return index === -1 ? PRIORITY_KINDS.length : index;
}
function compareNodes(a: Node, b: Node) {
  return priority(a.kind) - priority(b.kind) || a.id.localeCompare(b.id);
}
