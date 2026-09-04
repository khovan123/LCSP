"use client";

import { BoxesIcon, PlusIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { getAssessmentActiveHref } from "@/lib/api/workspace-client";
import { resolveAppMessage } from "@/lib/i18n";

import {
  DEFAULT_RECENT_FILTERS,
  SIDEBAR_NAV_ITEM_VARIANTS,
  SIDEBAR_RECENT_LOAD_STATES,
  type RecentFilterKey,
  type RecentFilters,
  type SidebarRecentLoadState,
} from "../../types/recent-filter.types";
import type { AssessmentSummary } from "../../types/workspace.types";
import { getVisibleRecentAssessments } from "../../utils/recent-filter-utils";
import { RecentAssessmentItem } from "../molecules/recent-assessment-item";
import { RecentEmptyMessage } from "../molecules/recent-empty-message";
import { RecentFilterPopover } from "../molecules/recent-filter-popover";
import { SidebarAccountMount } from "../molecules/sidebar-account-mount";
import { SidebarNavItem } from "../molecules/sidebar-nav-item";

export { SIDEBAR_RECENT_LOAD_STATES } from "../../types/recent-filter.types";

type AppSidebarProps = {
  assessments: AssessmentSummary[];
  collapsed: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  pathname: string;
  recentLoadState?: SidebarRecentLoadState;
  signOutPending: boolean;
  userName?: string;
  accountControl?: ReactNode;
};

export function AppSidebar({
  accountControl,
  assessments,
  collapsed,
  onNavigate,
  onSignOut,
  pathname,
  recentLoadState = SIDEBAR_RECENT_LOAD_STATES.idle,
  signOutPending,
  userName,
}: AppSidebarProps) {
  const [filters, setFilters] = useState<RecentFilters>(DEFAULT_RECENT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const resolvedUserName =
    userName?.trim() || resolveAppMessage("pages.appShell.productName");
  const userInitial = resolvedUserName.slice(0, 1).toUpperCase();
  const recentAssessments = useMemo(
    () => getVisibleRecentAssessments(assessments, filters),
    [assessments, filters],
  );
  const newActive = pathname === "/assessments/new";

  if (collapsed) return null;

  function updateFilter<Value extends string>(
    key: RecentFilterKey,
    value: Value,
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function navigateTo(href: string) {
    onNavigate?.();
    window.location.assign(href);
  }

  return (
    <nav
      aria-label={resolveAppMessage("pages.appShell.workspaceNavigation")}
      className="flex min-h-0 w-full flex-col bg-[#111111] text-[#dbd9d1]"
      data-component="AppSidebar"
    >
      <div className="shrink-0 px-2.5 pt-15">
        <SidebarNavItem
          active={newActive}
          href="/assessments/new"
          icon={
            <span className="flex size-4.5 items-center justify-center rounded-[10px] border border-[#292929]">
              <PlusIcon className="size-3" />
            </span>
          }
          label={resolveAppMessage("pages.appShell.new")}
          onNavigate={onNavigate}
          variant={SIDEBAR_NAV_ITEM_VARIANTS.new}
        />
        <SidebarNavItem
          ariaLabel={resolveAppMessage("pages.appShell.artifactsUnavailable")}
          className="mt-3"
          disabled
          icon={<BoxesIcon className="size-4" />}
          label={resolveAppMessage("pages.appShell.artifacts")}
          title={resolveAppMessage("pages.appShell.artifactsUnavailable")}
          variant={SIDEBAR_NAV_ITEM_VARIANTS.nav}
        />
      </div>

      <section className="mt-3.5 min-h-0 flex-1 overflow-y-auto px-2.5 pb-12">
        <div className="flex h-7 items-center">
          <h2 className="ml-2 flex-1 text-[13px] leading-none font-medium text-[#8f8c85]">
            {resolveAppMessage("pages.appShell.recents")}
          </h2>
          <RecentFilterPopover
            filters={filters}
            onOpenChange={setFilterOpen}
            onUpdateFilter={updateFilter}
            open={filterOpen}
          />
        </div>

        {recentLoadState === SIDEBAR_RECENT_LOAD_STATES.loading ? (
          <RecentEmptyMessage
            open={filterOpen}
            text={resolveAppMessage("pages.appShell.recentFilter.loading")}
          />
        ) : recentLoadState === SIDEBAR_RECENT_LOAD_STATES.error ? (
          <RecentEmptyMessage
            open={filterOpen}
            text={resolveAppMessage("pages.appShell.recentFilter.error")}
          />
        ) : recentAssessments.length > 0 ? (
          <div className="mt-4 flex flex-col gap-1">
            {recentAssessments.map((assessment) => (
              <RecentAssessmentItem
                key={assessment.id}
                active={pathname === getAssessmentActiveHref(assessment)}
                assessment={assessment}
                onNavigate={onNavigate}
                suppressHover={filterOpen}
              />
            ))}
          </div>
        ) : (
          <RecentEmptyMessage
            open={filterOpen}
            text={resolveAppMessage("pages.appShell.recentFilter.empty")}
          />
        )}
      </section>

      <div
        className="mt-auto shrink-0 px-2.5 pb-2.5"
        data-lcsp268-account-mount="true"
      >
        {accountControl ?? (
          <SidebarAccountMount
            navigateTo={navigateTo}
            onSignOut={onSignOut}
            signOutPending={signOutPending}
            userInitial={userInitial}
            userName={resolvedUserName}
          />
        )}
      </div>
    </nav>
  );
}
