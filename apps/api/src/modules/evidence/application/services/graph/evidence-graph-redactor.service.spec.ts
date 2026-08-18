/**
 * Evidence Graph Redactor Service Tests
 *
 * Covers redaction logic for Developer scope.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import type {
  EvidenceGraphEdge,
  EvidenceGraphNode,
} from "../../contracts/evidence/evidence-graph.contract.js";
import { EvidenceGraphRedactorService } from "./evidence-graph-redactor.service.js";

describe("EvidenceGraphRedactorService", () => {
  let service: EvidenceGraphRedactorService;

  beforeEach(() => {
    service = new EvidenceGraphRedactorService();
  });

  describe("redactForDeveloper", () => {
    it("should redact file paths in nodes", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc123",
          type: "file",
          label: "login.ts",
          metadata: {
            filePath: "/src/auth/login.ts",
            severity: "HIGH",
          },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      expect(redacted[0].metadata.filePath).toBeNull();
    });

    it("should redact line numbers in nodes", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc123",
          type: "file",
          label: "login.ts",
          metadata: {
            filePath: "/src/auth/login.ts",
            lineNumber: 42,
          },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      expect(redacted[0].metadata.lineNumber).toBeNull();
    });

    it("should preserve node ID and label", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc123",
          type: "file",
          label: "login.ts",
          metadata: {
            filePath: "/src/auth/login.ts",
          },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      expect(redacted[0].id).toBe("node:file:abc123");
      expect(redacted[0].label).toBe("login.ts");
    });

    it("should preserve AI invocation nodes without file paths", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:ai:xyz789",
          type: "ai_invocation",
          label: "OPENAI (OPENAI_SDK)",
          metadata: {
            provider: "OPENAI",
            framework: "OPENAI_SDK",
          },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      expect(redacted[0].metadata.provider).toBe("OPENAI");
      expect(redacted[0].metadata.framework).toBe("OPENAI_SDK");
    });

    it("should not mutate original nodes array", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc123",
          type: "file",
          label: "login.ts",
          metadata: {
            filePath: "/src/auth/login.ts",
            lineNumber: 42,
          },
        },
      ];

      const originalPath = nodes[0].metadata.filePath;
      const originalLineNumber = nodes[0].metadata.lineNumber;

      service.redactForDeveloper(nodes, []);

      expect(nodes[0].metadata.filePath).toBe(originalPath);
      expect(nodes[0].metadata.lineNumber).toBe(originalLineNumber);
    });

    it("should handle empty node array", () => {
      const { nodes, edges } = service.redactForDeveloper([], []);

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it("should pass through edges unchanged (for now)", () => {
      const edges: EvidenceGraphEdge[] = [
        {
          id: "edge:abc",
          source: "node:1",
          target: "node:2",
          type: "call",
          metadata: {},
        },
      ];

      const { edges: redacted } = service.redactForDeveloper([], edges);

      expect(redacted[0].id).toBe("edge:abc");
      expect(redacted[0].type).toBe("call");
    });

    it("should redact cluster file paths", () => {
      const clusters = [
        {
          id: "cluster:abc",
          type: "file" as const,
          label: "auth",
          findingCount: 5,
          severityDistribution: { HIGH: 1, MEDIUM: 2, LOW: 2 },
          nodeIds: ["node:1"],
          metadata: { filePath: "/src/auth" },
        },
      ];

      const { clusters: redacted } = service.redactForDeveloper(
        [],
        [],
        clusters,
      );

      expect(redacted?.[0].metadata.filePath).toBeNull();
    });

    it("should handle multiple nodes", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:1",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
        },
        {
          id: "node:file:2",
          type: "file",
          label: "logout.ts",
          metadata: { filePath: "/src/auth/logout.ts", lineNumber: 100 },
        },
        {
          id: "node:ai:1",
          type: "ai_invocation",
          label: "OPENAI",
          metadata: { provider: "OPENAI" },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      // File nodes redacted
      expect(redacted[0].metadata.filePath).toBeNull();
      expect(redacted[1].metadata.filePath).toBeNull();
      expect(redacted[1].metadata.lineNumber).toBeNull();
      // AI node unchanged
      expect(redacted[2].metadata.provider).toBe("OPENAI");
    });
  });

  describe("isRedacted", () => {
    it("should return true if both filePath and lineNumber are null", () => {
      const node: EvidenceGraphNode = {
        id: "node:file:abc",
        type: "file",
        label: "login.ts",
        metadata: {
          filePath: null,
          lineNumber: null,
        },
      };

      expect(service.isRedacted(node)).toBe(true);
    });

    it("should return false if filePath is not null", () => {
      const node: EvidenceGraphNode = {
        id: "node:file:abc",
        type: "file",
        label: "login.ts",
        metadata: {
          filePath: "/src/auth/login.ts",
          lineNumber: null,
        },
      };

      expect(service.isRedacted(node)).toBe(false);
    });

    it("should return false if lineNumber is not null", () => {
      const node: EvidenceGraphNode = {
        id: "node:file:abc",
        type: "file",
        label: "login.ts",
        metadata: {
          filePath: null,
          lineNumber: 42,
        },
      };

      expect(service.isRedacted(node)).toBe(false);
    });

    it("should handle AI nodes without file paths", () => {
      const node: EvidenceGraphNode = {
        id: "node:ai:xyz",
        type: "ai_invocation",
        label: "OPENAI",
        metadata: {
          provider: "OPENAI",
        },
      };

      // AI nodes don't have filePath/lineNumber, so should be considered redacted
      expect(service.isRedacted(node)).toBe(true);
    });
  });

  describe("immutability", () => {
    it("should not modify original node metadata object", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc",
          type: "file",
          label: "login.ts",
          metadata: {
            filePath: "/src/auth/login.ts",
            lineNumber: 42,
          },
        },
      ];

      const originalMetadata = { ...nodes[0].metadata };
      service.redactForDeveloper(nodes, []);

      expect(nodes[0].metadata).toEqual(originalMetadata);
    });

    it("should return new array instances", () => {
      const nodes: EvidenceGraphNode[] = [
        {
          id: "node:file:abc",
          type: "file",
          label: "login.ts",
          metadata: { filePath: "/src/auth/login.ts" },
        },
      ];

      const { nodes: redacted } = service.redactForDeveloper(nodes, []);

      expect(redacted).not.toBe(nodes);
      expect(redacted[0]).not.toBe(nodes[0]);
    });
  });
});
