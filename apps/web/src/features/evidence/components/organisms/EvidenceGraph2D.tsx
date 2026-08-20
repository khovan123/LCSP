/**
 * Evidence Graph 2D Organism
 *
 * Two-dimensional graph visualization using Canvas + force layout.
 * Displays detail mode: individual nodes and edges with full metadata visibility.
 *
 * Features:
 * - Force-directed layout for natural node positioning
 * - Node representation with size based on finding count
 * - Edge visualization with different styles per type
 * - Interactive node/edge selection and highlighting
 * - Zoom and pan controls
 * - Performance optimized with Canvas rendering
 */

"use client";

import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
} from "@/features/evidence/types/evidence-graph.types";
import React, { useCallback, useEffect, useRef } from "react";

export interface EvidenceGraph2DProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  layoutRevision?: number;
  className?: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

/**
 * Node position in 2D space (for force simulation)
 */
interface Node2D {
  node: EvidenceGraphNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}

/**
 * Get node color based on severity
 */
function getNodeColor(nodeType: string): string {
  switch (nodeType) {
    case "file":
      return "#3b82f6"; // blue
    case "function":
      return "#22c55e"; // green
    case "ai_invocation":
      return "#a855f7"; // purple
    case "decision":
      return "#f97316"; // orange
    case "dependency":
      return "#6b7280"; // gray
    default:
      return "#6b7280";
  }
}

/**
 * Get node radius based on finding count
 */
function getNodeRadius(findingCount: number = 0): number {
  const baseRadius = 8;
  const sizeMultiplier = Math.sqrt(findingCount + 1) * 0.5;
  return Math.max(baseRadius, baseRadius + sizeMultiplier);
}

/**
 * Get edge color based on type
 */
function getEdgeColor(edgeType: string): string {
  switch (edgeType) {
    case "call":
      return "#3b82f6"; // blue
    case "data_flow":
      return "#8b5cf6"; // purple
    case "output_to_decision":
      return "#f59e0b"; // amber
    case "human_review":
      return "#ec4899"; // pink
    case "dependency":
      return "#06b6d4"; // cyan
    default:
      return "#6b7280"; // gray
  }
}

/**
 * Get edge dash pattern based on type
 */
function getEdgeDashPattern(edgeType: string): number[] {
  switch (edgeType) {
    case "call":
      return [];
    case "data_flow":
      return [5, 5];
    case "output_to_decision":
      return [10, 5];
    case "human_review":
      return [2, 2];
    case "dependency":
      return [8, 4];
    default:
      return [];
  }
}

/**
 * Simple force-directed layout simulation (2D)
 */
function simulateForces2D(
  nodes2d: Node2D[],
  edges: EvidenceGraphEdge[],
  iterations: number = 5,
): void {
  const SPRING_LENGTH = 50;
  const SPRING_FORCE = 0.01;
  const REPULSION_FORCE = 500;
  const DAMPING = 0.9;
  const MAX_VELOCITY = 3;

  for (let iter = 0; iter < iterations; iter++) {
    // Apply repulsion (node-to-node)
    for (let i = 0; i < nodes2d.length; i++) {
      for (let j = i + 1; j < nodes2d.length; j++) {
        const dx = nodes2d[j].x - nodes2d[i].x;
        const dy = nodes2d[j].y - nodes2d[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const force = REPULSION_FORCE / (dist * dist);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        nodes2d[i].vx -= fx;
        nodes2d[i].vy -= fy;

        nodes2d[j].vx += fx;
        nodes2d[j].vy += fy;
      }
    }

    // Apply attraction (edge-based)
    for (const edge of edges) {
      const sourceNode = nodes2d.find((n) => n.node.id === edge.source);
      const targetNode = nodes2d.find((n) => n.node.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;

      const force = (dist - SPRING_LENGTH) * SPRING_FORCE;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      sourceNode.vx += fx;
      sourceNode.vy += fy;

      targetNode.vx -= fx;
      targetNode.vy -= fy;
    }

    // Apply velocity and damping
    for (const node of nodes2d) {
      node.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, node.vx));
      node.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, node.vy));

      node.x += node.vx;
      node.y += node.vy;

      node.vx *= DAMPING;
      node.vy *= DAMPING;
    }
  }
}

/**
 * 2D graph visualization component.
 *
 * Renders evidence graph in 2D space using Canvas.
 * Suitable for detail mode with individual node visibility.
 *
 * @example
 * <EvidenceGraph2D
 *   nodes={graphData.nodes}
 *   edges={graphData.edges}
 *   onNodeClick={(nodeId) => selectNode(nodeId)}
 * />
 */
