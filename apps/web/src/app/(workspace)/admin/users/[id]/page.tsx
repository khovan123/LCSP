"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import type { MessageKey } from "@lcsp/i18n";
import { AUTH_ACCOUNT_STATUSES, type AuthUserRole } from "@lcsp/contracts/auth";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";
import { AdminAccountDetailsCard } from "@/features/admin/components/organisms/admin-account-details-card";
import { AdminAdministrativeActionsCard } from "@/features/admin/components/organisms/admin-administrative-actions-card";
import { AdminUsageSummary } from "@/features/admin/components/organisms/admin-usage-summary";
import { AdminSuspendModal } from "@/features/admin/components/organisms/admin-suspend-modal";
import {
  useAdminSuspendUserMutation,
  useAdminUpdateRoleMutation,
  useAdminUserDetailQuery,
} from "@/lib/api/admin-users-queries";
import { resolveAppMessage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  const { data: user, isLoading, error } = useAdminUserDetailQuery(id);
  const updateRoleMutation = useAdminUpdateRoleMutation(id);
  const suspendUserMutation = useAdminSuspendUserMutation(id);

  const pageTitle = resolveAppMessage(
    "pages.admin.userDetail.title" as MessageKey,
  );
  const pageDescription = resolveAppMessage(
    "pages.admin.userDetail.description" as MessageKey,
  );
  const backToUsersLabel = resolveAppMessage(
    "pages.admin.userDetail.backToUsers" as MessageKey,
  );

  const handleRoleSave = async (newRole: AuthUserRole) => {
    await updateRoleMutation.mutateAsync({ role: newRole });
  };

  const handleConfirmSuspend = async () => {
    await suspendUserMutation.mutateAsync({ reason: "Administrative suspension" });
    setIsSuspendModalOpen(false);
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex flex-col space-y-6 pb-12">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-6 w-96 bg-white/5" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[252px] w-full rounded-xl bg-white/5" />
            <Skeleton className="h-[252px] w-full rounded-xl bg-white/5" />
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !user) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-semibold text-foreground">
            {resolveAppMessage("pages.admin.usersList.errorTitle" as MessageKey)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
            className="mt-4 rounded-[10px]"
          >
            {backToUsersLabel}
          </Button>
        </div>
      </AdminShell>
    );
  }

  const isActive = user.status === AUTH_ACCOUNT_STATUSES.active;
  const isSuspended = user.status === AUTH_ACCOUNT_STATUSES.suspended;

  const statusLabel =
    user.status === AUTH_ACCOUNT_STATUSES.active
      ? resolveAppMessage("pages.admin.userDetail.statusPill.active" as MessageKey)
      : user.status === AUTH_ACCOUNT_STATUSES.suspended
        ? resolveAppMessage("pages.admin.userDetail.statusPill.suspended" as MessageKey)
        : user.status === AUTH_ACCOUNT_STATUSES.invited
          ? resolveAppMessage("pages.admin.userDetail.statusPill.invited" as MessageKey)
          : resolveAppMessage("pages.admin.userDetail.statusPill.deactivated" as MessageKey);

  return (
    <AdminShell>
      <div className="flex flex-col space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col space-y-1">
          <h1 className="text-[28px] font-semibold text-foreground tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-[13px] text-muted-foreground">{pageDescription}</p>
        </div>

        {/* Back Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/users")}
            className="h-[38px] w-auto px-3.5 rounded-[10px] border-border bg-secondary text-[12.5px] font-semibold text-secondary-foreground hover:bg-secondary/80 shadow-xs"
          >
            <ArrowLeftIcon className="size-4 mr-1.5" />
            {backToUsersLabel}
          </Button>
        </div>

        {/* User Identity Header + Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-col space-y-1">
            <h2 className="text-[24px] font-semibold text-foreground tracking-tight">
              {user.fullName}
            </h2>
            <span className="text-[12.5px] text-muted-foreground">
              {user.email}
            </span>
          </div>

          {/* Status Pill (142px x 32px) */}
          <div
            className={cn(
              "flex h-[32px] w-[142px] items-center justify-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold",
              isActive && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              isSuspended && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
              !isActive && !isSuspended && "border-border bg-secondary text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                isActive && "bg-emerald-500",
                isSuspended && "bg-rose-500",
                !isActive && !isSuspended && "bg-muted-foreground",
              )}
            />
            {statusLabel}
          </div>
        </div>


        {/* Two Details / Actions Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AdminAccountDetailsCard user={user} />
          <AdminAdministrativeActionsCard
            user={user}
            onRoleSave={handleRoleSave}
            onOpenSuspendModal={() => setIsSuspendModalOpen(true)}
            isSavingRole={updateRoleMutation.isPending}
          />
        </div>

        {/* Usage Summary */}
        <AdminUsageSummary usageSummary={user.usageSummary} />

        {/* Suspend Confirmation Modal */}
        <AdminSuspendModal
          isOpen={isSuspendModalOpen}
          user={user}
          onClose={() => setIsSuspendModalOpen(false)}
          onConfirm={handleConfirmSuspend}
          isPending={suspendUserMutation.isPending}
        />
      </div>
    </AdminShell>
  );
}
