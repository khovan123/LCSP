/**
 * Evidence Graph Mapper Service Tests
 *
 * Covers node extraction, edge inference, and deterministic hashing.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import { EvidenceGraphMapperService } from "./evidence-graph-mapper.service.js";

describe("EvidenceGraphMapperService", () => {
  let service: EvidenceGraphMapperService;

  beforeEach(() => {
    service = new EvidenceGraphMapperService();
  });

  describe("mapGraphFromPayload", () => {
    it("should transform empty payload into empty graph", () => {
      const payload = {};
      const result = service.mapGraphFromPayload(payload, "overview");

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it("should create AI invocation nodes from signals", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            framework: "OPENAI_SDK",
            confidence: "HIGH",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
            framework: "VERTEXAI",
            confidence: "MEDIUM",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const aiNodes = result.nodes.filter((n) => n.type === "ai_invocation");

      expect(aiNodes).toHaveLength(2);
      expect(aiNodes.map((node) => node.label)).toEqual(
        expect.arrayContaining(["OPENAI (OPENAI_SDK)", "GOOGLE (VERTEXAI)"]),
      );
    });

    it("should aggregate multiple signals for same provider into one node", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            framework: "OPENAI_SDK",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            framework: "OPENAI_SDK",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            framework: "OPENAI_SDK",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const aiNodes = result.nodes.filter((n) => n.type === "ai_invocation");

      expect(aiNodes).toHaveLength(1);
      expect(aiNodes[0].metadata.findingCount).toBe(3);
    });

    it("should create file nodes from signal file paths", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
            line_number: 42,
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/utils/helpers.ts",
            line_number: 10,
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const fileNodes = result.nodes.filter((n) => n.type === "file");

      expect(fileNodes).toHaveLength(2);
      expect(fileNodes[0].label).toBe("login.ts");
      expect(fileNodes[1].label).toBe("helpers.ts");
    });

    it("should assign cluster reference to file nodes", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const fileNodes = result.nodes.filter((n) => n.type === "file");

      expect(fileNodes[0].cluster).toBeDefined();
      expect(fileNodes[0].cluster).toMatch(/^cluster:/);
    });

    it("should create dependency nodes from SBOM entries", () => {
      const payload = {
        sbom_entries: [
          { name: "lodash", version: "4.17.21", type: "package" },
          { name: "express", version: "4.18.0", type: "package" },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const depNodes = result.nodes.filter((n) => n.type === "dependency");

      expect(depNodes).toHaveLength(2);
      expect(depNodes[0].label).toBe("lodash@4.17.21");
      expect(depNodes[1].label).toBe("express@4.18.0");
    });

    it("should infer edges from AI signal sequence", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
            file_path: "/src/utils/verify.ts",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");

      // Should have at least one edge (AI to file, or AI to AI)
      expect(result.edges.length).toBeGreaterThan(0);
    });

    it("should sort nodes deterministically", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "ANTHROPIC",
          },
        ],
      };

      const result1 = service.mapGraphFromPayload(payload, "overview");
      const result2 = service.mapGraphFromPayload(payload, "overview");

      // Node order must be identical across calls
      expect(result1.nodes.map((n) => n.id)).toEqual(
        result2.nodes.map((n) => n.id),
      );
    });

    it("should respect detail scope with clusterId filter", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
            file_path: "/src/utils/helpers.ts",
          },
        ],
      };

      // First get overview to get cluster IDs
      const overview = service.mapGraphFromPayload(payload, "overview");
      const firstClusterId = overview.nodes.find((n) => n.cluster)?.cluster;

      if (firstClusterId) {
        // Now filter by that cluster in detail scope
        const detail = service.mapGraphFromPayload(
          payload,
          "detail",
          firstClusterId,
        );

        // All returned nodes must be in this cluster
        const nonClusteredNodes = detail.nodes.filter(
          (n) => n.cluster && n.cluster !== firstClusterId,
        );
        expect(nonClusteredNodes).toHaveLength(0);
      }
    });

    it("should only return edges whose endpoints remain in the detail cluster", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
            file_path: "/src/utils/helpers.ts",
          },
        ],
      };

      const overview = service.mapGraphFromPayload(payload, "overview");
      const clusterId = overview.nodes.find((node) => node.cluster)?.cluster;
      expect(clusterId).toBeDefined();

      const detail = service.mapGraphFromPayload(payload, "detail", clusterId);
      const nodeIds = new Set(detail.nodes.map((node) => node.id));

      expect(
        detail.edges.every(
          (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
        ),
      ).toBe(true);
    });

    it("should map confidence to severity correctly", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            confidence: "HIGH",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
            confidence: "MEDIUM",
          },
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "ANTHROPIC",
            confidence: "LOW",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const aiNodes = result.nodes.filter((n) => n.type === "ai_invocation");

      // HIGH confidence should map to MEDIUM severity
      expect(
        aiNodes.find((node) => node.metadata.provider === "OPENAI")?.metadata
          .severity,
      ).toBe("MEDIUM");
      // MEDIUM/LOW confidence should map to LOW severity
      expect(
        aiNodes.find((node) => node.metadata.provider === "GOOGLE")?.metadata
          .severity,
      ).toBe("LOW");
      expect(
        aiNodes.find((node) => node.metadata.provider === "ANTHROPIC")?.metadata
          .severity,
      ).toBe("LOW");
    });

    it("should preserve file metadata (path, line number)", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
            line_number: 42,
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const fileNode = result.nodes.find((n) => n.type === "file");

      expect(fileNode?.metadata.filePath).toBe("/src/auth/login.ts");
      expect(fileNode?.metadata.lineNumber).toBe(42);
    });

    it("should handle signals without providers gracefully", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            // No provider field
            file_path: "/src/auth/login.ts",
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");

      // Should still create file node, but AI node may be skipped
      const fileNodes = result.nodes.filter((n) => n.type === "file");
      expect(fileNodes.length).toBeGreaterThan(0);
    });

    it("should include dependency nodes in graph", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
          },
        ],
        sbom_entries: [{ name: "lodash", version: "4.17.21" }],
      };

      const result = service.mapGraphFromPayload(payload, "overview");

      expect(result.nodes.some((n) => n.type === "dependency")).toBe(true);
    });
  });

  describe("mapGraphFromWorkerArtifact", () => {
    it("maps worker nodes and edges into the UI graph contract", () => {
      const result = service.mapGraphFromWorkerArtifact({
        nodes: [
          {
            node_id: "worker:file:1",
            node_type: "FILE",
            label: "app.ts",
            source: { file_path: "src/app.ts", start_line: 12 },
            evidence_refs: ["evidence:1"],
          },
          {
            node_id: "worker:ai:1",
            node_type: "AI_MODEL_INVOCATION",
            label: "OpenAI",
            attributes: { provider: "OPENAI" },
          },
        ],
        edges: [
          {
            edge_id: "worker:edge:1",
            edge_type: "CALLS",
            source_node_id: "worker:file:1",
            target_node_id: "worker:ai:1",
          },
        ],
      });

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes.find((node) => node.id === "worker:ai:1")?.type).toBe(
        "ai_invocation",
      );
      expect(result.edges).toEqual([
        expect.objectContaining({
          id: "worker:edge:1",
          type: "call",
          source: "worker:file:1",
          target: "worker:ai:1",
        }),
      ]);
    });
  });

  describe("hash determinism", () => {
    it("should produce identical node IDs for identical input", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            framework: "OPENAI_SDK",
            file_path: "/src/auth/login.ts",
          },
        ],
      };

      const result1 = service.mapGraphFromPayload(payload, "overview");
      const result2 = service.mapGraphFromPayload(payload, "overview");

      const ids1 = result1.nodes.map((n) => n.id).sort();
      const ids2 = result2.nodes.map((n) => n.id).sort();

      expect(ids1).toEqual(ids2);
    });

    it("should produce different node IDs for different providers", () => {
      const payload1 = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
          },
        ],
      };

      const payload2 = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "GOOGLE",
          },
        ],
      };

      const result1 = service.mapGraphFromPayload(payload1, "overview");
      const result2 = service.mapGraphFromPayload(payload2, "overview");

      const id1 = result1.nodes[0]?.id;
      const id2 = result2.nodes[0]?.id;

      expect(id1).not.toEqual(id2);
    });

    it("should produce different node IDs for different file paths", () => {
      const payload1 = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/login.ts",
          },
        ],
      };

      const payload2 = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: "/src/auth/logout.ts",
          },
        ],
      };

      const result1 = service.mapGraphFromPayload(payload1, "overview");
      const result2 = service.mapGraphFromPayload(payload2, "overview");

      const fileId1 = result1.nodes.find((n) => n.type === "file")?.id;
      const fileId2 = result2.nodes.find((n) => n.type === "file")?.id;

      expect(fileId1).not.toEqual(fileId2);
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined confidence gracefully", () => {
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            confidence: undefined,
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const node = result.nodes[0];

      // Should not crash; confidence should be undefined or default
      expect(node).toBeDefined();
    });

    it("should handle SBOM entries without version", () => {
      const payload = {
        sbom_entries: [{ name: "lodash" }],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const depNode = result.nodes.find((n) => n.type === "dependency");

      expect(depNode?.label).toBe("lodash");
    });

    it("should handle very long file paths", () => {
      const longPath = `/src/${"nested/".repeat(50)}file.ts`;
      const payload = {
        ai_usage_signals: [
          {
            signal_type: "PROVIDER_INVOCATION",
            provider: "OPENAI",
            file_path: longPath,
          },
        ],
      };

      const result = service.mapGraphFromPayload(payload, "overview");
      const fileNode = result.nodes.find((n) => n.type === "file");

      expect(fileNode).toBeDefined();
      expect(fileNode?.label).toBe("file.ts");
    });
  });
});
