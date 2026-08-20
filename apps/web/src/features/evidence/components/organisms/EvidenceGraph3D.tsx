/**
 * Evidence Graph 3D Organism
 *
 * Three-dimensional graph visualization using three.js.
 * Displays overview mode: clusters, nodes, and edges in 3D space.
 *
 * Features:
 * - Force-directed layout for natural node positioning
 * - Cluster visualization with severity color coding
 * - Interactive node selection and highlighting
 * - Camera controls (zoom, pan, rotate)
 * - Performance optimization with InstancedMesh
 */

"use client";

import { useGraphUI } from "@/features/evidence/context/GraphUIProvider";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
  OverviewCluster,
} from "@/features/evidence/types/evidence-graph.types";
import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

export interface EvidenceGraph3DProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  layoutRevision?: number;
  clusters?: OverviewCluster[];
  className?: string;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

/**
 * Node position in 3D space (for force simulation)
 */
interface Node3D {
  node: EvidenceGraphNode;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
}

/**
 * Get node color based on severity
 */
function getNodeColor(nodeType: string): number {
  switch (nodeType) {
    case "file":
      return 0x3b82f6; // blue
    case "function":
      return 0x22c55e; // green
    case "ai_invocation":
      return 0xa855f7; // purple
    case "decision":
      return 0xf97316; // orange
    case "dependency":
      return 0x6b7280; // gray
    default:
      return 0x6b7280;
  }
}

function getEdgeColor(edgeType: string): number {
  switch (edgeType) {
    case "call":
      return 0x3b82f6; // blue
    case "data_flow":
      return 0x8b5cf6; // purple
    case "output_to_decision":
      return 0xf59e0b; // amber
    case "human_review":
      return 0xec4899; // pink
    case "dependency":
      return 0x06b6d4; // cyan
    default:
      return 0x6b7280; // gray
  }
}

/**
 * Get node geometry based on type
 */
function getNodeGeometry(type: string, size: number): THREE.BufferGeometry {
  switch (type) {
    case "file":
      return new THREE.BoxGeometry(size, size, size);
    case "function":
      return new THREE.OctahedronGeometry(size);
    case "ai_invocation":
      return new THREE.ConeGeometry(size, size * 2, 8);
    case "decision":
      return new THREE.TetrahedronGeometry(size);
    case "dependency":
      return new THREE.SphereGeometry(size, 8, 8);
    default:
      return new THREE.SphereGeometry(size, 8, 8);
  }
}

/**
 * Simple force-directed layout simulation
 */
function simulateForces(
  nodes3d: Node3D[],
  edges: EvidenceGraphEdge[],
  iterations: number = 5,
): void {
  const SPRING_LENGTH = 30;
  const SPRING_FORCE = 0.01;
  const REPULSION_FORCE = 100;
  const DAMPING = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    // Apply repulsion (node-to-node)
    for (let i = 0; i < nodes3d.length; i++) {
      for (let j = i + 1; j < nodes3d.length; j++) {
        const dx = nodes3d[j].position.x - nodes3d[i].position.x;
        const dy = nodes3d[j].position.y - nodes3d[i].position.y;
        const dz = nodes3d[j].position.z - nodes3d[i].position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1;
        const force = REPULSION_FORCE / (dist * dist);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        nodes3d[i].velocity.x -= fx;
        nodes3d[i].velocity.y -= fy;
        nodes3d[i].velocity.z -= fz;

        nodes3d[j].velocity.x += fx;
        nodes3d[j].velocity.y += fy;
        nodes3d[j].velocity.z += fz;
      }
    }

    // Apply attraction (edge-based)
    for (const edge of edges) {
      const sourceNode = nodes3d.find((n) => n.node.id === edge.source);
      const targetNode = nodes3d.find((n) => n.node.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      const dx = targetNode.position.x - sourceNode.position.x;
      const dy = targetNode.position.y - sourceNode.position.y;
      const dz = targetNode.position.z - sourceNode.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1;

      const force = (dist - SPRING_LENGTH) * SPRING_FORCE;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      sourceNode.velocity.x += fx;
      sourceNode.velocity.y += fy;
      sourceNode.velocity.z += fz;

      targetNode.velocity.x -= fx;
      targetNode.velocity.y -= fy;
      targetNode.velocity.z -= fz;
    }

    // Apply velocity and damping
    for (const node of nodes3d) {
      node.position.addScaledVector(node.velocity, 0.1);
      node.velocity.multiplyScalar(DAMPING);
    }
  }
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    item.dispose();
  }
}

