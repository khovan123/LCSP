import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import {
  isSensitiveActionVerificationFresh,
  matchSensitiveRoute,
  sensitiveActionVerificationExpiresAt,
} from "../../../../../platform/security/sensitive-route-policy.js";
import type { SensitiveRouteCheckDto } from "../../contracts/auth-workspace/sensitive-route.contract.js";
import { CheckSensitiveRouteQuery } from "./check-sensitive-route.query.js";

@QueryHandler(CheckSensitiveRouteQuery)
export class CheckSensitiveRouteHandler implements IQueryHandler<
  CheckSensitiveRouteQuery,
  SensitiveRouteCheckDto
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: CheckSensitiveRouteQuery,
  ): Promise<SensitiveRouteCheckDto> {
    const routeMatch = matchSensitiveRoute(query.method, query.route);
    const isSensitive = routeMatch !== null;
    const session = await this.prisma.authSession.findUnique({
      where: { id: query.sessionId },
      select: { sensitiveActionVerifiedAt: true },
    });
    const expiresAt = sensitiveActionVerificationExpiresAt(
      session?.sensitiveActionVerifiedAt,
    );

    return {
      is_sensitive: isSensitive,
      route_id: routeMatch?.routeId ?? null,
      reauth_required:
        isSensitive &&
        !isSensitiveActionVerificationFresh(
          session?.sensitiveActionVerifiedAt,
          Date.now(),
        ),
      verified_at: session?.sensitiveActionVerifiedAt?.toISOString() ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
    };
  }
}
