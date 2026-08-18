/**
 * Graph View Mode Controls Molecule
 *
 * Toolbar for switching between 3D, 2D, and table visualization modes.
 */

"use client";

import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type { GraphViewMode } from "@/features/evidence/types/evidence-graph-ui.types";

export interface GraphViewModeControlsProps {
  className?: string;
}

/**
 * Individual view mode button.
 */
function ViewModeButton({
  mode,
  label,
  icon,
  isActive,
  onClick,
}: {
  mode: GraphViewMode;
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-600 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
      title={label}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Controls for switching graph visualization mode.
 */
export function GraphViewModeControls({
  className = "",
}: GraphViewModeControlsProps) {
  const { state, setViewMode } = useGraphUI();
  const { viewMode } = state;

  return (
    <div className={`flex gap-2 ${className}`}>
      <ViewModeButton
        mode="3d"
        label="3D"
        icon="⬢"
        isActive={viewMode === "3d"}
        onClick={() => setViewMode("3d")}
      />
      <ViewModeButton
        mode="2d"
        label="2D"
        icon="⊗"
        isActive={viewMode === "2d"}
        onClick={() => setViewMode("2d")}
      />
      <ViewModeButton
        mode="table"
        label="Table"
        icon="≣"
        isActive={viewMode === "table"}
        onClick={() => setViewMode("table")}
      />
    </div>
  );
}
