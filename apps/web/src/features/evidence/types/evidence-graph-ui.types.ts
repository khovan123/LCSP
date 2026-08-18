/**
 * Evidence Graph UI State Types
 *
 * Manages React component state for graph visualization:
 * - Node/edge selection
 * - View mode (3D/2D)
 * - Highlighting and filtering
 * - Panel visibility
 * - Context sharing across components
 */

import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
  OverviewCluster,
} from "./evidence-graph.types";

// ============================================================================
// Selection & Highlighting
// ============================================================================

/**
 * Node selection state within the graph.
 */
export interface GraphNodeSelection {
  selectedNodeId?: string | null;
  highlightedNodeIds: string[];
}

/**
 * Edge selection state within the graph.
 */
export interface GraphEdgeSelection {
  selectedEdgeId?: string | null;
  highlightedEdgeIds: string[];
}

/**
 * Cluster selection state (for overview mode).
 */
export interface GraphClusterSelection {
  selectedClusterId?: string | null;
  expandedClusterIds: string[];
}

// ============================================================================
// View Mode & Layout
// ============================================================================

/**
 * View mode for graph visualization.
 * - "3d": Three.js force-directed layout with clusters visible
 * - "2d": Force-directed SVG/Canvas layout with individual nodes
 */
export type GraphViewMode = "3d" | "2d" | "table";

/**
 * Layout algorithm for graph rendering.
 */
export type GraphLayoutAlgorithm = "force-directed" | "hierarchical" | "radial";

/**
 * Camera/zoom state for 3D view.
 */
export interface GraphCameraState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  zoom: number;
}

// ============================================================================
// Filtering & Display
// ============================================================================

/**
 * Node type filter configuration.
 */
export interface GraphNodeTypeFilter {
  file: boolean;
  function: boolean;
  ai_invocation: boolean;
  decision: boolean;
  dependency: boolean;
}

/**
 * Edge type filter configuration.
 */
export interface GraphEdgeTypeFilter {
  call: boolean;
  data_flow: boolean;
  output_to_decision: boolean;
  human_review: boolean;
  dependency: boolean;
}

/**
 * Severity filter configuration.
 */
export interface GraphSeverityFilter {
  HIGH: boolean;
  MEDIUM: boolean;
  LOW: boolean;
}

/**
 * Complete filter state for graph display.
 */
export interface GraphFilterState {
  nodeTypes: GraphNodeTypeFilter;
  edgeTypes: GraphEdgeTypeFilter;
  severities: GraphSeverityFilter;
  searchText?: string;
  minFindingCount?: number;
}

/**
 * Display configuration for graph rendering.
 */
export interface GraphDisplayConfig {
  showNodeLabels: boolean;
  showEdgeLabels: boolean;
  showClusters: boolean;
  highlightSeverity: boolean;
  useColors: boolean;
  nodeSize: "small" | "medium" | "large";
  edgeWidth: "thin" | "medium" | "thick";
}

// ============================================================================
// Panel State
// ============================================================================

/**
 * Inspector panel state (side panel showing node/edge details).
 */
export interface InspectorPanelState {
  isOpen: boolean;
  contentType: "node" | "edge" | "cluster" | null;
  contentId?: string | null;
}

/**
 * Search/filter panel state.
 */
export interface SearchPanelState {
  isOpen: boolean;
  query: string;
  hasResults: boolean;
  resultCount: number;
}

// ============================================================================
// Complete UI Context State
// ============================================================================

/**
 * Complete UI state for evidence graph visualization.
 * Managed by GraphUIProvider context.
 */
export interface EvidenceGraphUIState {
  // Selection
  nodes: GraphNodeSelection;
  edges: GraphEdgeSelection;
  clusters: GraphClusterSelection;

  // Viewing
  viewMode: GraphViewMode;
  layout: GraphLayoutAlgorithm;
  cameraState?: GraphCameraState;

  // Filtering
  filters: GraphFilterState;
  display: GraphDisplayConfig;

  // Panels
  inspector: InspectorPanelState;
  search: SearchPanelState;

  // Loading/Error
  isLoading: boolean;
  error?: Error | null;
}

/**
 * Action to update UI state.
 */
