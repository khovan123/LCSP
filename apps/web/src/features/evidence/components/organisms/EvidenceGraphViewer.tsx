/**
 * Evidence Graph Viewer Organism
 *
 * Main container component that coordinates all evidence graph visualization.
 * Manages data fetching, view mode switching, filtering, and panel display.
 */

"use client";

import { GraphErrorDisplay } from "@/features/evidence/components/atoms/GraphErrorDisplay";
import { GraphLoadingSkeleton } from "@/features/evidence/components/atoms/GraphLoadingSkeleton";
import { GraphFilterControls } from "@/features/evidence/components/molecules/GraphFilterControls";
import { GraphViewModeControls } from "@/features/evidence/components/molecules/GraphViewModeControls";
import { NodeInspectorPanel } from "@/features/evidence/components/molecules/NodeInspectorPanel";
import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
  OverviewCluster,
} from "@/features/evidence/types/evidence-graph.types";
import { projectImportantGraph } from "@/features/evidence/utils/important-graph-projection";
import { useMemo, useState } from "react";
import { EvidenceGraph2D } from "./EvidenceGraph2D";
import { EvidenceGraph3D } from "./EvidenceGraph3D";
import { EvidenceGraphTable } from "./EvidenceGraphTable";

export interface EvidenceGraphViewerProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  clusters?: OverviewCluster[];
  layoutRevision?: number;
  isLoading?: boolean;
  error?: Error | null;
  errorCode?: string;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Main evidence graph viewer component.
 *
 * Coordinates:
 * - 3D/2D/Table visualization modes
 * - Data filtering and search
 * - Node/edge selection and highlighting
 * - Inspector panel for metadata
 * - Compact node inspector
 *
 * @example
 * <EvidenceGraphViewer
 *   nodes={graphData.nodes}
 *   edges={graphData.edges}
 *   clusters={graphData.clusters}
 *   isLoading={isLoading}
 *   error={error}
 * />
 */
export function EvidenceGraphViewer({
  nodes,
  edges,
  clusters,
  layoutRevision = 0,
  isLoading = false,
  error = null,
  errorCode,
  onRefresh,
  className = "",
}: EvidenceGraphViewerProps) {
  const { state } = useGraphUI();
  const [currentLayoutRevision, setCurrentLayoutRevision] =
    useState(layoutRevision);
  const { viewMode } = state;
  const { filters } = state;
  const projection = useMemo(
    () => projectImportantGraph(nodes, edges, clusters),
    [clusters, edges, nodes],
  );
  const handleRefresh = () => {
    setCurrentLayoutRevision((revision) => revision + 1);
    onRefresh?.();
  };
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const visibleNodes = projection.nodes.filter((node) => {
      const matchesType = filters.nodeTypes[node.type];
      const matchesSeverity =
        node.metadata.severity === undefined ||
        filters.severities[node.metadata.severity];
      const matchesFindingCount =
        node.metadata.findingCount === undefined ||
        node.metadata.findingCount >= (filters.minFindingCount ?? 0);
      const searchText = filters.searchText?.trim().toLowerCase();
      const matchesSearch =
        !searchText ||
        [node.label, node.metadata.filePath, node.metadata.provider]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchText));

      return (
        matchesType && matchesSeverity && matchesFindingCount && matchesSearch
      );
    });
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = projection.edges.filter(
      (edge) =>
        filters.edgeTypes[edge.type] &&
        (edge.metadata.severity === undefined ||
          filters.severities[edge.metadata.severity]) &&
        visibleNodeIds.has(edge.source) &&
        visibleNodeIds.has(edge.target),
    );

    return { visibleNodes, visibleEdges };
  }, [filters, projection.edges, projection.nodes]);

  // Show loading state
  if (isLoading) {
    return <GraphLoadingSkeleton className={className} />;
  }

  // Show error state
  if (error) {
    return (
      <GraphErrorDisplay
        error={error}
        errorCode={errorCode}
        onRetry={handleRefresh}
        className={className}
      />
    );
  }

  // Show empty state
  if (visibleNodes.length === 0) {
    return (
      <div
        className={`w-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center ${className}`}
      >
        <div className="text-4xl mb-4">⊘</div>
        <p className="text-lg font-medium text-gray-900 mb-2">No Graph Data</p>
        <p className="text-gray-600">
          No evidence was found to visualize. Please check that the assessment
          has submitted technical evidence.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controls Toolbar */}
      <div className="flex items-center gap-4">
        <GraphViewModeControls />
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          title="Refresh graph data"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-4 flex-1">
        {/* Graph Visualization */}
        <div className="relative flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden min-h-96">
          {viewMode === "3d" && (
            <EvidenceGraph3D
              nodes={visibleNodes}
              edges={visibleEdges}
              clusters={projection.clusters}
              layoutRevision={currentLayoutRevision}
            />
          )}
          {viewMode === "2d" && (
            <EvidenceGraph2D
              nodes={visibleNodes}
              edges={visibleEdges}
              layoutRevision={currentLayoutRevision}
            />
          )}
          {viewMode === "table" && (
            <EvidenceGraphTable nodes={visibleNodes} edges={visibleEdges} />
          )}

          <NodeInspectorPanel
            nodes={visibleNodes}
            edges={visibleEdges}
            className="absolute bottom-4 left-4 right-4 z-10 max-w-4xl overflow-hidden"
          />
        </div>

        {/* Right Sidebar: Filters */}
        <aside className="w-72 shrink-0">
          <GraphFilterControls className="flex-col" />
        </aside>
      </div>

      {/* Statistics Footer */}
      <div className="flex gap-4 text-xs text-gray-600">
        <span>Nodes: {visibleNodes.length}</span>
        <span>Edges: {visibleEdges.length}</span>
        {projection.clusters && (
          <span>Clusters: {projection.clusters.length}</span>
        )}
        {projection.truncated && (
          <span>
            Showing topology flow from {projection.totalNodes} nodes /{" "}
            {projection.totalEdges} edges
          </span>
        )}
        {projection.limitations.length > 0 && (
          <span title={projection.limitations.join(" ")}>Partial topology</span>
        )}
        <span className="ml-auto">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
