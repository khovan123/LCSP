import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { InternalEvidenceController } from "./evidence.controller.js";

function buildController() {
  const technicalEvidenceReportFindUnique = jest.fn();
  const technicalProfileFindUnique = jest.fn();
  const commandBus = { execute: jest.fn() };
  const prisma = {
    technicalEvidenceReport: { findUnique: technicalEvidenceReportFindUnique },
    technicalProfile: { findUnique: technicalProfileFindUnique },
  } as unknown as PrismaService;

  return {
    controller: new InternalEvidenceController(
      commandBus as never,
      prisma,
    ),
    technicalEvidenceReportFindUnique,
    technicalProfileFindUnique,
  };
}

describe("InternalEvidenceController runtime reads", () => {
  it("returns the accepted evidence report in worker snake_case shape", async () => {
    const { controller, technicalEvidenceReportFindUnique } = buildController();
    technicalEvidenceReportFindUnique.mockResolvedValue({
      id: "report-1",
      scanJobId: "scan-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      snapshotId: "snapshot-1",
      toolsVersion: { semgrep: "1.0" },
      configHash: { semgrep: "sha256:test" },
      evidencePayload: { technical_findings: [] },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      schemaVersion: "1.0.0",
      status: "ACCEPTED",
      rejectionReason: null,
      createdAt: new Date("2026-08-08T00:00:00.000Z"),
    });

    const result = await controller.getTechnicalEvidenceReport("report-1");

    expect(technicalEvidenceReportFindUnique).toHaveBeenCalledWith({
      where: { id: "report-1" },
      select: expect.objectContaining({
        id: true,
        evidencePayload: true,
        privacyFlags: true,
        status: true,
      }),
    });
    expect(result).toMatchObject({
      id: "report-1",
      scan_job_id: "scan-1",
      assessment_id: "assessment-1",
      organization_id: "org-1",
      snapshot_id: "snapshot-1",
      evidence_payload: { technical_findings: [] },
      privacy_flags: { containsSourceCode: false, secretsRedacted: true },
      schema_version: "1.0.0",
      status: "accepted",
    });
  });

  it("flattens profileData while keeping persisted identifiers authoritative", async () => {
    const { controller, technicalProfileFindUnique } = buildController();
    technicalProfileFindUnique.mockResolvedValue({
      id: "profile-1",
      evidenceReportId: "report-1",
      assessmentId: "assessment-1",
      organizationId: "org-1",
      schemaVersion: "1.0.0",
      providerVersion: "technical-profile-worker@1",
      profileData: {
        id: "spoofed-id",
        assessment_id: "spoofed-assessment",
        ai_detected: "confirmed",
        dependency_ai_packages: ["openai"],
      },
      privacyFlags: { containsSourceCode: false, secretsRedacted: true },
      status: "ACCEPTED",
      rejectionReason: null,
      createdAt: new Date("2026-08-08T00:00:00.000Z"),
    });

    const result = await controller.getTechnicalProfile("profile-1");

    expect(result).toMatchObject({
      id: "profile-1",
      technical_profile_id: "profile-1",
      evidence_report_id: "report-1",
      assessment_id: "assessment-1",
      organization_id: "org-1",
      ai_detected: "confirmed",
      dependency_ai_packages: ["openai"],
      privacy_flags: { containsSourceCode: false, secretsRedacted: true },
      status: "accepted",
    });
  });

  it("returns 404 for missing worker artifacts", async () => {
    const {
      controller,
      technicalEvidenceReportFindUnique,
      technicalProfileFindUnique,
    } = buildController();
    technicalEvidenceReportFindUnique.mockResolvedValue(null);
    technicalProfileFindUnique.mockResolvedValue(null);

    await expect(
      controller.getTechnicalEvidenceReport("missing-report"),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      controller.getTechnicalProfile("missing-profile"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