export function EvidenceGraph2D({
  nodes,
  edges,
  layoutRevision = 0,
  className = "",
  onNodeClick,
}: EvidenceGraph2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes2dRef = useRef<Node2D[]>([]);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const positionsRef = useRef(new Map<string, { x: number; y: number }>());
  const hasLaidOutRef = useRef(false);
  const layoutRevisionRef = useRef(layoutRevision);

  const { state, selectNode, openInspector } = useGraphUI();

  // Initialize canvas and nodes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const positionStore = positionsRef.current;
    const rect = container.getBoundingClientRect();

    if (layoutRevisionRef.current !== layoutRevision) {
      positionStore.clear();
      hasLaidOutRef.current = false;
      layoutRevisionRef.current = layoutRevision;
    }

    canvas.width = rect.width;
    canvas.height = rect.height;

    // Reuse positions by node ID so filtering does not move existing nodes.
    const nodes2d: Node2D[] = nodes.map((node) => ({
      node,
      x: positionStore.get(node.id)?.x ?? (Math.random() - 0.5) * canvas.width,
      y: positionStore.get(node.id)?.y ?? (Math.random() - 0.5) * canvas.height,
      vx: 0,
      vy: 0,
      mass: 1,
    }));

    nodes2dRef.current = nodes2d;
    isInitializedRef.current = true;

    if (!hasLaidOutRef.current && nodes2d.length > 0) {
      simulateForces2D(nodes2d, edges, 100);
      hasLaidOutRef.current = true;
    }

    for (const node of nodes2d) {
      positionStore.set(node.node.id, { x: node.x, y: node.y });
    }
  }, [nodes, edges, layoutRevision]);

  // Animation loop
  useEffect(() => {
    if (!isInitializedRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const positionStore = positionsRef.current;

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Run force simulation every 5 frames
      // Clear canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply zoom and pan transforms
      ctx.save();
      ctx.translate(
        canvas.width / 2 + panRef.current.x,
        canvas.height / 2 + panRef.current.y,
      );
      ctx.scale(zoomRef.current, zoomRef.current);

      // Draw edges
      for (const edge of edges) {
        const sourceNode = nodes2dRef.current.find(
          (n) => n.node.id === edge.source,
        );
        const targetNode = nodes2dRef.current.find(
          (n) => n.node.id === edge.target,
        );

        if (!sourceNode || !targetNode) continue;

        const isHighlighted =
          state.edges.selectedEdgeId === edge.id ||
          (state.nodes.highlightedNodeIds.includes(edge.source) &&
            state.nodes.highlightedNodeIds.includes(edge.target));

        ctx.strokeStyle = getEdgeColor(edge.type);
        ctx.lineWidth = isHighlighted ? 3 : 2;
        ctx.setLineDash(getEdgeDashPattern(edge.type));
        ctx.globalAlpha = isHighlighted ? 1 : 0.6;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Draw nodes
      for (const node2d of nodes2dRef.current) {
        const radius = getNodeRadius(node2d.node.metadata?.findingCount ?? 0);
        const isSelected = state.nodes.selectedNodeId === node2d.node.id;
        const isHighlighted = state.nodes.highlightedNodeIds.includes(
          node2d.node.id,
        );

        ctx.fillStyle = getNodeColor(node2d.node.type);
        ctx.beginPath();
        ctx.arc(node2d.x, node2d.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline for selected/highlighted nodes
        if (isSelected || isHighlighted) {
          ctx.strokeStyle = isSelected ? "#000000" : "#666666";
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.beginPath();
          ctx.arc(node2d.x, node2d.y, radius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw node label (abbreviated)
        ctx.fillStyle = "#000000";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = node2d.node.label.substring(0, 12);
        ctx.fillText(label, node2d.x, node2d.y);
      }

      ctx.restore();

      // Draw UI overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, 300, 80);

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`Nodes: ${nodes.length}`, 10, 10);
      ctx.fillText(`Edges: ${edges.length}`, 10, 25);
      ctx.fillText(`Zoom: ${(zoomRef.current * 100).toFixed(0)}%`, 10, 40);
      ctx.fillText(`Scroll to zoom • Drag to pan • Click to select`, 10, 55);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      for (const node of nodes2dRef.current) {
        positionStore.set(node.node.id, { x: node.x, y: node.y });
      }
    };
  }, [
    nodes,
    edges,
    state.nodes.selectedNodeId,
    state.nodes.highlightedNodeIds,
    state.edges.selectedEdgeId,
  ]);

  // Handle canvas click for node selection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x =
        (e.clientX - rect.left - canvas.width / 2 - panRef.current.x) /
        zoomRef.current;
      const y =
        (e.clientY - rect.top - canvas.height / 2 - panRef.current.y) /
        zoomRef.current;

      // Check if click is on a node
      for (const node2d of nodes2dRef.current) {
        const radius = getNodeRadius(node2d.node.metadata?.findingCount ?? 0);
        const dx = node2d.x - x;
        const dy = node2d.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius + 5) {
          selectNode(node2d.node.id);
          openInspector("node", node2d.node.id);
          onNodeClick?.(node2d.node.id);
          return;
        }
      }
    },
    [selectNode, openInspector, onNodeClick],
  );

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    zoomRef.current = Math.max(
      0.1,
      Math.min(3, zoomRef.current + direction * zoomSpeed),
    );
  }, []);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;

    const deltaX = e.clientX - dragRef.current.x;
    const deltaY = e.clientY - dragRef.current.y;

    panRef.current.x += deltaX;
    panRef.current.y += deltaY;
    hasDraggedRef.current = true;

    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Handle mouse down for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0 || e.button === 2 || e.ctrlKey) {
        dragRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [],
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-white rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: "500px" }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
