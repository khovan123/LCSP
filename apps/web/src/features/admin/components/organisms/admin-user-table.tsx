"use client";

import type { MessageKey } from "@lcsp/i18n";
import { AUTH_ACCOUNT_STATUSES, AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveAppMessage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AdminUsersTableProps } from "@/features/admin/types/admin.types";

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function AdminUserTable({
  users,
  isLoading = false,
  onViewUser,
}: AdminUsersTableProps) {
  const colUser = resolveAppMessage("pages.admin.usersList.columns.user" as MessageKey);
  const colRole = resolveAppMessage("pages.admin.usersList.columns.role" as MessageKey);
  const colStatus = resolveAppMessage("pages.admin.usersList.columns.status" as MessageKey);
  const colCreated = resolveAppMessage("pages.admin.usersList.columns.created" as MessageKey);
  const colLastActive = resolveAppMessage("pages.admin.usersList.columns.lastActive" as MessageKey);
  const colAssessments = resolveAppMessage("pages.admin.usersList.columns.assessments" as MessageKey);
  const viewLabel = resolveAppMessage("pages.admin.usersList.viewAction" as MessageKey);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1112px] rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex w-full max-w-[1112px] flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center shadow-xs">
        <p className="text-sm font-semibold text-foreground">
          {resolveAppMessage("pages.admin.usersList.emptyTitle" as MessageKey)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {resolveAppMessage("pages.admin.usersList.emptyDescription" as MessageKey)}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1112px] overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="User Accounts Table">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-[300px] py-3.5 pl-6 pr-4 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colUser}
              </th>
              <th className="w-[88px] px-4 py-3.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colRole}
              </th>
              <th className="w-[110px] px-4 py-3.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colStatus}
              </th>
              <th className="w-[138px] px-4 py-3.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colCreated}
              </th>
              <th className="w-[126px] px-4 py-3.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colLastActive}
              </th>
              <th className="w-[110px] px-4 py-3.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                {colAssessments}
              </th>
              <th className="py-3.5 pl-4 pr-6 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {users.map((user) => {
              const roleDisplay =
                user.role === AUTH_USER_ROLES.admin
                  ? resolveAppMessage("pages.admin.usersList.roles.ADMIN" as MessageKey)
                  : resolveAppMessage("pages.admin.usersList.roles.CUSTOMER" as MessageKey);

              const statusDisplay =
                user.status === AUTH_ACCOUNT_STATUSES.active
                  ? resolveAppMessage("pages.admin.usersList.statuses.ACTIVE" as MessageKey)
                  : user.status === AUTH_ACCOUNT_STATUSES.suspended
                    ? resolveAppMessage("pages.admin.usersList.statuses.SUSPENDED" as MessageKey)
                    : user.status === AUTH_ACCOUNT_STATUSES.invited
                      ? resolveAppMessage("pages.admin.usersList.statuses.INVITED" as MessageKey)
                      : resolveAppMessage("pages.admin.usersList.statuses.DEACTIVATED" as MessageKey);

              const isSuspended = user.status === AUTH_ACCOUNT_STATUSES.suspended;
              const isActive = user.status === AUTH_ACCOUNT_STATUSES.active;

              return (
                <tr
                  key={user.id}
                  className="h-[68px] transition-colors hover:bg-muted/30"
                >
                  {/* User (Name + Email) */}
                  <td className="w-[300px] py-3 pl-6 pr-4">
                    <div className="flex flex-col">
                      <span className="text-[12.5px] font-medium text-foreground">
                        {user.fullName}
                      </span>
                      <span className="text-[10.5px] text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="w-[88px] px-4 py-3">
                    <span className="text-[11.5px] font-medium text-foreground">
                      {roleDisplay}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="w-[110px] px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11.5px] font-medium",
                        isActive && "text-emerald-600 dark:text-emerald-400",
                        isSuspended && "text-rose-600 dark:text-rose-400",
                        !isActive && !isSuspended && "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isActive && "bg-emerald-500",
                          isSuspended && "bg-rose-500",
                          !isActive && !isSuspended && "bg-muted-foreground",
                        )}
                      />
                      {statusDisplay}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="w-[138px] px-4 py-3 text-[11.5px] text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* Last Active */}
                  <td className="w-[126px] px-4 py-3 text-[11.5px] text-muted-foreground">
                    {formatDate(user.lastActiveAt)}
                  </td>

                  {/* Assessments Count */}
                  <td className="w-[110px] px-4 py-3 text-[11.5px] font-medium text-foreground">
                    {user.assessmentCount !== null && user.assessmentCount !== undefined
                      ? user.assessmentCount
                      : "—"}
                  </td>

                  {/* Action Button */}
                  <td className="py-3 pl-4 pr-6 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onViewUser(user.id)}
                      aria-label={`View ${user.fullName}`}
                      className="h-[34px] w-[90px] rounded-[10px] border-border bg-secondary text-[12.5px] font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs"
                    >
                      {viewLabel}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

}
