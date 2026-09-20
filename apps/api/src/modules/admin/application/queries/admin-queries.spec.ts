import { describe, expect, it, jest } from "@jest/globals";
import {
  ADMIN_OVERVIEW_PERIODS,
  AUTH_ACCOUNT_STATUSES,
  AUTH_USER_ROLES,
  type AdminOverviewStats,
  type AdminUserDetail,
  type AdminUserListResponse,
} from "@lcsp/contracts/auth";
import { ListAdminUsersQuery } from "./list-admin-users/list-admin-users.query.js";
import { ListAdminUsersHandler } from "./list-admin-users/list-admin-users.handler.js";
import { GetAdminUserDetailQuery } from "./get-admin-user-detail/get-admin-user-detail.query.js";
import { GetAdminUserDetailHandler } from "./get-admin-user-detail/get-admin-user-detail.handler.js";
import { GetAdminOverviewQuery } from "./get-admin-overview/get-admin-overview.query.js";
import { GetAdminOverviewHandler } from "./get-admin-overview/get-admin-overview.handler.js";
import type { AdminAccountReadService } from "../services/admin-account-read.service.js";
import type { AdminOverviewService } from "../services/admin-overview.service.js";

describe("Admin CQRS Queries", () => {
  it("ListAdminUsersHandler delegates to readService.list", async () => {
    const listResponse: AdminUserListResponse = {
      users: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
    const listMock = jest.fn<AdminAccountReadService["list"]>();
    listMock.mockResolvedValue(listResponse);
    const readService = {
      list: listMock,
    } as unknown as AdminAccountReadService;

    const handler = new ListAdminUsersHandler(readService);
    const query = new ListAdminUsersQuery({ page: 1 }, "corr-1");
    const result = await handler.execute(query);

    expect(result).toEqual(listResponse);
    expect(listMock).toHaveBeenCalledWith({ page: 1 }, "corr-1");
  });

  it("GetAdminUserDetailHandler delegates to readService.detail", async () => {
    const detailResponse: AdminUserDetail = {
      id: "u-1",
      email: "u1@example.com",
      fullName: "U One",
      role: AUTH_USER_ROLES.customer,
      status: AUTH_ACCOUNT_STATUSES.active,
      version: 1,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
      usageSummary: {
        assessments30d: 0,
        lastAssessmentAt: null,
        creditSpend30d: 0,
        openFindingsCount: 0,
      },
    };
    const detailMock = jest.fn<AdminAccountReadService["detail"]>();
    detailMock.mockResolvedValue(detailResponse);
    const readService = {
      detail: detailMock,
    } as unknown as AdminAccountReadService;

    const handler = new GetAdminUserDetailHandler(readService);
    const query = new GetAdminUserDetailQuery("u-1", "corr-2");
    const result = await handler.execute(query);

    expect(result).toEqual(detailResponse);
    expect(detailMock).toHaveBeenCalledWith("u-1", "corr-2");
  });

  it("GetAdminOverviewHandler delegates to overviewService.getOverview", async () => {
    const overviewResponse: AdminOverviewStats = {
      period: ADMIN_OVERVIEW_PERIODS.p30d,
      periodDays: 30,
      summary: {
        totalUsers: { count: 12, periodChange: 2 },
        activeUsers: { count: 10, percentageOfTotal: 83.3 },
        assessments: { totalCount: 20, periodCompletedCount: 8 },
        currentCorpus: { version: "v1", sourceCount: 5, ruleCount: 10 },
      },
      assessmentActivity: {
        points: [],
        totalStarted: 20,
        totalCompleted: 8,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
      accountDistribution: {
        activeCount: 10,
        invitedCount: 0,
        suspendedCount: 2,
        deactivatedCount: 0,
        totalCount: 12,
      },
      recentActivity: [],
      corpusStatus: {
        current: {
          version: "v1",
          sourceCount: 5,
          ruleCount: 10,
          publishedAt: new Date().toISOString(),
        },
        draft: null,
      },
    };

    const overviewMock = jest.fn<AdminOverviewService["getOverview"]>();
    overviewMock.mockResolvedValue(overviewResponse);
    const overviewService = {
      getOverview: overviewMock,
    } as unknown as AdminOverviewService;

    const handler = new GetAdminOverviewHandler(overviewService);
    const query = new GetAdminOverviewQuery("30D");
    const result = await handler.execute(query);

    expect(result).toEqual(overviewResponse);
    expect(overviewMock).toHaveBeenCalledWith("30D");
  });
});
