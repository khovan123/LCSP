import { describe, expect, it, jest } from "@jest/globals";
import { ADMIN_OVERVIEW_PERIODS } from "@lcsp/contracts/auth";

import { AdminOverviewService } from "./admin-overview.service.js";

describe("AdminOverviewService", () => {
  const fixedNow = new Date("2026-09-11T12:00:00.000Z");

  const mockPrisma = {
    user: {
      count: jest.fn<() => Promise<number>>(),
      findMany: jest.fn<() => Promise<Array<{ id: string; email: string; displayName: string | null }>>>(),
    },
    accountInvitation: {
      count: jest.fn<() => Promise<number>>(),
    },
    assessment: {
      count: jest.fn<() => Promise<number>>(),
      findMany: jest.fn<() => Promise<Array<{ createdAt: Date; status: string; updatedAt: Date }>>>(),
    },
    legalCorpusVersion: {
      findFirst: jest.fn<() => Promise<any>>(),
    },
    auditEvent: {
      findMany: jest.fn<() => Promise<Array<any>>>(),
    },
  };

  const service = new AdminOverviewService(mockPrisma as any);

  it("calculates metrics for 30D period with accurate percentages and audit-safe events", async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(842) // active users
      .mockResolvedValueOnce(34) // suspended users
      .mockResolvedValueOnce(38); // period new users

    mockPrisma.accountInvitation.count
      .mockResolvedValueOnce(64) // pending invitations
      .mockResolvedValueOnce(0); // period new invitations

    mockPrisma.assessment.count
      .mockResolvedValueOnce(2417) // total assessments
      .mockResolvedValueOnce(312); // period completed assessments

    mockPrisma.legalCorpusVersion.findFirst
      .mockResolvedValueOnce({
        version: "v2026.08.31",
        status: "APPROVED",
        approvedAt: new Date("2026-08-31T00:00:00.000Z"),
        _count: { documents: 184 },
        sourceManifest: { ruleCount: 73 },
      })
      .mockResolvedValueOnce({
        version: "v2026.09.02-draft",
        status: "DRAFT",
        createdAt: new Date("2026-09-02T00:00:00.000Z"),
        _count: { documents: 188 },
        sourceManifest: { ruleCount: 75 },
      });

    mockPrisma.assessment.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
        status: "READY_FOR_REVIEW",
        updatedAt: new Date("2026-09-02T10:00:00.000Z"),
      },
    ]);

    mockPrisma.auditEvent.findMany.mockResolvedValueOnce([
      {
        id: "evt-1",
        eventType: "ADMIN_USER_MODIFICATION",
        actorId: "admin-1",
        createdAt: new Date("2026-09-11T10:24:00.000Z"),
        payload: {
          action: "SUSPEND",
          targetUserId: "usr-2",
          email: "linh@example.com",
          passwordHash: "SECRET_HASH_DO_NOT_EXPOSE",
        },
      },
    ]);

    mockPrisma.user.findMany.mockResolvedValueOnce([
      {
        id: "admin-1",
        email: "admin@example.com",
        displayName: "Admin User",
      },
    ]);

    const result = await service.getOverview("30D", fixedNow);

    expect(result.period).toBe(ADMIN_OVERVIEW_PERIODS.p30d);
    expect(result.periodDays).toBe(30);

    // Summary counts: 842 active + 34 suspended + 64 invited = 940 total
    expect(result.summary.totalUsers.count).toBe(940);
    expect(result.summary.totalUsers.periodChange).toBe(38);
    expect(result.summary.activeUsers.count).toBe(842);
    expect(result.summary.activeUsers.percentageOfTotal).toBeCloseTo(89.6, 1);
    expect(result.summary.assessments.totalCount).toBe(2417);
    expect(result.summary.assessments.periodCompletedCount).toBe(312);
    expect(result.summary.currentCorpus.version).toBe("v2026.08.31");
    expect(result.summary.currentCorpus.sourceCount).toBe(184);
    expect(result.summary.currentCorpus.ruleCount).toBe(73);

    // Corpus status
    expect(result.corpusStatus.current?.version).toBe("v2026.08.31");
    expect(result.corpusStatus.draft?.version).toBe("v2026.09.02-draft");

    // Account distribution
    expect(result.accountDistribution.activeCount).toBe(842);
    expect(result.accountDistribution.invitedCount).toBe(64);
    expect(result.accountDistribution.suspendedCount).toBe(34);
    expect(result.accountDistribution.totalCount).toBe(940);

    // Recent activity audit sanitization
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0].adminEmail).toBe("admin@example.com");
    expect(result.recentActivity[0].action).toBe("Suspended account");
    expect(result.recentActivity[0].target).toBe("linh@example.com");
    expect((result.recentActivity[0] as any).passwordHash).toBeUndefined();
  });

  it("handles 7D and 90D periods and empty state safely", async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.accountInvitation.count.mockResolvedValue(0);
    mockPrisma.assessment.count.mockResolvedValue(0);
    mockPrisma.legalCorpusVersion.findFirst.mockResolvedValue(null);
    mockPrisma.assessment.findMany.mockResolvedValue([]);
    mockPrisma.auditEvent.findMany.mockResolvedValue([]);

    const result7d = await service.getOverview("7D", fixedNow);
    expect(result7d.period).toBe(ADMIN_OVERVIEW_PERIODS.p7d);
    expect(result7d.periodDays).toBe(7);
    expect(result7d.summary.totalUsers.count).toBe(0);
    expect(result7d.summary.activeUsers.percentageOfTotal).toBe(0);
    expect(result7d.corpusStatus.current).toBeNull();
    expect(result7d.recentActivity).toHaveLength(0);

    const result90d = await service.getOverview("90D", fixedNow);
    expect(result90d.period).toBe(ADMIN_OVERVIEW_PERIODS.p90d);
    expect(result90d.periodDays).toBe(90);
  });
});
