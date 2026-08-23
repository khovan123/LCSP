"use client";

import { useMemo, useState, useCallback } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Position, 
  MarkerType 
} from "@xyflow/react";
import type {
  Node as FlowNode, 
  Edge as FlowEdge, 
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RECONCILIATION_STATUSES, type SystemGraphDto } from "@lcsp/contracts/evidence";

import { EvidenceDetailsPanel } from "../molecules/evidence-details-panel";

interface GraphVisualizationProps {
  data: SystemGraphDto;
}

const nodeWidth = 180;
const horizontalSpacing = 250;
const verticalSpacing = 100;

export function GraphVisualization({ data }: GraphVisualizationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const flowNodes: FlowNode[] = [];
    const flowEdges: FlowEdge[] = [];

    // Simple auto-layout grouping by node type
    const typeCounts: Record<string, number> = {};
    
    // Define columns for types to simulate a tiered architecture
    const typeColumns: Record<string, number> = {
      CONTROLLER: 0,
      EXTERNAL_API: 0,
      SERVICE: 1,
      MESSAGE_BROKER: 2,
      TOPIC: 2,
      QUEUE: 2,
      DATABASE: 3,
    };

    data.nodes.forEach((node) => {
      const col = typeColumns[node.type] ?? 1;
      const typeKey = node.type;
      
      if (typeCounts[typeKey] === undefined) {
        typeCounts[typeKey] = 0;
      }
      
      const row = typeCounts[typeKey]++;
      
      // Compute color based on reconciliation status
      let borderColor = "#3b82f6"; // Default blue
      let bgColor = "#ffffff";
      
      if (node.reconciliationStatus === RECONCILIATION_STATUSES.confirmed) {
        borderColor = "#22c55e"; // Green
        bgColor = "#f0fdf4";
      } else if (node.reconciliationStatus === RECONCILIATION_STATUSES.missingInObserved) {
        borderColor = "#ef4444"; // Red
        bgColor = "#fef2f2";
      } else if (node.reconciliationStatus === RECONCILIATION_STATUSES.orphanedInObserved) {
        borderColor = "#f97316"; // Orange
        bgColor = "#fff7ed";
      } else if (node.reconciliationStatus === RECONCILIATION_STATUSES.conflict) {
        borderColor = "#eab308"; // Yellow
        bgColor = "#fefce8";
      }

      flowNodes.push({
        id: node.id,
        position: { x: col * horizontalSpacing, y: row * verticalSpacing },
        data: { 
          label: (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="font-semibold text-xs truncate max-w-[150px]">{node.canonicalName}</span>
              <span className="text-[10px] text-gray-500">{node.type}</span>
            </div>
          ),
          rawNode: node
        },
        style: {
          width: nodeWidth,
          border: `2px solid ${borderColor}`,
          backgroundColor: bgColor,
          borderRadius: "8px",
          padding: "8px",
          color: "#1f2937", // text-gray-800
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    data.edges.forEach((edge) => {
      flowEdges.push({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.type,
        labelStyle: { fill: "#6b7280", fontWeight: 500, fontSize: 10 },
        labelBgStyle: { fill: "white", fillOpacity: 0.8 },
        animated: edge.type === "PUBLISHES" || edge.type === "CONSUMES",
        style: { stroke: "#9ca3af", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#9ca3af",
        },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const selectedRawNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return data.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, data.nodes]);

  return (
    <div className="flex w-full h-[600px] border rounded-lg bg-zinc-50 overflow-hidden relative">
      <div className="flex-1 h-full">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <MiniMap zoomable pannable />
        </ReactFlow>
      </div>

      {selectedRawNode && (
        <div className="w-80 h-full border-l bg-white shadow-lg overflow-y-auto z-10 absolute right-0 top-0">
          <EvidenceDetailsPanel 
            node={selectedRawNode} 
            onClose={() => setSelectedNodeId(null)} 
          />
        </div>
      )}
    </div>
  );
}
