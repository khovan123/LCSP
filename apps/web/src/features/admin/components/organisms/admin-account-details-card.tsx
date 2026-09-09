"use client";

import type { MessageKey } from "@lcsp/i18n";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import { resolveAppMessage } from "@/lib/i18n";
import type { AdminAccountDetailsCardProps } from "../../types/admin.types";

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

export function AdminAccountDetailsCard({ user }: AdminAccountDetailsCardProps) {
  const cardTitle = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.title" as MessageKey,
  );
  const fullNameLabel = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.fullName" as MessageKey,
  );
  const emailLabel = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.email" as MessageKey,
  );
  const roleLabel = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.role" as MessageKey,
  );
  const createdLabel = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.created" as MessageKey,
  );
  const lastActiveLabel = resolveAppMessage(
    "pages.admin.userDetail.accountDetailsCard.lastActive" as MessageKey,
  );

  const roleDisplay =
    user.role === AUTH_USER_ROLES.admin
      ? resolveAppMessage("pages.admin.usersList.roles.ADMIN" as MessageKey)
      : resolveAppMessage("pages.admin.usersList.roles.CUSTOMER" as MessageKey);

  const rows = [
    { label: fullNameLabel, value: user.fullName },
    { label: emailLabel, value: user.email },
    { label: roleLabel, value: roleDisplay },
    { label: createdLabel, value: formatDate(user.createdAt) },
    { label: lastActiveLabel, value: formatDate(user.lastActiveAt) },
  ];

  return (
    <div className="flex h-[252px] w-full max-w-[536px] flex-col justify-between rounded-xl border border-border/80 bg-[#242424] p-6 shadow-xs">
      <h2 className="text-[15px] font-semibold text-foreground">{cardTitle}</h2>

      <div className="flex flex-col space-y-3.5 pt-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center text-[11.5px]">
            <span className="w-[150px] shrink-0 font-medium text-muted-foreground">
              {row.label}
            </span>
            <span className="truncate font-medium text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
