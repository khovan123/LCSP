import { HttpStatus } from "@nestjs/common";
import {
  ADMIN_ACCOUNT_ERRORS as E,
  ADMIN_ACCOUNT_FILTERS,
  ADMIN_ACCOUNT_QUERY_LIMITS as L,
  AUTH_ACCOUNT_STATUSES,
  AUTH_USER_ROLES,
  type AuthAccountStatus,
  type AuthUserRole,
} from "@lcsp/contracts/auth";
import { problemException } from "../../../../platform/problems/problem-factory.js";

export function invalid(correlationId: string): never {
  throw problemException(E.invalidInput, correlationId, {
    status: HttpStatus.BAD_REQUEST,
  });
}
export function idempotency(key: unknown, correlationId: string): string {
  if (typeof key !== "string" || !key.trim() || key.length > 200)
    throw problemException(E.idempotencyRequired, correlationId, {
      status: HttpStatus.BAD_REQUEST,
    });
  return key.trim();
}
export function record(
  raw: unknown,
  correlationId: string,
  allowedKeys?: string[],
): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return invalid(correlationId);
  const data = raw as Record<string, unknown>;
  if (allowedKeys) {
    const keys = Object.keys(data);
    if (keys.some((key) => !allowedKeys.includes(key)))
      return invalid(correlationId);
  }
  return data;
}
export function version(v: unknown, correlationId: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0)
    return invalid(correlationId);
  return v;
}
export function reason(r: unknown, correlationId: string): string | undefined {
  if (r === undefined) return undefined;
  if (typeof r !== "string" || !r.trim() || r.length > 500)
    return invalid(correlationId);
  return r.trim();
}
export function integer(
  v: unknown,
  fallback: number,
  max: number,
  correlationId?: string,
): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d+$/.test(v.trim())
        ? Number(v.trim())
        : NaN;
  if (!Number.isInteger(n) || n < 1 || n > max) {
    if (correlationId) return invalid(correlationId);
    return fallback;
  }
  return n;
}
export function parseListQuery(
  raw: Record<string, unknown>,
  correlationId: string,
) {
  const scalar = (key: string): string | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") return invalid(correlationId);
    return value;
  };
  const rawQuery = scalar("query") ?? scalar("q");
  if (rawQuery !== undefined && rawQuery.length > L.maxQueryLength)
    return invalid(correlationId);
  const query = rawQuery?.trim() ?? "";
  const rawStatus = scalar("status");
  const status: AuthAccountStatus | undefined =
    rawStatus === undefined || rawStatus === ADMIN_ACCOUNT_FILTERS.all
      ? undefined
      : Object.values(AUTH_ACCOUNT_STATUSES).includes(
            rawStatus as AuthAccountStatus,
          )
        ? (rawStatus as AuthAccountStatus)
        : invalid(correlationId);
  const rawRole = scalar("role");
  const filterRole: AuthUserRole | undefined =
    rawRole === undefined || rawRole === ADMIN_ACCOUNT_FILTERS.all
      ? undefined
      : Object.values(AUTH_USER_ROLES).includes(rawRole as AuthUserRole)
        ? (rawRole as AuthUserRole)
        : invalid(correlationId);
  const page = integer(scalar("page"), 1, L.maxPage, correlationId);
  const pageSize = integer(
    scalar("pageSize") ?? scalar("page_size"),
    L.defaultPageSize,
    L.maxPageSize,
    correlationId,
  );
  return { query, status, role: filterRole, page, pageSize };
}
