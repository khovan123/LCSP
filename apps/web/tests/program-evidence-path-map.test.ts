import { test } from "node:test";
import assert from "node:assert/strict";

import {
  selectEvidenceTopology,
  zoomAtPoint,
} from "../src/features/assessment-runtime/utils/program-evidence-path-map";

const node = (id: string, kind: string) => ({
  id,
  kind,
  label: id,
  symbol: null,
  file: null,
  line: null,
});

test("graph-first topology preserves branching, cross-links, and edge direction", () => {
  const nodes = [
    node("a", "HTTP_ROUTE"),
    node("b", "FUNCTION"),
    node("c", "AI_PROVIDER"),
    node("d", "AI_MODEL_INVOCATION"),
    node("noise", "MODULE"),
  ];
  const edges = [
    { id: "e1", source: "a", target: "b", relationship: "CALLS" },
    { id: "e2", source: "a", target: "c", relationship: "SENDS_TO_AI" },
    { id: "e3", source: "c", target: "d", relationship: "INVOKES_BOUNDARY" },
  ];
  const topology = selectEvidenceTopology(nodes, edges);
  assert.deepEqual(
    topology.edges.map((edge) => [edge.source, edge.target]),
    [
      ["a", "b"],
      ["a", "c"],
      ["c", "d"],
    ],
  );
  assert.equal(
    topology.nodes.some((item) => item.id === "noise"),
    true,
  );
  assert.equal(topology.positions.size, 5);
});

test("preserves the complete bounded API topology without a second UI cap", () => {
  const nodes = Array.from({ length: 40 }, (_, index) =>
    node(`node-${index}`, index === 0 ? "HTTP_ROUTE" : "FUNCTION"),
  );
  const edges = Array.from({ length: 39 }, (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    relationship: "CALLS",
  }));
  const topology = selectEvidenceTopology(nodes, edges);
  assert.equal(topology.nodes.length, 40);
  assert.equal(topology.edges.length, 39);
});

test("keeps the scene point under the cursor while zooming", () => {
  const before = { zoom: 1, pan: { x: 100, y: 80 } };
  const point = { x: 400, y: 300 };
  const after = zoomAtPoint(before, point, 2);
  assert.equal(
    (point.x - before.pan.x) / before.zoom,
    (point.x - after.pan.x) / after.zoom,
  );
  assert.equal(
    (point.y - before.pan.y) / before.zoom,
    (point.y - after.pan.y) / after.zoom,
  );
});
