import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ADMIN_ERROR_CODES,
  AUTH_ACCOUNT_STATUSES,
  AUTH_AUDIT_EVENT_TYPES,
  AUTH_ERROR_CODES,
  AUTH_USER_ROLES,
  type AdminUserDetail,
  type AdminUserListResponse,
  type AdminUserSummary,
  type AdminUserUsageSummary,
  type AuthAccountStatus,
  type AuthUserRole,
} from "@lcsp/contracts/auth";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { AuthAuditService } from "../../application/services/auth-workspace/auth-audit.service.js";
import {
  toPrismaAuthUserRole,
  fromPrismaAuthUserRole,
} from "../../../../infrastructure/prisma/prisma-enum-mappers.js";

interface RoleUpdateBody {
  role?: string;
}

interface SuspendBody {
  reason?: string;
}

function computeUserStatus(user: {
  lockUntil: Date | null;
  emailVerified: boolean;
}): AuthAccountStatus {
  if (user.lockUntil !== null && user.lockUntil.getTime() > Date.now()) {
    return AUTH_ACCOUNT_STATUSES.suspended;
  }
  if (!user.emailVerified) {
    return AUTH_ACCOUNT_STATUSES.invited;
  }
  return AUTH_ACCOUNT_STATUSES.active;
}

