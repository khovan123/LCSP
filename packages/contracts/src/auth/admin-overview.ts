export const ADMIN_OVERVIEW_PERIODS = {
  p7d: "7D",
  p30d: "30D",
  p90d: "90D",
} as const;

export type AdminOverviewPeriod =
  (typeof ADMIN_OVERVIEW_PERIODS)[keyof typeof ADMIN_OVERVIEW_PERIODS];

export interface AdminOverviewActivityPoint {
  date: string;
  label: string;
  startedCount: number;
  completedCount: number;
}

export interface AdminOverviewAccountDistribution {
  activeCount: number;
  invitedCount: number;
  suspendedCount: number;
  deactivatedCount: number;
  totalCount: number;
}

export interface AdminRecentActivityItem {
  id: string;
  timestamp: string;
  formattedTime: string;
  adminEmail: string;
  adminName: string | null;
  action: string;
  actionKey?: string;
  target: string;
}

export interface AdminCorpusStatusSummary {
  current: {
    version: string;
    sourceCount: number;
    ruleCount: number | null;
    publishedAt: string | null;
  } | null;
  draft: {
    version: string;
    sourceCount: number;
    ruleCount: number | null;
    statusText?: string;
  } | null;
}

export interface AdminOverviewStats {
  period: AdminOverviewPeriod;
  periodDays: number;
  summary: {
    totalUsers: {
      count: number;
      periodChange: number;
    };
    activeUsers: {
      count: number;
      percentageOfTotal: number;
    };
    assessments: {
      totalCount: number;
      periodCompletedCount: number;
    };
    currentCorpus: {
      version: string | null;
      sourceCount: number;
      ruleCount: number | null;
    };
  };
  assessmentActivity: {
    points: AdminOverviewActivityPoint[];
    totalStarted: number;
    totalCompleted: number;
    startDateLabel: string;
    endDateLabel: string;
  };
  accountDistribution: AdminOverviewAccountDistribution;
  recentActivity: AdminRecentActivityItem[];
  corpusStatus: AdminCorpusStatusSummary;
}
