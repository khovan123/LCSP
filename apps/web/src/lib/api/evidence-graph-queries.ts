/**
 * Evidence Graph React Hooks
 *
 * TanStack Query v5 hooks for:
 * - Fetching evidence graph data
 * - Managing graph UI state
 * - Selection and filtering
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useReducer } from "react";

import type {
  EvidenceGraphUIState,
  GraphLayoutAlgorithm,
  GraphUIAction,
  GraphUIContextValue,
  GraphViewMode,
} from "../../features/evidence/types/evidence-graph-ui.types";
import type { GraphScope } from "../../features/evidence/types/evidence-graph.types";
import {
  getEvidenceGraph,
  type GetEvidenceGraphParams,
} from "./evidence-graph-client";
import { apiQueryKeys } from "./query-keys";

// ============================================================================
// Default UI State
// ============================================================================

const DEFAULT_UI_STATE: EvidenceGraphUIState = {
  nodes: {
    selectedNodeId: null,
    highlightedNodeIds: [],
  },
  edges: {
    selectedEdgeId: null,
    highlightedEdgeIds: [],
  },
  clusters: {
    selectedClusterId: null,
    expandedClusterIds: [],
  },
  viewMode: "3d",
  layout: "force-directed",
  filters: {
    nodeTypes: {
      file: true,
      function: true,
      ai_invocation: true,
      decision: true,
      dependency: true,
    },
    edgeTypes: {
      call: true,
      data_flow: true,
      output_to_decision: true,
      human_review: true,
      dependency: true,
    },
    severities: {
      HIGH: true,
      MEDIUM: true,
      LOW: true,
    },
    searchText: "",
  },
  display: {
    showNodeLabels: true,
    showEdgeLabels: false,
    showClusters: true,
    highlightSeverity: true,
    useColors: true,
    nodeSize: "medium",
    edgeWidth: "medium",
  },
  inspector: {
    isOpen: false,
    contentType: null,
  },
  search: {
    isOpen: false,
    query: "",
    hasResults: false,
    resultCount: 0,
  },
  isLoading: false,
  error: null,
};

// ============================================================================
// UI State Reducer
// ============================================================================

function graphUIReducer(
  state: EvidenceGraphUIState,
  action: GraphUIAction,
): EvidenceGraphUIState {
  const { type, payload } = action;

  switch (type) {
    // Node selection
    case "SELECT_NODE":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          selectedNodeId: payload as string,
        },
      };

    case "DESELECT_NODE":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          selectedNodeId: null,
        },
      };

    case "HIGHLIGHT_NODES":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          highlightedNodeIds: payload as string[],
        },
      };

    case "CLEAR_NODE_HIGHLIGHT":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          highlightedNodeIds: [],
        },
      };

    // Edge selection
    case "SELECT_EDGE":
      return {
        ...state,
        edges: {
          ...state.edges,
          selectedEdgeId: payload as string,
        },
      };

    case "DESELECT_EDGE":
      return {
        ...state,
        edges: {
          ...state.edges,
          selectedEdgeId: null,
        },
      };

    case "HIGHLIGHT_EDGES":
      return {
        ...state,
        edges: {
          ...state.edges,
          highlightedEdgeIds: payload as string[],
        },
      };

    case "CLEAR_EDGE_HIGHLIGHT":
      return {
        ...state,
        edges: {
          ...state.edges,
          highlightedEdgeIds: [],
        },
      };

    // Cluster selection
    case "SELECT_CLUSTER":
      return {
        ...state,
        clusters: {
          ...state.clusters,
          selectedClusterId: payload as string,
        },
      };

    case "EXPAND_CLUSTER":
      return {
        ...state,
        clusters: {
          ...state.clusters,
          expandedClusterIds: [
            ...state.clusters.expandedClusterIds,
            payload as string,
          ],
        },
      };

    case "COLLAPSE_CLUSTER":
      return {
        ...state,
        clusters: {
          ...state.clusters,
          expandedClusterIds: state.clusters.expandedClusterIds.filter(
            (id) => id !== payload,
          ),
        },
      };

    // Filters
    case "UPDATE_NODE_TYPE_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          nodeTypes: payload as EvidenceGraphUIState["filters"]["nodeTypes"],
        },
      };

    case "UPDATE_EDGE_TYPE_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          edgeTypes: payload as EvidenceGraphUIState["filters"]["edgeTypes"],
        },
      };

    case "UPDATE_SEVERITY_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          severities: payload as EvidenceGraphUIState["filters"]["severities"],
        },
      };

    case "SET_SEARCH_TEXT":
      return {
        ...state,
        filters: {
          ...state.filters,
          searchText: payload as string,
        },
      };

    case "SET_MIN_FINDING_COUNT":
      return {
        ...state,
        filters: {
          ...state.filters,
          minFindingCount: payload as number,
        },
      };

    // View mode
    case "SET_VIEW_MODE":
      return {
        ...state,
        viewMode: payload as GraphViewMode,
      };

    case "SET_LAYOUT_ALGORITHM":
      return {
        ...state,
        layout: payload as GraphLayoutAlgorithm,
      };

    // Display config
    case "TOGGLE_NODE_LABELS":
      return {
        ...state,
        display: {
          ...state.display,
          showNodeLabels: !state.display.showNodeLabels,
        },
      };

    case "TOGGLE_EDGE_LABELS":
      return {
        ...state,
        display: {
          ...state.display,
          showEdgeLabels: !state.display.showEdgeLabels,
        },
      };

    case "TOGGLE_CLUSTERS":
      return {
        ...state,
        display: {
          ...state.display,
          showClusters: !state.display.showClusters,
        },
      };

    case "TOGGLE_SEVERITY_HIGHLIGHT":
      return {
        ...state,
        display: {
          ...state.display,
          highlightSeverity: !state.display.highlightSeverity,
        },
      };

    case "SET_NODE_SIZE":
      return {
        ...state,
        display: {
          ...state.display,
          nodeSize: payload as EvidenceGraphUIState["display"]["nodeSize"],
        },
      };

    case "SET_EDGE_WIDTH":
      return {
        ...state,
        display: {
          ...state.display,
          edgeWidth: payload as EvidenceGraphUIState["display"]["edgeWidth"],
        },
      };

    // Inspector panel
    case "OPEN_INSPECTOR_NODE":
      return {
        ...state,
        inspector: {
          isOpen: true,
          contentType: "node",
          contentId: payload as string,
        },
      };

    case "OPEN_INSPECTOR_EDGE":
      return {
        ...state,
        inspector: {
          isOpen: true,
          contentType: "edge",
          contentId: payload as string,
        },
      };

    case "OPEN_INSPECTOR_CLUSTER":
      return {
        ...state,
        inspector: {
          isOpen: true,
          contentType: "cluster",
          contentId: payload as string,
        },
      };

    case "CLOSE_INSPECTOR":
      return {
        ...state,
        inspector: {
          isOpen: false,
          contentType: null,
        },
      };

    // Search panel
    case "OPEN_SEARCH":
      return {
        ...state,
        search: {
          ...state.search,
          isOpen: true,
        },
      };

    case "CLOSE_SEARCH":
      return {
        ...state,
        search: {
          ...state.search,
          isOpen: false,
        },
      };

    // Loading/Error
    case "SET_LOADING":
      return {
        ...state,
        isLoading: payload as boolean,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: payload as Error | null,
        isLoading: false,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    // Reset
    case "RESET_TO_DEFAULTS":
      return DEFAULT_UI_STATE;

    default:
      return state;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to fetch evidence graph data.
 *
 * @param params - Graph query parameters (assessmentId, scope, clusterId)
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with isLoading, data, error, refetch
 *
 * @example
 * const { data, isLoading, error } = useEvidenceGraph({
 *   assessmentId: "assessment-123",
 *   scope: "overview",
 * });
 */
