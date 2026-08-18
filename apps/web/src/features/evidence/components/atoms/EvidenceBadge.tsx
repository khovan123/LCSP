/**
 * Evidence Badge Atom
 *
 * Small badge displaying severity or confidence level.
 * Used to visualize finding severity in graph nodes and inspector panel.
 */

"use client";

import type {
  Confidence,
  Severity,
} from "@/features/evidence/types/evidence-graph.types";

export interface EvidenceBadgeProps {
  type: "severity" | "confidence";
  value: Severity | Confidence;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Get color classes based on severity/confidence level.
 */
function getColorClasses(value: Severity | Confidence): string {
  switch (value) {
    case "HIGH":
      return "bg-red-100 text-red-800 border-red-300";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "LOW":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

/**
 * Get size classes.
 */
function getSizeClasses(size: string): string {
  switch (size) {
    case "sm":
      return "px-2 py-0.5 text-xs";
    case "lg":
      return "px-3 py-1 text-base";
    case "md":
    default:
      return "px-2.5 py-1 text-sm";
  }
}

/**
 * Badge component displaying severity or confidence.
 */
export function EvidenceBadge({
  type,
  value,
  size = "md",
  showLabel = true,
  className = "",
}: EvidenceBadgeProps) {
  const colorClasses = getColorClasses(value);
  const sizeClasses = getSizeClasses(size);
  const labelText =
    type === "severity" ? `Severity: ${value}` : `Confidence: ${value}`;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colorClasses} ${sizeClasses} ${className}`}
      title={labelText}
    >
      <span className="mr-1">●</span>
      {showLabel && <span>{value}</span>}
    </span>
  );
}
