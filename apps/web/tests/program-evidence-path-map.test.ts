import { test } from "node:test";
import assert from "node:assert/strict";

import { selectEvidencePathNodes, selectEvidencePaths } from "../src/features/assessment-runtime/utils/program-evidence-path-map";

const node = (id: string, kind: string) => ({ id, kind, label: id, symbol: null, file: null, line: null });

test("selects a deterministic bounded path and retains AI/provider boundaries", () => {
  const nodes = [node("noise", "MODULE"), node("route", "HTTP_ROUTE"), node("fn", "FUNCTION"), node("provider", "AI_PROVIDER"), node("extra", "CLASS")];
  const edges = [
    { id: "e1", source: "route", target: "fn", relationship: "CALLS" },
    { id: "e2", source: "fn", target: "provider", relationship: "SENDS_TO_AI" },
  ];
  const first = selectEvidencePathNodes(nodes, edges, 3).map((item) => item.id);
  const second = selectEvidencePathNodes(nodes, edges, 3).map((item) => item.id);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.ok(first.includes("provider"));
  assert.ok(!first.includes("noise"));
});

test("does not fabricate nodes when the graph has no connected path", () => {
  const result = selectEvidencePathNodes([node("route", "HTTP_ROUTE")], [], 12);
  assert.deepEqual(result.map((item) => item.id), ["route"]);
});

test("returns connected canonical paths with relationship labels and bounded output", () => {
  const nodes = [node("route", "HTTP_ROUTE"), node("fn", "FUNCTION"), node("ai", "AI_MODEL_INVOCATION"), node("provider", "AI_PROVIDER"), node("noise", "MODULE")];
  const edges = [
    { id: "e1", source: "route", target: "fn", relationship: "CALLS" },
    { id: "e2", source: "fn", target: "ai", relationship: "SENDS_TO_AI" },
    { id: "e3", source: "ai", target: "provider", relationship: "INVOKES_BOUNDARY" },
  ];
  const paths = selectEvidencePaths(nodes, edges, 1, 4);
  assert.equal(paths.length, 1);
  assert.deepEqual(paths[0].nodes.map((item) => item.id), ["route", "fn", "ai", "provider"]);
  assert.deepEqual(paths[0].edges.map((item) => item.relationship), ["CALLS", "SENDS_TO_AI", "INVOKES_BOUNDARY"]);
  assert.ok(!paths[0].nodes.some((item) => item.id === "noise"));
});
