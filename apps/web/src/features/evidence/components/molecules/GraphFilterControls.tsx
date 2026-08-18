/**
 * Graph Filter Controls Molecule
 *
 * Toolbar for filtering graph visualization by node types, edge types, and severities.
 */

"use client";

import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import React from "react";

export interface GraphFilterControlsProps {
  className?: string;
}

/**
 * Checkbox filter control.
 */
function FilterCheckbox({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {color && <div className={`h-3 w-3 rounded ${color}`} />}
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

/**
 * Collapsible filter section.
 */
function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-300 pb-3 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-2"
      >
        <span
          className={`text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
        {title}
      </button>
      {expanded && <div className="space-y-1">{children}</div>}
    </div>
  );
}

/**
 * Filter controls for graph visualization.
 */
export function GraphFilterControls({
  className = "",
}: GraphFilterControlsProps) {
  const { state, dispatch } = useGraphUI();
  const { filters } = state;

  const [expandedSections, setExpandedSections] = React.useState({
    nodeTypes: true,
    edgeTypes: false,
    severities: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div
      className={`flex gap-4 p-3 bg-white border border-gray-200 rounded-lg ${className}`}
    >
      {/* Node Type Filters */}
      <FilterSection
        title="Node Types"
        expanded={expandedSections.nodeTypes}
        onToggle={() => toggleSection("nodeTypes")}
      >
        <FilterCheckbox
          label="File"
          checked={filters.nodeTypes.file}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_NODE_TYPE_FILTER",
              payload: { ...filters.nodeTypes, file: checked },
            });
          }}
          color="bg-blue-500"
        />
        <FilterCheckbox
          label="Function"
          checked={filters.nodeTypes.function}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_NODE_TYPE_FILTER",
              payload: { ...filters.nodeTypes, function: checked },
            });
          }}
          color="bg-green-500"
        />
        <FilterCheckbox
          label="AI Invocation"
          checked={filters.nodeTypes.ai_invocation}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_NODE_TYPE_FILTER",
              payload: { ...filters.nodeTypes, ai_invocation: checked },
            });
          }}
          color="bg-purple-500"
        />
        <FilterCheckbox
          label="Decision"
          checked={filters.nodeTypes.decision}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_NODE_TYPE_FILTER",
              payload: { ...filters.nodeTypes, decision: checked },
            });
          }}
          color="bg-orange-500"
        />
        <FilterCheckbox
          label="Dependency"
          checked={filters.nodeTypes.dependency}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_NODE_TYPE_FILTER",
              payload: { ...filters.nodeTypes, dependency: checked },
            });
          }}
          color="bg-gray-500"
        />
      </FilterSection>

      {/* Edge Type Filters */}
      <FilterSection
        title="Edge Types"
        expanded={expandedSections.edgeTypes}
        onToggle={() => toggleSection("edgeTypes")}
      >
        <FilterCheckbox
          label="Call"
          checked={filters.edgeTypes.call}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_EDGE_TYPE_FILTER",
              payload: { ...filters.edgeTypes, call: checked },
            });
          }}
          color="bg-blue-500"
        />
        <FilterCheckbox
          label="Data Flow"
          checked={filters.edgeTypes.data_flow}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_EDGE_TYPE_FILTER",
              payload: { ...filters.edgeTypes, data_flow: checked },
            });
          }}
          color="bg-purple-500"
        />
        <FilterCheckbox
          label="Output → Decision"
          checked={filters.edgeTypes.output_to_decision}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_EDGE_TYPE_FILTER",
              payload: { ...filters.edgeTypes, output_to_decision: checked },
            });
          }}
          color="bg-orange-500"
        />
        <FilterCheckbox
          label="Human Review"
          checked={filters.edgeTypes.human_review}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_EDGE_TYPE_FILTER",
              payload: { ...filters.edgeTypes, human_review: checked },
            });
          }}
          color="bg-pink-500"
        />
        <FilterCheckbox
          label="Dependency"
          checked={filters.edgeTypes.dependency}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_EDGE_TYPE_FILTER",
              payload: { ...filters.edgeTypes, dependency: checked },
            });
          }}
          color="bg-cyan-500"
        />
      </FilterSection>

      {/* Severity Filters */}
      <FilterSection
        title="Severity"
        expanded={expandedSections.severities}
        onToggle={() => toggleSection("severities")}
      >
        <FilterCheckbox
          label="High"
          checked={filters.severities.HIGH}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_SEVERITY_FILTER",
              payload: { ...filters.severities, HIGH: checked },
            });
          }}
          color="bg-red-500"
        />
        <FilterCheckbox
          label="Medium"
          checked={filters.severities.MEDIUM}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_SEVERITY_FILTER",
              payload: { ...filters.severities, MEDIUM: checked },
            });
          }}
          color="bg-yellow-500"
        />
        <FilterCheckbox
          label="Low"
          checked={filters.severities.LOW}
          onChange={(checked) => {
            dispatch({
              type: "UPDATE_SEVERITY_FILTER",
              payload: { ...filters.severities, LOW: checked },
            });
          }}
          color="bg-green-500"
        />
      </FilterSection>
    </div>
  );
}
