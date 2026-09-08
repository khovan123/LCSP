import type { ProgramEvidenceGraphDetail } from "@/lib/api/evidence-graph-detail-client";

type Node = ProgramEvidenceGraphDetail["paths"]["nodes"][number];
type Edge = ProgramEvidenceGraphDetail["paths"]["edges"][number];
export type EvidencePathGroup = { nodes: Node[]; edges: Edge[] };
const PRIORITY_KINDS = ["HTTP_ROUTE", "FUNCTION", "METHOD", "CALL_SITE", "BUSINESS_ACTION", "AI_MODEL_INVOCATION", "AI_INPUT", "AI_OUTPUT", "AI_PROVIDER", "AGENT_BOUNDARY_SOURCE", "EXTERNAL_SERVICE"];
const MAX_PATHS = 3;
const MAX_NODES_PER_PATH = 5;

export function selectEvidencePaths(nodes: Node[], edges: Edge[], maxPaths = MAX_PATHS, maxNodesPerPath = MAX_NODES_PER_PATH): EvidencePathGroup[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const validEdges = edges.filter((edge) => byId.has(edge.source) && byId.has(edge.target));
  const ranked = [...nodes].sort((a, b) => priority(a.kind) - priority(b.kind) || a.id.localeCompare(b.id));
  const groups: EvidencePathGroup[] = [];
  const used = new Set<string>();
  for (const seed of ranked) {
    if (groups.length >= maxPaths || used.has(seed.id)) continue;
    const pathNodes = [seed]; const pathEdges: Edge[] = []; let current = seed.id;
    while (pathNodes.length < maxNodesPerPath) {
      const next = validEdges.filter((edge) => edge.source === current || edge.target === current).map((edge) => ({ edge, id: edge.source === current ? edge.target : edge.source })).filter(({ id }) => !pathNodes.some((node) => node.id === id)).sort((a, b) => priority(byId.get(a.id)?.kind ?? "") - priority(byId.get(b.id)?.kind ?? "") || a.id.localeCompare(b.id))[0];
      if (!next) break;
      pathEdges.push(next.edge); pathNodes.push(byId.get(next.id)!); current = next.id;
    }
    if (pathEdges.length > 0) { pathNodes.forEach((node) => used.add(node.id)); groups.push({ nodes: pathNodes, edges: pathEdges }); }
  }
  return groups;
}

export function selectEvidencePathNodes(nodes: Node[], edges: Edge[], limit = 12): Node[] {
  const selected = selectEvidencePaths(nodes, edges, MAX_PATHS, limit).flatMap((group) => group.nodes).slice(0, limit);
  return selected.length > 0 ? selected : [...nodes].sort((a, b) => priority(a.kind) - priority(b.kind) || a.id.localeCompare(b.id)).slice(0, limit);
}

function priority(kind: string) { const index = PRIORITY_KINDS.indexOf(kind.toUpperCase()); return index === -1 ? PRIORITY_KINDS.length : index; }
