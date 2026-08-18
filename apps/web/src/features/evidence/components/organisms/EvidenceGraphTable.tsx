/**
 * Evidence Graph Table View Organism
 *
 * Tabular view of evidence graph nodes and edges.
 * Useful for data exploration, filtering, and detailed inspection.
 */

"use client";

import { EvidenceBadge } from "@/features/evidence/components/atoms/EvidenceBadge";
import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
} from "@/features/evidence/types/evidence-graph.types";
import React, { useMemo } from "react";

export interface EvidenceGraphTableProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  className?: string;
}

/**
 * Get user-friendly node type label.
 */
function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    file: "Source File",
    function: "Function",
    ai_invocation: "AI Invocation",
    decision: "Decision Point",
    dependency: "External Dependency",
  };
  return labels[type] || type;
}

/**
 * Get user-friendly edge type label.
 */
function getEdgeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    call: "Function Call",
    data_flow: "Data Flow",
    output_to_decision: "Output to Decision",
    human_review: "Human Review",
    dependency: "Dependency Link",
  };
  return labels[type] || type;
}

/**
 * Table view of graph nodes and edges.
 */
export function EvidenceGraphTable({
  nodes,
  edges,
  className = "",
}: EvidenceGraphTableProps) {
  const { state, selectNode } = useGraphUI();
  const [activeTab, setActiveTab] = React.useState<"nodes" | "edges">("nodes");

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-lg border border-gray-200 ${className}`}
    >
      {/* Tab Navigation */}
      <div className="flex gap-0 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("nodes")}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
            activeTab === "nodes"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Nodes ({nodes.length})
        </button>
        <button
          onClick={() => setActiveTab("edges")}
          className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
            activeTab === "edges"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Edges ({edges.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "nodes" ? (
          <NodesTable
            nodes={nodes}
            selectedNodeId={state.nodes.selectedNodeId}
            onSelectNode={selectNode}
          />
        ) : (
          <EdgesTable edges={edges} nodes={nodes} />
        )}
      </div>
    </div>
  );
}

/**
 * Nodes table component.
 */
function NodesTable({
  nodes,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: EvidenceGraphNode[];
  selectedNodeId?: string | null;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Label
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Type
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Severity
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Findings
          </th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => (
          <tr
            key={node.id}
            onClick={() => onSelectNode(node.id)}
            className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
              selectedNodeId === node.id ? "bg-blue-100" : ""
            }`}
          >
            <td className="px-4 py-3 font-mono text-xs text-gray-900 max-w-xs truncate">
              {node.label}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {getNodeTypeLabel(node.type)}
            </td>
            <td className="px-4 py-3">
              {node.metadata.severity ? (
                <EvidenceBadge
                  type="severity"
                  value={node.metadata.severity}
                  size="sm"
                />
              ) : (
                <span className="text-gray-500 text-xs">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-700">
              {node.metadata.findingCount ? (
                <span className="font-medium text-orange-600">
                  {node.metadata.findingCount}
                </span>
              ) : (
                <span className="text-gray-500">0</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Edges table component.
 */
function EdgesTable({
  edges,
  nodes,
}: {
  edges: EvidenceGraphEdge[];
  nodes: EvidenceGraphNode[];
}) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Source
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Type
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Target
          </th>
          <th className="px-4 py-3 text-left font-medium text-gray-700">
            Severity
          </th>
        </tr>
      </thead>
      <tbody>
        {edges.map((edge) => {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);

          return (
            <tr
              key={edge.id}
              className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-900 max-w-xs truncate">
                {sourceNode?.label || edge.source}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {getEdgeTypeLabel(edge.type)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-900 max-w-xs truncate">
                {targetNode?.label || edge.target}
              </td>
              <td className="px-4 py-3">
                {edge.metadata.severity ? (
                  <EvidenceBadge
                    type="severity"
                    value={edge.metadata.severity}
                    size="sm"
                  />
                ) : (
                  <span className="text-gray-500 text-xs">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
