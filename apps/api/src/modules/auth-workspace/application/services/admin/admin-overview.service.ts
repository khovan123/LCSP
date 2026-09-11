import { Injectable } from "@nestjs/common";
import {
  ACCOUNT_INVITATION_STATUSES,
  ADMIN_ACCOUNT_OPERATIONS,
  ADMIN_OVERVIEW_PERIODS,
  AUTH_ACCOUNT_STATUSES,
  USER_ACCESS_STATUSES,
  type AdminCorpusStatusSummary,
  type AdminOverviewAccountDistribution,
  type AdminOverviewActivityPoint,
  type AdminOverviewPeriod,
  type AdminOverviewStats,
  type AdminRecentActivityItem,
} from "@lcsp/contracts/auth";
import { ASSESSMENT_STATUS_CODES } from "@lcsp/contracts/assessment";
import {
  LEGAL_RULE_EVENT_TYPES,
  LEGAL_RULE_LIFECYCLE_STATUSES,
} from "@lcsp/contracts/legal-rule-catalog";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { toPrismaLegalRuleLifecycleStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    rawPeriod?: string,
    now: Date = new Date(),
  ): Promise<AdminOverviewStats> {
    const period = this.normalizePeriod(rawPeriod);
    const periodDays =
      period === ADMIN_OVERVIEW_PERIODS.p7d
        ? 7
        : period === ADMIN_OVERVIEW_PERIODS.p90d
          ? 90
          : 30;

    const windowStart = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );

    const [
      activeUsersCount,
      suspendedUsersCount,
      pendingInvitationsCount,
      periodNewUsersCount,
      periodNewInvitationsCount,
      totalAssessmentsCount,
      periodCompletedAssessmentsCount,
      publishedCorpus,
      draftCorpus,
      periodAssessments,
      recentAuditEvents,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { accessStatus: USER_ACCESS_STATUSES.active },
      }),
      this.prisma.user.count({
        where: { accessStatus: USER_ACCESS_STATUSES.suspended },
      }),
      this.prisma.accountInvitation.count({
        where: {
          status: ACCOUNT_INVITATION_STATUSES.pending,
          expiresAt: { gt: now },
        },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: windowStart } },
      }),
      this.prisma.accountInvitation.count({
        where: { createdAt: { gte: windowStart } },
      }),
      this.prisma.assessment.count(),
      this.prisma.assessment.count({
        where: {
          status: ASSESSMENT_STATUS_CODES.readyForReview,
          updatedAt: { gte: windowStart },
        },
      }),
      this.prisma.legalCorpusVersion.findFirst({
        where: {
          status: toPrismaLegalRuleLifecycleStatus(
            LEGAL_RULE_LIFECYCLE_STATUSES.approved,
          ),
        },
        include: { _count: { select: { documents: true } } },
        orderBy: { approvedAt: "desc" },
      }),
      this.prisma.legalCorpusVersion.findFirst({
        where: {
          status: toPrismaLegalRuleLifecycleStatus(
            LEGAL_RULE_LIFECYCLE_STATUSES.draft,
          ),
        },
        include: { _count: { select: { documents: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.assessment.findMany({
        where: { createdAt: { gte: windowStart } },
        select: {
          createdAt: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const totalAccountsCount =
      activeUsersCount + suspendedUsersCount + pendingInvitationsCount;
    const periodChange = periodNewUsersCount + periodNewInvitationsCount;
    const activePercentage =
      totalAccountsCount > 0
        ? Math.round((activeUsersCount / totalAccountsCount) * 1000) / 10
        : 0;

    // Build daily activity points
    const activityData = this.buildActivityData(
      periodDays,
      windowStart,
      now,
      periodAssessments,
    );

    // Build sanitized recent admin activity
    const recentActivity = await this.sanitizeRecentActivity(
      recentAuditEvents,
      now,
    );

    // Build corpus status summary
    const corpusStatus: AdminCorpusStatusSummary = {
      current: publishedCorpus
        ? {
            version: publishedCorpus.version,
            sourceCount: publishedCorpus._count.documents,
            ruleCount: this.extractRuleCount(publishedCorpus.sourceManifest),
            publishedAt: publishedCorpus.approvedAt?.toISOString() ?? null,
          }
        : null,
      draft: draftCorpus
        ? {
            version: draftCorpus.version,
            sourceCount: draftCorpus._count.documents,
            ruleCount: this.extractRuleCount(draftCorpus.sourceManifest),
            statusText: "diff review pending",
          }
        : null,
    };

    const accountDistribution: AdminOverviewAccountDistribution = {
      activeCount: activeUsersCount,
      invitedCount: pendingInvitationsCount,
      suspendedCount: suspendedUsersCount,
      deactivatedCount: 0,
      totalCount: totalAccountsCount,
    };

    return {
      period,
      periodDays,
      summary: {
        totalUsers: {
          count: totalAccountsCount,
          periodChange,
        },
        activeUsers: {
          count: activeUsersCount,
          percentageOfTotal: activePercentage,
        },
        assessments: {
          totalCount: totalAssessmentsCount,
          periodCompletedCount: periodCompletedAssessmentsCount,
        },
        currentCorpus: {
          version: publishedCorpus?.version ?? null,
          sourceCount: publishedCorpus?._count.documents ?? 0,
          ruleCount: this.extractRuleCount(publishedCorpus?.sourceManifest),
        },
      },
      assessmentActivity: activityData,
      accountDistribution,
      recentActivity,
      corpusStatus,
    };
  }

  private normalizePeriod(raw?: string): AdminOverviewPeriod {
    if (raw === ADMIN_OVERVIEW_PERIODS.p7d) return ADMIN_OVERVIEW_PERIODS.p7d;
    if (raw === ADMIN_OVERVIEW_PERIODS.p90d) return ADMIN_OVERVIEW_PERIODS.p90d;
    return ADMIN_OVERVIEW_PERIODS.p30d;
  }

  private buildActivityData(
    periodDays: number,
    windowStart: Date,
    now: Date,
    assessments: Array<{ createdAt: Date; status: string; updatedAt: Date }>,
  ) {
    const dailyMap = new Map<
      string,
      { startedCount: number; completedCount: number }
    >();

    // Determine number of displayed bars (e.g. 14 bars for 30D/7D or up to periodDays)
    const barCount = periodDays <= 14 ? periodDays : 14;
    const intervalMs = (now.getTime() - windowStart.getTime()) / barCount;

    const points: AdminOverviewActivityPoint[] = [];

    for (let i = 0; i < barCount; i++) {
      const bucketStart = new Date(windowStart.getTime() + i * intervalMs);
      const bucketEnd = new Date(windowStart.getTime() + (i + 1) * intervalMs);
      const dateKey = bucketStart.toISOString().slice(0, 10);
      const label = this.formatShortDate(bucketStart);

      let startedCount = 0;
      let completedCount = 0;

      for (const a of assessments) {
        if (a.createdAt >= bucketStart && a.createdAt < bucketEnd) {
          startedCount++;
        }
        if (
          a.status === ASSESSMENT_STATUS_CODES.readyForReview &&
          a.updatedAt >= bucketStart &&
          a.updatedAt < bucketEnd
        ) {
          completedCount++;
        }
      }

      points.push({
        date: dateKey,
        label,
        startedCount,
        completedCount,
      });
    }

    const totalStarted = assessments.length;
    const totalCompleted = assessments.filter(
      (a) => a.status === ASSESSMENT_STATUS_CODES.readyForReview,
    ).length;

    const startDateLabel = this.formatShortDate(windowStart);
    const endDateLabel = this.formatShortDate(now);

    return {
      points,
      totalStarted,
      totalCompleted,
      startDateLabel,
      endDateLabel,
    };
  }

  private async sanitizeRecentActivity(
    events: Array<{
      id: string;
      eventType: string;
      actorId: string | null;
      createdAt: Date;
      payload: unknown;
    }>,
    now: Date,
  ): Promise<AdminRecentActivityItem[]> {
    if (events.length === 0) return [];

    const actorIds = [
      ...new Set(
        events
          .map((e) => e.actorId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const users = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, displayName: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    return events.map((event) => {
      const user = event.actorId ? userMap.get(event.actorId) : undefined;
      const adminEmail = user?.email ?? "system@lcsp.internal";
      const adminName = user?.displayName ?? null;
      const payload = isRecord(event.payload) ? event.payload : {};

      const { action, actionKey, target } = this.resolveActionAndTarget(
        event.eventType,
        payload,
      );

      return {
        id: event.id,
        timestamp: event.createdAt.toISOString(),
        formattedTime: this.formatRelativeTime(event.createdAt, now),
        adminEmail,
        adminName,
        action,
        actionKey,
        target,
      };
    });
  }

  private resolveActionAndTarget(
    eventType: string,
    payload: Record<string, unknown>,
  ): { action: string; actionKey?: string; target: string } {
    const rawAction = typeof payload.action === "string" ? payload.action : "";
    const targetUserId =
      typeof payload.targetUserId === "string" ? payload.targetUserId : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const corpusVersionRef =
      typeof payload.corpusVersionRef === "string"
        ? payload.corpusVersionRef
        : "";

    if (
      eventType === "ADMIN_USER_MODIFICATION" ||
      rawAction === ADMIN_ACCOUNT_OPERATIONS.suspend
    ) {
      return {
        action: "Suspended account",
        actionKey: "suspendedAccount",
        target: email || targetUserId || "User account",
      };
    }
    if (rawAction === ADMIN_ACCOUNT_OPERATIONS.restore) {
      return {
        action: "Restored access",
        actionKey: "restoredAccount",
        target: email || targetUserId || "User account",
      };
    }
    if (
      eventType === "ACCOUNT_INVITATION_CREATED" ||
      rawAction === ADMIN_ACCOUNT_OPERATIONS.invite
    ) {
      return {
        action: "Invited user",
        actionKey: "invitedUser",
        target: email || "New user",
      };
    }
    if (eventType === LEGAL_RULE_EVENT_TYPES.corpusVersionDiscarded) {
      return {
        action: "Discarded draft",
        actionKey: "discardedDraft",
        target: corpusVersionRef || "Corpus draft",
      };
    }
    if (
      eventType === LEGAL_RULE_EVENT_TYPES.corpusVersionApproved ||
      eventType === "CORPUS_VERSION_PUBLISHED"
    ) {
      return {
        action: "Published corpus",
        actionKey: "publishedCorpus",
        target: corpusVersionRef || "Corpus version",
      };
    }

    // Default sanitized presentation
    return {
      action: this.humanizeEventType(eventType),
      target: email || corpusVersionRef || targetUserId || "System",
    };
  }

  private humanizeEventType(eventType: string): string {
    return eventType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private formatRelativeTime(date: Date, now: Date): string {
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    if (isSameDay) {
      return `Today ${timeStr}`;
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isYesterday) {
      return `Yesterday ${timeStr}`;
    }

    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()} ${timeStr}`;
  }

  private formatShortDate(date: Date): string {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
  }

  private extractRuleCount(sourceManifest: unknown): number | null {
    if (!isRecord(sourceManifest)) return null;
    if (typeof sourceManifest.ruleCount === "number") {
      return sourceManifest.ruleCount;
    }
    if (Array.isArray(sourceManifest.rules)) {
      return sourceManifest.rules.length;
    }
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
