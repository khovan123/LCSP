/**
 * Cluster Builder Service Tests
 *
 * Covers node aggregation, severity distribution, and cluster metadata.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import type { EvidenceGraphNode } from "../../contracts/evidence/evidence-graph.contract.js";
import { ClusterBuilderService } from "./cluster-builder.service.js";

describe("ClusterBuilderService", () => {
  const severities = ["HIGH", "MEDIUM", "LOW"] as const;
  let service: ClusterBuilderService;

  beforeEach(() => {
    service = new ClusterBuilderService();
  });

  describe("buildClusters", () => {
    it("should return empty array for nodes without clusters", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:ai:abc",
          type: "ai_invocation",
          label: "OPENAI",
          metadata: { provider: "OPENAI" },
          // No cluster reference
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters).toHaveLength(0);
    });

    it("should aggregate nodes by cluster", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts", severity: "HIGH" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "logout.ts",
          metadata: { filePath: "/src/auth/logout.ts", severity: "MEDIUM" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:3",
          type: "file",
          label: "helpers.ts",
          metadata: { filePath: "/src/utils/helpers.ts", severity: "LOW" },
          cluster: "cluster:utils",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters).toHaveLength(2);
      // Auth cluster should have 2 nodes
      const authCluster = clusters.find((c) => c.id === "cluster:auth");
      expect(authCluster?.nodeIds).toHaveLength(2);
      // Utils cluster should have 1 node
      const utilsCluster = clusters.find((c) => c.id === "cluster:utils");
      expect(utilsCluster?.nodeIds).toHaveLength(1);
    });

    it("should compute severity distribution", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts", severity: "HIGH" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "logout.ts",
          metadata: { filePath: "/src/auth/logout.ts", severity: "HIGH" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:3",
          type: "file",
          label: "password.ts",
          metadata: { filePath: "/src/auth/password.ts", severity: "MEDIUM" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:4",
          type: "file",
          label: "reset.ts",
          metadata: { filePath: "/src/auth/reset.ts", severity: "LOW" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});
      const authCluster = clusters[0];

      expect(authCluster.severityDistribution).toEqual({
        HIGH: 2,
        MEDIUM: 1,
        LOW: 1,
      });
    });

    it("should set finding count equal to node count", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "logout.ts",
          metadata: { filePath: "/src/auth/logout.ts" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters[0].findingCount).toBe(2);
    });

    it("should extract cluster label from file path", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      // Label should be extracted from directory (auth) not filename
      expect(clusters[0].label).toBe("auth");
    });

    it("should infer cluster type from file path", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "utils",
          metadata: { filePath: "/src/utils" },
          cluster: "cluster:utils",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      const authCluster = clusters.find((c) => c.id === "cluster:auth");
      const utilsCluster = clusters.find((c) => c.id === "cluster:utils");

      expect(authCluster?.type).toBe("file");
      expect(utilsCluster?.type).toBe("module");
    });

    it("should preserve file path in cluster metadata", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters[0].metadata.filePath).toBe("/src/auth/login.ts");
    });

    it("should sort clusters deterministically", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/zebra/login.ts" },
          cluster: "cluster:zzz",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "helpers.ts",
          metadata: { filePath: "/src/auth/helpers.ts" },
          cluster: "cluster:aaa",
        },
        {
          id: "node:file:3",
          type: "file",
          label: "utils.ts",
          metadata: { filePath: "/src/utils/utils.ts" },
          cluster: "cluster:mmm",
        },
      ];

      const result1 = service.buildClusters(nodes, {});
      const result2 = service.buildClusters(nodes, {});

      // Cluster order must be identical
      expect(result1.map((c) => c.id)).toEqual(result2.map((c) => c.id));
      // Should be sorted by ID
      expect(result1[0].id).toBe("cluster:aaa");
      expect(result1[1].id).toBe("cluster:mmm");
      expect(result1[2].id).toBe("cluster:zzz");
    });

    it("should handle nodes without severity gracefully", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      // Should default severity counts to 0
      expect(clusters[0].severityDistribution).toEqual({
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
    });

    it("should collect all node IDs in cluster", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth",
        },
        {
          id: "node:file:2",
          type: "file",
          label: "logout.ts",
          metadata: { filePath: "/src/auth/logout.ts" },
          cluster: "cluster:auth",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters[0].nodeIds).toContain("node:file:1");
      expect(clusters[0].nodeIds).toContain("node:file:2");
    });

    it("should handle multiple calls consistently", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts", severity: "HIGH" },
          cluster: "cluster:auth",
        },
      ];

      const result1 = service.buildClusters(nodes, {});
      const result2 = service.buildClusters(nodes, {});
      const result3 = service.buildClusters(nodes, {});

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe("edge cases", () => {
    it("should handle empty nodes array", () => {
      const clusters = service.buildClusters([], {});

      expect(clusters).toHaveLength(0);
    });

    it("should handle very deep file paths", () => {
      const deepPath = `/src/${"dir/".repeat(20)}file.ts`;
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "file.ts",
          metadata: { filePath: deepPath },
          cluster: "cluster:deep",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters).toHaveLength(1);
      expect(clusters[0].metadata.filePath).toBe(deepPath);
    });

    it("should handle nodes with many severity levels", () => {
      const nodes: EvidenceGraphNode[] = Array.from({ length: 100 }).map(
        (_, i) => ({
          id: `node:file:${i}`,
          type: "file" as const,
          label: `file${i}.ts`,
          metadata: {
            filePath: `/src/auth/file${i}.ts`,
            severity: severities[i % severities.length],
          },
          cluster: "cluster:auth",
        }),
      );

      const clusters = service.buildClusters(nodes, {});

      expect(clusters[0].severityDistribution.HIGH).toBe(34);
      expect(clusters[0].severityDistribution.MEDIUM).toBe(33);
      expect(clusters[0].severityDistribution.LOW).toBe(33);
    });

    it("should handle cluster ID with special characters", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
          cluster: "cluster:auth-utils_2.0",
        },
      ];

      const clusters = service.buildClusters(nodes, {});

      expect(clusters[0].id).toBe("cluster:auth-utils_2.0");
    });
  });
});
