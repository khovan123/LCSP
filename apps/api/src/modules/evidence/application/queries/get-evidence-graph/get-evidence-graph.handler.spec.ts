/**
 * GetEvidenceGraph Query Handler Tests
 *
 * Covers query validation, PBAC enforcement, redaction flow, and audit logging.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { ArtifactStorageService } from "../../../../../platform/storage/artifact-storage.service.js";
import { ClusterBuilderService } from "../../services/graph/cluster-builder.service.js";
import { EvidenceGraphMapperService } from "../../services/graph/evidence-graph-mapper.service.js";
import { EvidenceGraphRedactorService } from "../../services/graph/evidence-graph-redactor.service.js";
import { GetEvidenceGraphHandler } from "./get-evidence-graph.handler.js";
import { GetEvidenceGraphQuery } from "./get-evidence-graph.query.js";

/**
 * Mock implementations for testing.
 */

const createMockPrisma = () => ({
  technicalEvidenceReport: {
    findFirst: jest.fn(),
  },
});

const createMockAudit = () => ({
  write: jest.fn().mockResolvedValue(undefined),
});

const authClusterId = `cluster:${createHash("sha256")
  .update("/src/auth")
  .digest("hex")
  .substring(0, 12)}`;
describe("GetEvidenceGraphHandler", () => {
  let handler: GetEvidenceGraphHandler;
  let prisma: ReturnType<typeof createMockPrisma>;
  let mapper: EvidenceGraphMapperService;
  let redactor: EvidenceGraphRedactorService;
  let clusterBuilder: ClusterBuilderService;
  let audit: ReturnType<typeof createMockAudit>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mapper = new EvidenceGraphMapperService();
    redactor = new EvidenceGraphRedactorService();
    clusterBuilder = new ClusterBuilderService();
    audit = createMockAudit();

    handler = new GetEvidenceGraphHandler(
      prisma as unknown as PrismaService,
      mapper,
      redactor,
      clusterBuilder,
      audit as unknown as AuditWriterService,
    );
  });

  describe("query validation", () => {
    it("should reject invalid scope parameter", async () => {
      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "invalid-scope" as "overview",
        undefined,
        "corr-123",
      );

      await expect(handler.execute(query)).rejects.toThrow();
    });

    it("should accept overview scope", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result).toBeDefined();
      expect(result.meta.scope).toBe("overview");
    });

    it("should accept detail scope with clusterId", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "detail",
        authClusterId,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.meta.scope).toBe("detail");
    });

    it("should reject detail scope without clusterId", async () => {
      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "detail",
        undefined, // Missing clusterId
        "corr-123",
      );

      await expect(handler.execute(query)).rejects.toThrow();
    });

    it("should reject detail scope with an unknown clusterId", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "detail",
        "cluster:missing",
        "corr-123",
      );

      await expect(handler.execute(query)).rejects.toThrow();
    });
  });

  describe("evidence report fetching", () => {
    it("reads and maps a valid worker evidence graph artifact", async () => {
      const storagePath = path.join(
        process.cwd(),
        "tmp",
        "evidence-graph-handler-test",
      );
      const storageKey = "graphs/user-1/assessment-1/graph-1.json";
      const graph = {
        schema_version: "1",
        snapshot_id: "snapshot-1",
        commit_sha: "commit-1",
        nodes: [
          {
            node_id: "worker:file:1",
            node_type: "FILE",
            label: "app.ts",
            source: { file_path: "src/app.ts", start_line: 12 },
            evidence_refs: ["evidence:1"],
          },
        ],
        edges: [],
        source_anchors: [],
        indexes: {},
        unresolved_frontiers: [],
        coverage_state: "COMPLETE",
        coverage_notes: [],
        provenance: {},
        evidence_refs: ["evidence:1"],
      };
      const graphHash = `sha256:${createHash("sha256")
        .update(canonicalJson(graph))
        .digest("hex")}`;
      const artifact = { ...graph, graph_hash: graphHash };
      const artifactPath = path.join(storagePath, storageKey);
      const previousStoragePath = process.env.LCSP_ARTIFACT_STORAGE_PATH;

      process.env.LCSP_ARTIFACT_STORAGE_PATH = storagePath;
      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, JSON.stringify(artifact), "utf8");

      try {
        prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
          id: "report-1",
          assessmentId: "assessment-1",
          organizationId: "org-1",
          evidencePayload: {
            evidence_graph: { evidence_graph_ref: storageKey },
          },
          createdAt: new Date(),
        });
        handler = new GetEvidenceGraphHandler(
          prisma as unknown as PrismaService,
          mapper,
          redactor,
          clusterBuilder,
          audit as unknown as AuditWriterService,
          new ArtifactStorageService(),
        );

        const result = await handler.execute(
          new GetEvidenceGraphQuery(
            "assessment-1",
            "org-1",
            "user-1",
            "MANAGER",
            "overview",
            undefined,
            "corr-123",
          ),
        );

        expect(result.meta.source).toBe("WORKER_ARTIFACT");
        expect(result.nodes).toEqual([
          expect.objectContaining({
            id: "worker:file:1",
            type: "file",
            label: "app.ts",
          }),
        ]);
        expect(result.edges).toEqual([]);
      } finally {
        fs.rmSync(storagePath, { recursive: true, force: true });
        if (previousStoragePath === undefined) {
          delete process.env.LCSP_ARTIFACT_STORAGE_PATH;
        } else {
          process.env.LCSP_ARTIFACT_STORAGE_PATH = previousStoragePath;
        }
      }
    });

    it("should fetch TechnicalEvidenceReport for assessment and org", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      await handler.execute(query);

      expect(prisma.technicalEvidenceReport.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assessmentId: "assessment-1",
            organizationId: "org-1",
          }),
        }),
      );
    });

    it("should throw NOT_FOUND if evidence report not found", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue(null);

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      await expect(handler.execute(query)).rejects.toThrow();

      // Should audit the denied access
      expect(audit.write).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "DENY",
          result: "EVIDENCE_NOT_FOUND",
        }),
      );
    });

    it("should enforce org isolation", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue(null);

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1", // Requesting org-1
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      // Prisma findFirst should be called with org-1, and it returns null
      // (evidence from different org not accessible)
      await expect(handler.execute(query)).rejects.toThrow();

      expect(prisma.technicalEvidenceReport.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
          }),
        }),
      );
    });
  });

  describe("PBAC & redaction", () => {
    it("should not redact for Manager scope", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      // Manager should see file paths
      const fileNode = result.nodes.find((n) => n.type === "file");
      expect(fileNode?.metadata.filePath).toBe("/src/auth/login.ts");
    });

    it("should redact file paths for Developer scope", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
              line_number: 42,
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "DEVELOPER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      // Developer should NOT see file paths or line numbers
      const fileNode = result.nodes.find((n) => n.type === "file");
      expect(fileNode?.metadata.filePath).toBeNull();
      expect(fileNode?.metadata.lineNumber).toBeNull();
    });

    it("should flag redactedForDeveloper in response", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "DEVELOPER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.meta.redactedForDeveloper).toBe(true);
    });
  });

  describe("graph transformation", () => {
    it("should include nodes in response", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.nodes).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it("should include edges in response", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "GOOGLE",
              file_path: "/src/auth/logout.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.edges).toBeDefined();
      expect(Array.isArray(result.edges)).toBe(true);
    });

    it("should include clusters for overview scope", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.clusters).toBeDefined();
      expect(Array.isArray(result.clusters)).toBe(true);
    });

    it("should exclude clusters for detail scope", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "detail",
        authClusterId,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.clusters).toBeUndefined();
    });
  });

  describe("response envelope", () => {
    it("should include meta information", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.meta).toBeDefined();
      expect(result.meta.scope).toBe("overview");
      expect(result.meta.assessmentId).toBe("assessment-1");
      expect(result.meta.artifactVersion).toBe("report-1");
      expect(result.meta.generatedAt).toBeDefined();
      expect(result.meta.totalFindingCount).toBeDefined();
    });

    it("should include correlationId for tracing", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      expect(result.correlationId).toBe("corr-123");
    });

    it("should calculate totalFindingCount from nodes", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      const result = await handler.execute(query);

      // Should reflect aggregated finding count from all nodes
      expect(result.meta.totalFindingCount).toBeGreaterThan(0);
    });
  });

  describe("audit logging", () => {
    it("should audit successful access", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: { ai_usage_signals: [] },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      await handler.execute(query);

      expect(audit.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-1",
          decision: "ALLOW",
          correlationId: "corr-123",
        }),
      );
    });

    it("should audit denied access when report not found", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue(null);

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "overview",
        undefined,
        "corr-123",
      );

      await expect(handler.execute(query)).rejects.toThrow();

      expect(audit.write).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "DENY",
          result: "EVIDENCE_NOT_FOUND",
        }),
      );
    });

    it("should include metadata in audit log", async () => {
      prisma.technicalEvidenceReport.findFirst.mockResolvedValue({
        id: "report-1",
        assessmentId: "assessment-1",
        organizationId: "org-1",
        evidencePayload: {
          ai_usage_signals: [
            {
              signal_type: "PROVIDER_INVOCATION",
              provider: "OPENAI",
              file_path: "/src/auth/login.ts",
            },
          ],
        },
        createdAt: new Date(),
      });

      const query = new GetEvidenceGraphQuery(
        "assessment-1",
        "org-1",
        "user-1",
        "MANAGER",
        "detail",
        authClusterId,
        "corr-123",
      );

      await handler.execute(query);

      expect(audit.write).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            scope: "detail",
            clusterId: authClusterId,
            nodeCount: expect.any(Number),
            edgeCount: expect.any(Number),
          }),
        }),
      );
    });
  });
});

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