export interface GraphUIAction {
  type: GraphUIActionType;
  payload?: unknown;
}

/**
 * All possible UI state action types.
 */
export type GraphUIActionType =
  // Node selection
  | "SELECT_NODE"
  | "DESELECT_NODE"
  | "HIGHLIGHT_NODES"
  | "CLEAR_NODE_HIGHLIGHT"
  // Edge selection
  | "SELECT_EDGE"
  | "DESELECT_EDGE"
  | "HIGHLIGHT_EDGES"
  | "CLEAR_EDGE_HIGHLIGHT"
  // Cluster selection
  | "SELECT_CLUSTER"
  | "DESELECT_CLUSTER"
  | "EXPAND_CLUSTER"
  | "COLLAPSE_CLUSTER"
  // View mode
  | "SET_VIEW_MODE"
  | "SET_LAYOUT_ALGORITHM"
  | "UPDATE_CAMERA_STATE"
  // Filtering
  | "UPDATE_NODE_TYPE_FILTER"
  | "UPDATE_EDGE_TYPE_FILTER"
  | "UPDATE_SEVERITY_FILTER"
  | "SET_SEARCH_TEXT"
  | "SET_MIN_FINDING_COUNT"
  // Display config
  | "TOGGLE_NODE_LABELS"
  | "TOGGLE_EDGE_LABELS"
  | "TOGGLE_CLUSTERS"
  | "TOGGLE_SEVERITY_HIGHLIGHT"
  | "TOGGLE_COLORS"
  | "SET_NODE_SIZE"
  | "SET_EDGE_WIDTH"
  // Inspector panel
  | "OPEN_INSPECTOR_NODE"
  | "OPEN_INSPECTOR_EDGE"
  | "OPEN_INSPECTOR_CLUSTER"
  | "CLOSE_INSPECTOR"
  // Search panel
  | "OPEN_SEARCH"
  | "CLOSE_SEARCH"
  | "UPDATE_SEARCH_QUERY"
  // Loading/Error
  | "SET_LOADING"
  | "SET_ERROR"
  | "CLEAR_ERROR"
  // Reset all
  | "RESET_TO_DEFAULTS";

// ============================================================================
// Data Presentation (View Models)
// ============================================================================

/**
 * Node data as rendered/presented to user.
 * Includes computed properties and display-specific info.
 */
export interface GraphNodePresentation extends EvidenceGraphNode {
  isSelected: boolean;
  isHighlighted: boolean;
  isFiltered: boolean;
  displayColor?: string;
  displaySize?: number;
  displayLabel?: string;
}

/**
 * Edge data as rendered/presented to user.
 */
export interface GraphEdgePresentation extends EvidenceGraphEdge {
  isSelected: boolean;
  isHighlighted: boolean;
  isFiltered: boolean;
  displayColor?: string;
  displayWidth?: number;
  displayLabel?: string;
}

/**
 * Cluster data as rendered/presented to user.
 */
export interface GraphClusterPresentation extends OverviewCluster {
  isSelected: boolean;
  isExpanded: boolean;
  displayColor?: string;
  childNodePresentations: GraphNodePresentation[];
}

// ============================================================================
// Context & Provider Props
// ============================================================================

/**
 * Props for GraphUIProvider component.
 */
export interface GraphUIProviderProps {
  children: React.ReactNode;
  initialState?: Partial<EvidenceGraphUIState>;
}

/**
 * Context value for graph UI state management.
 */
export interface GraphUIContextValue {
  state: EvidenceGraphUIState;
  dispatch: (action: GraphUIAction) => void;

  // Convenience methods
  selectNode: (nodeId: string) => void;
  deselectNode: () => void;
  highlightNodes: (nodeIds: string[]) => void;
  clearNodeHighlight: () => void;

  selectEdge: (edgeId: string) => void;
  deselectEdge: () => void;
  highlightEdges: (edgeIds: string[]) => void;
  clearEdgeHighlight: () => void;

  setViewMode: (mode: GraphViewMode) => void;
  openInspector: (
    contentType: "node" | "edge" | "cluster",
    contentId: string,
  ) => void;
  closeInspector: () => void;

  resetToDefaults: () => void;
}