@Controller("admin/users")
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authAudit: AuthAuditService,
  ) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async listUsers(
    @Query("query") queryRaw?: string,
    @Query("q") qRaw?: string,
    @Query("status") statusRaw?: string,
    @Query("role") roleRaw?: string,
    @Query("page") pageRaw?: string,
    @Query("page_size") pageSizeRaw?: string,
    @Query("pageSize") pageSizeAliasRaw?: string,
  ) {
    const query = (queryRaw ?? qRaw ?? "").trim().toLowerCase();
    const status = statusRaw ?? "ALL";
    const role = roleRaw ?? "ALL";
    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(
        100,
        Number.parseInt(pageSizeRaw ?? pageSizeAliasRaw ?? "10", 10) || 10,
      ),
    );

    const where: any = {};
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { displayName: { contains: query, mode: "insensitive" } },
      ];
    }
    if (
      role !== "ALL" &&
      Object.values(AUTH_USER_ROLES).includes(role as AuthUserRole)
    ) {
      where.role = toPrismaAuthUserRole(role as AuthUserRole);
    }
    if (status !== "ALL") {
      const now = new Date();
      if (status === AUTH_ACCOUNT_STATUSES.suspended) {
        where.lockUntil = { gt: now };
      } else if (status === AUTH_ACCOUNT_STATUSES.active) {
        where.emailVerified = true;
        where.AND = [
          { OR: [{ lockUntil: null }, { lockUntil: { lte: now } }] },
        ];
      } else if (status === AUTH_ACCOUNT_STATUSES.invited) {
        where.emailVerified = false;
        where.AND = [
          { OR: [{ lockUntil: null }, { lockUntil: { lte: now } }] },
        ];
      }
    }

    const [totalCount, dbUsers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          assessmentOwners: { select: { id: true } },
          authRecords: {
            where: { type: "SESSION" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const users: AdminUserSummary[] = dbUsers.map((u) => ({
      id: u.id,
      fullName: u.displayName || u.email.split("@")[0] || "User",
      email: u.email,
      role: fromPrismaAuthUserRole(u.role),
      status: computeUserStatus(u),
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.authRecords[0]?.createdAt.toISOString() ?? null,
      assessmentCount: u.assessmentOwners.length,
    }));

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const response: AdminUserListResponse = {
      users,
      totalCount,
      page,
      pageSize,
      totalPages,
    };

    return resultEnvelope(response);
  }

  private async buildUserDetail(
    user: {
      id: string;
      email: string;
      displayName: string | null;
      role: any;
      lockUntil: Date | null;
      emailVerified: boolean;
      createdAt: Date;
      authRecords: Array<{ type: string; createdAt: Date }>;
      assessmentOwners: Array<{ id: string; createdAt: Date }>;
    },
    forcedStatus?: AuthAccountStatus,
  ): Promise<AdminUserDetail> {
    const lastSession = user.authRecords.find((r) => r.type === "SESSION");
    const assessmentsCount = user.assessmentOwners.length;
    const scansCount = await this.prisma.repositoryScanJob.count({
      where: {
        assessment: { ownerId: user.id },
      },
    });

    const latestAssessment = user.assessmentOwners[0];

    const usageSummary: AdminUserUsageSummary = {
      assessments30d: assessmentsCount,
      lastAssessmentAt: latestAssessment ? latestAssessment.createdAt.toISOString() : null,
      creditSpend30d: assessmentsCount * 25,
      openFindingsCount: scansCount,
    };

    return {
      id: user.id,
      fullName: user.displayName || user.email.split("@")[0] || "User",
      email: user.email,
      role: fromPrismaAuthUserRole(user.role),
      status: forcedStatus ?? computeUserStatus(user),
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: lastSession?.createdAt.toISOString() ?? null,
      usageSummary,
    };
  }

  @Get(":id")
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async getUserDetail(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assessmentOwners: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        authRecords: {
          where: { type: "SESSION" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw problemException(
        ADMIN_ERROR_CODES.userNotFound,
        request.correlationId!,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    const detail = await this.buildUserDetail(user);
    return resultEnvelope(detail);
  }

  @Post(":id/role")
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async updateRole(
    @Param("id") id: string,
    @Body() body: RoleUpdateBody,
    @Req() request: AuthenticatedRequest,
  ) {
    if (
      !body ||
      !body.role ||
      !Object.values(AUTH_USER_ROLES).includes(body.role as AuthUserRole)
    ) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        request.correlationId!,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    const targetRole = body.role as AuthUserRole;

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assessmentOwners: { select: { id: true, createdAt: true } },
        authRecords: {
          where: { type: "SESSION" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw problemException(
        ADMIN_ERROR_CODES.userNotFound,
        request.correlationId!,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    const currentRole = fromPrismaAuthUserRole(user.role);

    // Safeguard against self-demotion
    if (
      user.id === request.rbacContext.userId &&
      targetRole === AUTH_USER_ROLES.customer
    ) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        request.correlationId!,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    // Safeguard against demoting the last active admin
    if (
      currentRole === AUTH_USER_ROLES.admin &&
      targetRole === AUTH_USER_ROLES.customer
    ) {
      const otherAdminsCount = await this.prisma.user.count({
        where: {
          role: toPrismaAuthUserRole(AUTH_USER_ROLES.admin),
          NOT: { id: user.id },
          OR: [{ lockUntil: null }, { lockUntil: { lte: new Date() } }],
        },
      });

      if (otherAdminsCount < 1) {
        throw problemException(
          AUTH_ERROR_CODES.validationFailed,
          request.correlationId!,
          { status: HttpStatus.BAD_REQUEST },
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        role: toPrismaAuthUserRole(targetRole),
      },
      include: {
        assessmentOwners: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        authRecords: {
          where: { type: "SESSION" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Record Audit Event
    await this.authAudit.write({
      eventType: AUTH_AUDIT_EVENT_TYPES.authAdminUserRoleUpdated,
      actorId: request.rbacContext.userId,
      resourceType: AUDIT_RESOURCE_TYPES.workspace,
      resourceId: user.id,
      decision: AUDIT_DECISIONS.allow,
      correlationId: request.correlationId!,
      sessionId: request.rbacContext.sessionId,
      payload: {
        targetUserId: user.id,
        targetEmail: user.email,
        previousRole: currentRole,
        newRole: targetRole,
      },
    });

    const detail = await this.buildUserDetail(updated);
    return resultEnvelope(detail);
  }

  @Post(":id/suspend")
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async suspendUser(
    @Param("id") id: string,
    @Body() body: SuspendBody,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        assessmentOwners: { select: { id: true, createdAt: true } },
        authRecords: {
          where: { type: "SESSION" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw problemException(
        ADMIN_ERROR_CODES.userNotFound,
        request.correlationId!,
        { status: HttpStatus.NOT_FOUND },
      );
    }

    // Protect against self-suspension
    if (user.id === request.rbacContext.userId) {
      throw problemException(
        AUTH_ERROR_CODES.validationFailed,
        request.correlationId!,
        { status: HttpStatus.BAD_REQUEST },
      );
    }

    // Protect against suspending the last admin
    if (user.role === toPrismaAuthUserRole(AUTH_USER_ROLES.admin)) {
      const otherAdminsCount = await this.prisma.user.count({
        where: {
          role: toPrismaAuthUserRole(AUTH_USER_ROLES.admin),
          NOT: { id: user.id },
          OR: [{ lockUntil: null }, { lockUntil: { lte: new Date() } }],
        },
      });

      if (otherAdminsCount < 1) {
        throw problemException(
          AUTH_ERROR_CODES.validationFailed,
          request.correlationId!,
          { status: HttpStatus.BAD_REQUEST },
        );
      }
    }

    const suspendUntil = new Date("9999-12-31T23:59:59.999Z");

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          lockUntil: suspendUntil,
        },
        include: {
          assessmentOwners: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
          authRecords: {
            where: { type: "SESSION" },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.authRecord.updateMany({
        where: {
          userId: user.id,
          type: "SESSION",
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    // Record Audit Event
    await this.authAudit.write({
      eventType: AUTH_AUDIT_EVENT_TYPES.authAdminUserSuspended,
      actorId: request.rbacContext.userId,
      resourceType: AUDIT_RESOURCE_TYPES.workspace,
      resourceId: user.id,
      decision: AUDIT_DECISIONS.allow,
      correlationId: request.correlationId!,
      sessionId: request.rbacContext.sessionId,
      payload: {
        targetUserId: user.id,
        targetEmail: user.email,
        reason: body?.reason || "Administrative suspension",
      },
    });

    const detail = await this.buildUserDetail(updated, AUTH_ACCOUNT_STATUSES.suspended);
    return resultEnvelope(detail);
  }
}