export function useEvidenceGraph(
  params: GetEvidenceGraphParams,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: apiQueryKeys.assessment.evidenceGraph(
      params.assessmentId,
      params.scope,
      params.clusterId,
    ),
    queryFn: () => getEvidenceGraph(params),
    enabled: enabled && params.assessmentId.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to manage graph UI state (selection, filtering, view mode).
 *
 * @param initialState - Optional initial UI state (defaults to defaults)
 * @returns State and dispatch function, plus convenience methods
 *
 * @example
 * const { state, selectNode, openInspector } = useGraphUIState();
 *
 * const handleNodeClick = (nodeId: string) => {
 *   selectNode(nodeId);
 *   openInspector("node", nodeId);
 * };
 */
export function useGraphUIState(
  initialState?: Partial<EvidenceGraphUIState>,
): GraphUIContextValue {
  const [state, dispatch] = useReducer(graphUIReducer, {
    ...DEFAULT_UI_STATE,
    ...initialState,
  });

  // Convenience methods
  const selectNode = useCallback((nodeId: string) => {
    dispatch({ type: "SELECT_NODE", payload: nodeId });
  }, []);

  const deselectNode = useCallback(() => {
    dispatch({ type: "DESELECT_NODE" });
  }, []);

  const highlightNodes = useCallback((nodeIds: string[]) => {
    dispatch({ type: "HIGHLIGHT_NODES", payload: nodeIds });
  }, []);

  const clearNodeHighlight = useCallback(() => {
    dispatch({ type: "CLEAR_NODE_HIGHLIGHT" });
  }, []);

  const selectEdge = useCallback((edgeId: string) => {
    dispatch({ type: "SELECT_EDGE", payload: edgeId });
  }, []);

  const deselectEdge = useCallback(() => {
    dispatch({ type: "DESELECT_EDGE" });
  }, []);

  const highlightEdges = useCallback((edgeIds: string[]) => {
    dispatch({ type: "HIGHLIGHT_EDGES", payload: edgeIds });
  }, []);

  const clearEdgeHighlight = useCallback(() => {
    dispatch({ type: "CLEAR_EDGE_HIGHLIGHT" });
  }, []);

  const setViewMode = useCallback((mode: GraphViewMode) => {
    dispatch({ type: "SET_VIEW_MODE", payload: mode });
  }, []);

  const openInspector = useCallback(
    (contentType: "node" | "edge" | "cluster", contentId: string) => {
      const inspectorActions = {
        node: "OPEN_INSPECTOR_NODE",
        edge: "OPEN_INSPECTOR_EDGE",
        cluster: "OPEN_INSPECTOR_CLUSTER",
      } as const;
      dispatch({
        type: inspectorActions[contentType],
        payload: contentId,
      });
    },
    [],
  );

  const closeInspector = useCallback(() => {
    dispatch({ type: "CLOSE_INSPECTOR" });
  }, []);

  const resetToDefaults = useCallback(() => {
    dispatch({ type: "RESET_TO_DEFAULTS" });
  }, []);

  return {
    state,
    dispatch,
    selectNode,
    deselectNode,
    highlightNodes,
    clearNodeHighlight,
    selectEdge,
    deselectEdge,
    highlightEdges,
    clearEdgeHighlight,
    setViewMode,
    openInspector,
    closeInspector,
    resetToDefaults,
  };
}

/**
 * Hook to invalidate and refetch evidence graph cache.
 *
 * @example
 * const { refetchEvidenceGraph } = useEvidenceGraphRefresh();
 * const handleRefresh = () => {
 *   refetchEvidenceGraph("assessment-123");
 * };
 */
export function useEvidenceGraphRefresh() {
  const queryClient = useQueryClient();

  const refetchEvidenceGraph = useCallback(
    (
      assessmentId: string,
      scope: GraphScope = "overview",
      clusterId?: string,
    ) => {
      return queryClient.refetchQueries({
        queryKey: apiQueryKeys.assessment.evidenceGraph(
          assessmentId,
          scope,
          clusterId,
        ),
      });
    },
    [queryClient],
  );

  const invalidateEvidenceGraph = useCallback(
    (assessmentId: string) => {
      return queryClient.invalidateQueries({
        queryKey: ["assessment", assessmentId, "evidence", "graph"],
      });
    },
    [queryClient],
  );

  return { refetchEvidenceGraph, invalidateEvidenceGraph };
}
