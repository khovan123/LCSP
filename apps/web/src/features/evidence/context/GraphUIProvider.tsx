/**
 * Evidence Graph UI Provider
 *
 * React Context provider for managing graph visualization state across components.
 * Wraps the entire evidence graph UI with centralized selection, filtering, and view mode state.
 */

"use client";

import { useGraphUIState } from "@/lib/api/evidence-graph-queries";
import { createContext, useContext } from "react";
import type {
  EvidenceGraphUIState,
  GraphUIContextValue,
  GraphUIProviderProps,
} from "../types/evidence-graph-ui.types";

/**
 * Context object for graph UI state.
 * Provides state, dispatch, and convenience methods to all child components.
 */
const GraphUIContext = createContext<GraphUIContextValue | undefined>(
  undefined,
);

/**
 * Provider component for graph UI state.
 *
 * Wraps child components with access to:
 * - Selection state (nodes, edges, clusters)
 * - View mode (3D, 2D, table)
 * - Filtering (node types, edge types, severities)
 * - Display config (labels, colors, sizes)
 * - Panel states (inspector, legend, search)
 *
 * @example
 * export default function EvidenceGraphPage() {
 *   return (
 *     <GraphUIProvider>
 *       <EvidenceGraphViewer />
 *       <NodeInspectorPanel />
 *     </GraphUIProvider>
 *   );
 * }
 */
export function GraphUIProvider({
  children,
  initialState,
}: GraphUIProviderProps) {
  const uiContext = useGraphUIState(initialState);

  return (
    <GraphUIContext.Provider value={uiContext}>
      {children}
    </GraphUIContext.Provider>
  );
}

/**
 * Hook to access graph UI context.
 *
 * Must be used within a GraphUIProvider.
 * Provides access to all graph state and convenience methods.
 *
 * @returns Graph UI context value (state, dispatch, methods)
 * @throws Error if used outside GraphUIProvider
 *
 * @example
 * function MyGraphComponent() {
 *   const { state, selectNode } = useGraphUI();
 *   return (
 *     <div onClick={(e) => selectNode(e.currentTarget.dataset.nodeId!)}>
 *       Current selection: {state.nodes.selectedNodeId}
 *     </div>
 *   );
 * }
 */
export function useGraphUI(): GraphUIContextValue {
  const context = useContext(GraphUIContext);
  if (!context) {
    throw new Error(
      "useGraphUI must be used within a GraphUIProvider component",
    );
  }
  return context;
}

/**
 * Hook to access only the graph UI state (read-only).
 *
 * @returns Current graph UI state
 * @throws Error if used outside GraphUIProvider
 */
export function useGraphUIState_Context(): EvidenceGraphUIState {
  const { state } = useGraphUI();
  return state;
}
