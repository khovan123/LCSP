"use client";

import { ASSESSMENT_RUNTIME_RUN_STATUSES } from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";
import {
  BoxesIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  FileCheck2Icon,
  LogOutIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PlugIcon,
  PlusIcon,
  SettingsIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSignOutMutation } from "@/lib/api/auth-queries";
import { getAssessmentActiveHref } from "@/lib/api/workspace-client";
import {
  useAssessmentsQuery,
  useWorkspaceQuery,
} from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import type {
  AppShellNavigationItem,
  AppShellNavigationSection,
} from "../../types/app-shell.types";
import { WORKSPACE_RUNTIME_CONNECTION_STATES } from "../../types/workspace-runtime.types";
import type { AssessmentSummary } from "../../types/workspace.types";
import {
  connectionLabel,
  runStatusLabel,
  stageLabel,
} from "../../utils/assessment-runtime-formatter";
import { useWorkspaceRuntime } from "./workspace-runtime-provider";

type AssessmentAppShellProps = {
  assessmentId?: string;
  children: ReactNode;
  sections: AppShellNavigationSection[];
};

export function AssessmentAppShell({
  assessmentId,
  children,
  sections,
}: AssessmentAppShellProps) {
  const pathname = usePathname();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(Boolean(assessmentId));
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [mobileRuntimeOpen, setMobileRuntimeOpen] = useState(false);
  const signOutMutation = useSignOutMutation();
  const assessmentsQuery = useAssessmentsQuery();
  const workspaceQuery = useWorkspaceQuery();
  const runtime = useWorkspaceRuntime();
  const assessments =
    assessmentsQuery.data?.kind === "loaded"
      ? assessmentsQuery.data.assessments
      : [];
  const workspace =
    workspaceQuery.data?.kind === "loaded"
      ? workspaceQuery.data.workspace
      : undefined;
  const assessmentSection = sections.find(
    (section) => section.kind === "assessment",
  );
  const assessment = assessmentId
    ? assessments.find((item) => item.id === assessmentId)
    : undefined;
  const activeAssessmentItem = assessmentSection?.items.find((item) =>
    isNavigationItemActive(pathname, item),
  );
  const headerEyebrow = assessment?.name ?? t("pages.appShell.assessmentTitle");
  const headerTitle =
    activeAssessmentItem?.label ?? t("pages.appShell.assessments");

  async function handleSignOut() {
    await signOutMutation.mutateAsync();
    window.location.assign("/sign-in");
  }

  const navigation = (
    <AssessmentShellNavigation
      assessments={assessments}
      onNavigate={() => setMobileNavigationOpen(false)}
      onSignOut={() => void handleSignOut()}
      pathname={pathname}
      signOutPending={signOutMutation.isPending}
      userName={workspace?.user.display_name}
    />
  );

  return (
    <div className="flex h-svh min-h-0 w-full overflow-hidden bg-background">
      <aside
        data-slot="assessment-left-sidebar"
        className={cn(
          "hidden shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground transition-[width,border-color] duration-200 motion-reduce:transition-none lg:flex",
          leftOpen ? "w-55 border-r border-border/70" : "w-0 border-r-0",
        )}
      >
        <AssessmentShellNavigation
          assessments={assessments}
          onSignOut={() => void handleSignOut()}
          pathname={pathname}
          signOutPending={signOutMutation.isPending}
          userName={workspace?.user.display_name}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 items-center border-b border-border/70 bg-background/95 px-3 backdrop-blur sm:px-4 lg:px-5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileNavigationOpen(true)}
            aria-label={t("pages.appShell.sidebarToggle")}
            className="lg:hidden"
          >
            <PanelLeftIcon />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setLeftOpen((current) => !current)}
            aria-label={t("pages.appShell.sidebarToggle")}
            aria-pressed={leftOpen}
            className="hidden lg:inline-flex"
          >
            <PanelLeftIcon />
          </Button>

          <div className="ml-2 min-w-0 flex-1 border-l border-border/70 pl-3 lg:ml-3 lg:pl-4">
            <p className="truncate text-[0.6875rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {headerEyebrow}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {headerTitle}
            </p>
          </div>

          {assessmentId ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileRuntimeOpen(true)}
                aria-label={t("pages.appShell.runtimePanelTitle")}
                className="xl:hidden"
              >
                <PanelRightIcon />
              </Button>
              <Button
                type="button"
                variant={rightOpen ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setRightOpen((current) => !current)}
                aria-label={t("pages.appShell.runtimePanelTitle")}
                aria-pressed={rightOpen}
                className="hidden xl:inline-flex"
              >
                <PanelRightIcon />
              </Button>
            </div>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 bg-muted/10">
          <section
            data-slot="assessment-center-content"
            className="flex min-w-0 flex-1 flex-col bg-background"
          >
            <div
              data-slot="assessment-center-scroll"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {assessmentId ? (
                <div className="mx-auto min-h-full w-full max-w-190">
                  {children}
                </div>
              ) : (
                children
              )}
            </div>
          </section>

          {assessmentId && rightOpen ? (
            <aside
              data-slot="assessment-right-panel"
              className="hidden w-105 shrink-0 border-l border-border/70 bg-muted/20 xl:flex"
            >
              <AssessmentRuntimePanel
                assessmentId={assessmentId}
                assessmentName={assessment?.name}
                runtime={runtime}
                pathname={pathname}
                workflowItems={assessmentSection?.items ?? []}
                workflowLabel={assessmentSection?.label}
              />
            </aside>
          ) : null}
        </div>
      </div>

      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("pages.appShell.mobileTitle")}</SheetTitle>
            <SheetDescription>
              {t("pages.appShell.mobileDescription")}
            </SheetDescription>
          </SheetHeader>
          {navigation}
        </SheetContent>
      </Sheet>

      {assessmentId ? (
        <Sheet open={mobileRuntimeOpen} onOpenChange={setMobileRuntimeOpen}>
          <SheetContent side="right" className="w-[min(92vw,420px)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("pages.appShell.runtimePanelTitle")}</SheetTitle>
              <SheetDescription>{headerEyebrow}</SheetDescription>
            </SheetHeader>
            <AssessmentRuntimePanel
              assessmentId={assessmentId}
              assessmentName={assessment?.name}
              runtime={runtime}
              pathname={pathname}
              workflowItems={assessmentSection?.items ?? []}
              workflowLabel={assessmentSection?.label}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

function AssessmentShellNavigation({
  assessments,
  onNavigate,
  onSignOut,
  pathname,
  signOutPending,
  userName,
}: {
  assessments: AssessmentSummary[];
  onNavigate?: () => void;
  onSignOut: () => void;
  pathname: string;
  signOutPending: boolean;
  userName?: string;
}) {
  const recentAssessmentItems: AppShellNavigationItem[] = assessments
    .slice(0, 3)
    .map((assessment) => ({
      href: getAssessmentActiveHref(assessment),
      label: assessment.name,
      icon: FileCheck2Icon,
    }));
  const resolvedUserName = userName?.trim() || t("pages.appShell.productName");
  const userInitial = resolvedUserName.slice(0, 1).toUpperCase();

  function navigateTo(href: string) {
    onNavigate?.();
    window.location.assign(href);
  }

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="shrink-0 p-2.5">
        <Link
          href="/workspace"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          title={t("pages.appShell.productName")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <ShieldCheckIcon className="size-4" />
          </span>
          <span className="truncate text-sm font-semibold">
            {t("pages.appShell.productName")}
          </span>
        </Link>

        <Link
          href="/assessments/new"
          onClick={onNavigate}
          className="mt-4 flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <PlusIcon className="size-4 shrink-0" />
          <span>{t("pages.appShell.new")}</span>
        </Link>

        <button
          type="button"
          aria-disabled="true"
          title={t("pages.appShell.artifactsUnavailable")}
          className="mt-1 flex h-9 w-full cursor-default items-center gap-2 rounded-lg px-2 text-sm font-medium text-sidebar-foreground/70"
        >
          <BoxesIcon className="size-4 shrink-0" />
          <span>{t("pages.appShell.artifacts")}</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {recentAssessmentItems.length > 0 ? (
          <NavigationGroup
            collapsed={false}
            label={t("pages.appShell.recents")}
            items={recentAssessmentItems}
            onNavigate={onNavigate}
            pathname={pathname}
          />
        ) : null}
      </div>

      <div className="shrink-0 p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                aria-label={t("pages.appShell.accountMenu")}
              />
            }
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {userInitial}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {resolvedUserName}
            </span>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 text-sidebar-foreground/55" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={6}
            className="w-51"
          >
            <DropdownMenuItem onClick={() => navigateTo("/workspace/settings")}>
              <SettingsIcon />
              {t("pages.appShell.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigateTo("/workspace/settings#repositories")}
            >
              <PlugIcon />
              {t("pages.appShell.connectors")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signOutPending}
              onClick={onSignOut}
            >
              <LogOutIcon />
              {t("pages.appShell.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function NavigationGroup({
  className,
  collapsed,
  items,
  label,
  onNavigate,
  pathname,
}: {
  className?: string;
  collapsed: boolean;
  items: AppShellNavigationItem[];
  label: string;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <section className={className}>
      {!collapsed ? (
        <p className="mb-1.5 px-2 text-[0.6875rem] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
          {label}
        </p>
      ) : null}
      <nav className="space-y-1" aria-label={label}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item);
          const content = (
            <>
              <Icon className="size-4 shrink-0" />
              {!collapsed ? (
                <span className="truncate">{item.label}</span>
              ) : null}
              {!collapsed && active ? (
                <ChevronRightIcon className="ml-auto size-3.5 shrink-0" />
              ) : null}
            </>
          );
          const className = cn(
            "flex h-9 w-full items-center rounded-lg px-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed ? "justify-center" : "gap-2.5",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            item.disabled && "cursor-not-allowed opacity-45",
          );

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className={className}
                title={item.disabledReason ?? item.label}
              >
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={className}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

function AssessmentRuntimePanel({
  assessmentId,
  assessmentName,
  pathname,
  runtime,
  workflowItems,
  workflowLabel,
}: {
  assessmentId: string;
  assessmentName?: string;
  pathname: string;
  runtime: ReturnType<typeof useWorkspaceRuntime>;
  workflowItems: AppShellNavigationItem[];
  workflowLabel?: string;
}) {
  const timeline = runtime.getAssessmentRuntime(assessmentId);
  const run = timeline.currentRun;
  const recentActivity = timeline.recentActivity.slice(0, 4);

  return (
    <div className="flex min-h-0 w-full flex-col bg-background/95">
      <div className="shrink-0 border-b border-border/70 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {assessmentName ?? t("pages.appShell.assessmentTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {workflowLabel ?? t("pages.appShell.assessmentNavigation")}
            </p>
          </div>
          <Badge
            variant={
              timeline.connectionState ===
              WORKSPACE_RUNTIME_CONNECTION_STATES.connected
                ? "default"
                : "secondary"
            }
          >
            {connectionLabel(timeline.connectionState)}
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {workflowItems.length > 0 ? (
          <AssessmentWorkflowTimeline
            items={workflowItems}
            pathname={pathname}
            label={workflowLabel ?? t("pages.appShell.assessmentNavigation")}
          />
        ) : null}

        <div
          className={cn(
            workflowItems.length > 0 && "mt-6 border-t border-border/60 pt-5",
          )}
        >
          <p className="mb-2 text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("pages.appShell.runtimePanelTitle")}
          </p>
          {run ? (
            <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
                    {t("pages.appShell.runtimePanelLastUpdated")}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                    {stageLabel(run.stage)}
                  </p>
                </div>
                <Badge
                  variant={
                    run.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {runStatusLabel(run.status)}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
              {t("pages.appShell.runtimePanelEmpty")}
            </div>
          )}
        </div>

        {recentActivity.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("pages.appShell.runtimePanelRecentActivity")}
            </p>
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <div
                  key={`${activity.emittedAt}-${index}`}
                  className="rounded-xl border border-border/60 bg-card px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-foreground/40" />
                    <p className="truncate text-xs font-medium text-foreground">
                      {stageLabel(activity.stage)}
                    </p>
                  </div>
                  <p className="mt-1.5 line-clamp-2 pl-3.5 text-xs leading-5 text-muted-foreground">
                    {activity.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border/70 p-3">
        <Link
          href={`/assessments/${encodeURIComponent(assessmentId)}/technical-evidence`}
          className="flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t("pages.appShell.runtimePanelViewFull")}
        </Link>
      </div>
    </div>
  );
}

function AssessmentWorkflowTimeline({
  items,
  label,
  pathname,
}: {
  items: AppShellNavigationItem[];
  label: string;
  pathname: string;
}) {
  return (
    <section aria-label={label}>
      <p className="mb-3 text-[0.6875rem] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <ol className="space-y-0.5">
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = isNavigationItemActive(pathname, item);
          const last = index === items.length - 1;

          return (
            <li key={item.href} className="relative flex min-h-10 gap-3">
              {!last ? (
                <span
                  aria-hidden="true"
                  className="absolute left-3.75 top-8 h-[calc(100%-20px)] w-px bg-border"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background",
                  active
                    ? "border-foreground/25 bg-foreground text-background"
                    : "border-border text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <Link
                href={item.href}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function isNavigationItemActive(
  pathname: string,
  item: AppShellNavigationItem,
) {
  const [itemPath] = item.href.split("#");
  if (item.exact) return pathname === itemPath;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
