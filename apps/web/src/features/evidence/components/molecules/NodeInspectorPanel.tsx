/**
 * Node Inspector Panel Molecule
 *
 * Side panel displaying detailed information about a selected graph node.
 * Shows metadata, severity, findings, and relationships.
 */

"use client";

import { EvidenceBadge } from "@/features/evidence/components/atoms/EvidenceBadge";
import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
} from "@/features/evidence/types/evidence-graph.types";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

export interface NodeInspectorPanelProps {
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
 * Panel displaying details about a selected node.
 */
export function NodeInspectorPanel({
  nodes,
  edges,
  className = "",
}: NodeInspectorPanelProps) {
  const { state, closeInspector } = useGraphUI();
  const { inspector } = state;
  const [isExpanded, setIsExpanded] = useState(false);

  // Find selected node
  const selectedNode = useMemo(() => {
    if (inspector.contentType !== "node" || !inspector.contentId) return null;
    return nodes.find((n) => n.id === inspector.contentId);
  }, [inspector.contentId, inspector.contentType, nodes]);

  // Find edges connected to node
  const connectedEdges = useMemo(() => {
    if (!selectedNode) return { incoming: [], outgoing: [] };
    return {
      incoming: edges.filter((e) => e.target === selectedNode.id),
      outgoing: edges.filter((e) => e.source === selectedNode.id),
    };
  }, [selectedNode, edges]);

  if (!inspector.isOpen || !selectedNode) {
    return null;
  }

  return (
    <div
      className={`w-full bg-white/95 border border-gray-200 rounded-lg shadow-lg backdrop-blur-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {selectedNode.label}
          </p>
          <p className="truncate text-xs text-gray-500">
            {getNodeTypeLabel(selectedNode.type)}
            {selectedNode.metadata.provider
              ? ` · ${selectedNode.metadata.provider}`
              : ""}
          </p>
        </div>
        {selectedNode.metadata.severity ? (
          <EvidenceBadge
            type="severity"
            value={selectedNode.metadata.severity}
            size="sm"
          />
        ) : null}
        <button
          aria-label="Expand node details"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          title={isExpanded ? "Collapse details" : "Expand details"}
          type="button"
        >
          {isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </button>
        <button
          aria-label="Close node details"
          onClick={() => closeInspector()}
          className="text-gray-500 hover:text-gray-700"
          title="Close"
          type="button"
        >
          <XIcon />
        </button>
      </div>

      {/* Content */}
      {isExpanded ? (
        <div className="max-h-64 overflow-y-auto border-t border-gray-200">
          {/* Node Label */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Label</p>
            <p className="font-mono text-sm font-medium text-gray-900 break-all">
              {selectedNode.label}
            </p>
          </div>

          {/* Node Type */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Type</p>
            <p className="text-sm text-gray-900">
              {getNodeTypeLabel(selectedNode.type)}
            </p>
          </div>

          {/* Severity */}
          {selectedNode.metadata.severity && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Severity</p>
              <EvidenceBadge
                type="severity"
                value={selectedNode.metadata.severity}
                size="md"
              />
            </div>
          )}

          {/* Confidence */}
          {selectedNode.metadata.confidence && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Confidence</p>
              <EvidenceBadge
                type="confidence"
                value={selectedNode.metadata.confidence}
                size="md"
              />
            </div>
          )}

          {/* File Path */}
          {selectedNode.metadata.filePath && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1">File Path</p>
              <p className="font-mono text-xs text-gray-700 break-all">
                {selectedNode.metadata.filePath}
              </p>
            </div>
          )}

          {/* Line Number */}
          {selectedNode.metadata.lineNumber && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Line Number</p>
              <p className="font-mono text-sm text-gray-900">
                {selectedNode.metadata.lineNumber}
              </p>
            </div>
          )}

          {/* AI Provider */}
          {selectedNode.metadata.provider && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1">AI Provider</p>
              <p className="text-sm text-gray-900">
                {selectedNode.metadata.provider}
              </p>
            </div>
          )}

          {/* Finding Count */}
          {(selectedNode.metadata.findingCount ?? 0) > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Findings</p>
              <p className="text-sm font-semibold text-orange-600">
                {selectedNode.metadata.findingCount} finding
                {selectedNode.metadata.findingCount !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Outgoing Edges */}
          {connectedEdges.outgoing.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Outgoing Connections</p>
              <div className="space-y-1">
                {connectedEdges.outgoing.slice(0, 5).map((edge) => (
                  <div key={edge.id} className="text-xs text-gray-700">
                    <span className="font-medium">→</span>{" "}
                    {getEdgeTypeLabel(edge.type)}
                  </div>
                ))}
                {connectedEdges.outgoing.length > 5 && (
                  <p className="text-xs text-gray-500">
                    +{connectedEdges.outgoing.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Incoming Edges */}
          {connectedEdges.incoming.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 mb-2">Incoming Connections</p>
              <div className="space-y-1">
                {connectedEdges.incoming.slice(0, 5).map((edge) => (
                  <div key={edge.id} className="text-xs text-gray-700">
                    <span className="font-medium">←</span>{" "}
                    {getEdgeTypeLabel(edge.type)}
                  </div>
                ))}
                {connectedEdges.incoming.length > 5 && (
                  <p className="text-xs text-gray-500">
                    +{connectedEdges.incoming.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