function disposeGraphObject(object: THREE.Object3D): void {
  if (
    object instanceof THREE.Mesh ||
    object instanceof THREE.LineSegments ||
    object instanceof THREE.Sprite
  ) {
    object.geometry.dispose();
    disposeMaterial(object.material);
    const material = object.material;
    if (material instanceof THREE.SpriteMaterial) {
      material.map?.dispose();
    }
  }
}

function createNodeLabel(node: EvidenceGraphNode): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Sprite();
  }

  context.font = "bold 28px sans-serif";
  context.fillStyle = "white";
  context.strokeStyle = "rgba(15, 23, 42, 0.9)";
  context.lineWidth = 8;
  context.strokeText(node.label, 8, 42);
  context.fillText(node.label, 8, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(22, 2.75, 1);
  return sprite;
}

/**
 * 3D graph visualization component.
 *
 * Renders evidence graph in 3D space using three.js.
 * Suitable for overview mode where clusters are visible.
 *
 * @example
 * <EvidenceGraph3D
 *   nodes={graphData.nodes}
 *   edges={graphData.edges}
 *   clusters={graphData.clusters}
 *   onNodeClick={(nodeId) => selectNode(nodeId)}
 * />
 */
export function EvidenceGraph3D({
  nodes,
  edges,
  layoutRevision = 0,
  clusters,
  className = "",
  onNodeClick,
}: EvidenceGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const nodeGroupRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const graphObjectsRef = useRef<THREE.Object3D[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const isInitializedRef = useRef(false);
  const rotateRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const positionsRef = useRef(new Map<string, THREE.Vector3>());
  const hasLaidOutRef = useRef(false);
  const layoutRevisionRef = useRef(layoutRevision);

  const { state, selectNode, openInspector } = useGraphUI();

  // Initialize three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.z = 100;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 10);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    isInitializedRef.current = true;

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current)
        return;

      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  // Add nodes and edges to scene
  useEffect(() => {
    if (!isInitializedRef.current || !sceneRef.current || !cameraRef.current)
      return;

    const scene = sceneRef.current;
    if (layoutRevisionRef.current !== layoutRevision) {
      positionsRef.current.clear();
      hasLaidOutRef.current = false;
      layoutRevisionRef.current = layoutRevision;
    }
    const clearGraphObjects = () => {
      for (const object of graphObjectsRef.current) {
        scene.remove(object);
        disposeGraphObject(object);
      }
      graphObjectsRef.current = [];
      nodeGroupRef.current.clear();
    };

    clearGraphObjects();
    const nodeGroup = new Map<string, THREE.Mesh>();

    // Reuse positions by node ID so filtering does not move existing nodes.
    const nodes3d: Node3D[] = nodes.map((node) => ({
      node,
      position:
        positionsRef.current.get(node.id)?.clone() ??
        new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
        ),
      velocity: new THREE.Vector3(0, 0, 0),
      mass: 1,
    }));

    const shouldCenterCamera = !hasLaidOutRef.current && nodes3d.length > 0;
    if (shouldCenterCamera) {
      simulateForces(nodes3d, edges, 50);
      hasLaidOutRef.current = true;
    }

    for (const node of nodes3d) {
      positionsRef.current.set(node.node.id, node.position.clone());
    }

    // Create node meshes
    for (const node3d of nodes3d) {
      const nodeSize = 3;
      const geometry = getNodeGeometry(node3d.node.type, nodeSize);
      const color = getNodeColor(node3d.node.type);
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.4,
        emissive: color,
        emissiveIntensity: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node3d.position);
      mesh.userData = {
        nodeId: node3d.node.id,
        node: node3d.node,
      };

      scene.add(mesh);
      graphObjectsRef.current.push(mesh);
      nodeGroup.set(node3d.node.id, mesh);

      const label = createNodeLabel(node3d.node);
      label.position.set(
        node3d.position.x,
        node3d.position.y + nodeSize + 2,
        node3d.position.z,
      );
      scene.add(label);
      graphObjectsRef.current.push(label);
    }

    nodeGroupRef.current = nodeGroup;

    // Create edge lines
    const edgePositions: number[] = [];
    const edgeColors: number[] = [];

    for (const edge of edges) {
      const sourceNode = nodes3d.find((n) => n.node.id === edge.source);
      const targetNode = nodes3d.find((n) => n.node.id === edge.target);

      if (!sourceNode || !targetNode) continue;

      edgePositions.push(
        sourceNode.position.x,
        sourceNode.position.y,
        sourceNode.position.z,
        targetNode.position.x,
        targetNode.position.y,
        targetNode.position.z,
      );

      const edgeColor = getEdgeColor(edge.type);

      edgeColors.push(
        (edgeColor >> 16) & 255,
        (edgeColor >> 8) & 255,
        edgeColor & 255,
        (edgeColor >> 16) & 255,
        (edgeColor >> 8) & 255,
        edgeColor & 255,
      );
    }

    if (edgePositions.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(edgePositions), 3),
      );
      edgeGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(new Uint8Array(edgeColors), 3, true),
      );

      const edgeMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: 0.6,
      });

      const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      scene.add(edgeLines);
      graphObjectsRef.current.push(edgeLines);
    }

    // Center the camera only during the initial layout.
    if (shouldCenterCamera) {
      const boundingBox = new THREE.Box3();
      nodeGroup.forEach((mesh) => {
        boundingBox.expandByObject(mesh);
      });

      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current!.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.5;

      cameraRef.current!.position.x = center.x;
      cameraRef.current!.position.y = center.y;
      cameraRef.current!.position.z = cameraZ;
      cameraRef.current!.lookAt(center);
    }

    return clearGraphObjects;
  }, [nodes, edges, layoutRevision]);

  // Animation loop
  useEffect(() => {
    if (!isInitializedRef.current || !rendererRef.current || !sceneRef.current)
      return;

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Highlight selected node
      nodeGroupRef.current.forEach((mesh, nodeId) => {
        const material = Array.isArray(mesh.material)
          ? mesh.material[0]
          : mesh.material;
        if (nodeId === state.nodes.selectedNodeId) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.emissiveIntensity = 0.8;
          }
          mesh.scale.set(1.2, 1.2, 1.2);
        } else {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.emissiveIntensity = 0.2;
          }
          mesh.scale.set(1, 1, 1);
        }
      });

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state.nodes.selectedNodeId]);

  // Handle mouse clicks for node selection
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        return;
      }
      if (!containerRef.current || !cameraRef.current || !sceneRef.current)
        return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = (-(event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children,
      );

      for (const intersection of intersects) {
        const mesh = intersection.object as THREE.Mesh;
        if (mesh.userData.nodeId) {
          selectNode(mesh.userData.nodeId);
          openInspector("node", mesh.userData.nodeId);
          onNodeClick?.(mesh.userData.nodeId);
          break;
        }
      }
    },
    [selectNode, openInspector, onNodeClick],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      rotateRef.current = { x: event.clientX, y: event.clientY };
      hasDraggedRef.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!rotateRef.current || !sceneRef.current) return;

      const deltaX = event.clientX - rotateRef.current.x;
      const deltaY = event.clientY - rotateRef.current.y;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 6) {
        hasDraggedRef.current = true;
      }
      sceneRef.current.rotation.y += deltaX * 0.01;
      sceneRef.current.rotation.x += deltaY * 0.01;
      rotateRef.current = { x: event.clientX, y: event.clientY };
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      rotateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!cameraRef.current) return;

    event.preventDefault();
    const zoomSpeed = 0.1;
    const direction = cameraRef.current.position.clone().normalize();

    if (event.deltaY > 0) {
      cameraRef.current.position.addScaledVector(direction, zoomSpeed * 5);
    } else {
      cameraRef.current.position.addScaledVector(direction, -zoomSpeed * 5);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-900 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      onClick={handleCanvasClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(event) => event.preventDefault()}
      style={{ minHeight: "500px" }}
    >
      {/* Overlay info */}
      <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-4 py-3 rounded-lg text-sm backdrop-blur-sm pointer-events-none">
        <p className="font-mono text-xs">
          Nodes: {nodes.length} | Edges: {edges.length}
          {clusters && ` | Clusters: ${clusters.length}`}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Click to select • Scroll to zoom • Drag to rotate
        </p>
      </div>
    </div>
  );
}
