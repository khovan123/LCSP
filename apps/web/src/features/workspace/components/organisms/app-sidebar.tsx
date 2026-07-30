"use client";

import { resolveMessage } from "@lcsp/i18n";
import { SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSignOutMutation } from "@/lib/api/auth-queries";
import {
  useAssessmentsQuery,
  useWorkspaceQuery,
} from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";

import type { AppShellNavigationSection } from "../../types/app-shell.types";
import type { AssessmentSummary } from "../../types/workspace.types";
import { SidebarAssessmentList } from "../molecules/sidebar-assessment-list";
import { WorkspaceSwitcher } from "../molecules/workspace-switcher";

export function AppSidebar({
  sections,
}: {
  sections: AppShellNavigationSection[];
}) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState("");
  const signOutMutation = useSignOutMutation();
  const workspaceQuery = useWorkspaceQuery();
  const assessmentsQuery = useAssessmentsQuery();
  const workspace =
    workspaceQuery.data?.kind === "loaded"
      ? workspaceQuery.data.workspace
      : undefined;
  const assessments =
    assessmentsQuery.data?.kind === "loaded"
      ? assessmentsQuery.data.assessments
      : undefined;

  async function handleSignOut() {
    await signOutMutation.mutateAsync();
    window.location.assign("/sign-in");
  }

  useEffect(() => {
    function syncHash() {
      setCurrentHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      mobileTitle={t("pages.appShell.mobileTitle")}
      mobileDescription={t("pages.appShell.mobileDescription")}
    >
      <SidebarHeader className="border-b border-sidebar-border/70">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/workspace" />}
              tooltip={t("pages.appShell.productName")}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <ShieldCheckIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">
                  {t("pages.appShell.productName")}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  {t("pages.appShell.productTagline")}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {workspace && workspace.membership.role !== SUBJECT_ROLES.manager ? (
          <div className="px-2 pb-2">
            <p className="mb-1 px-2 text-xs font-semibold tracking-widest text-sidebar-foreground/55 uppercase">
              {t("pages.appShell.currentWorkspace")}
            </p>
            <WorkspaceSwitcher placement="sidebar" />
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section, index) => (
          <Fragment key={section.label}>
            <SidebarGroup>
              <SidebarGroupLabel>
                {resolveSectionLabel(section, assessments)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const [itemPath, itemHash = ""] = item.href.split("#");
                    const active = itemHash
                      ? pathname === itemPath && currentHash === `#${itemHash}`
                      : item.exact
                        ? pathname === itemPath && currentHash === ""
                        : pathname.startsWith(itemPath);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          render={<Link href={item.href} />}
                          tooltip={item.disabledReason ?? item.label}
                          onClick={(event) => {
                            if (!item.disabled) return;
                            event.preventDefault();
                            toast.error(item.disabledReason);
                          }}
                          className={
                            item.disabled
                              ? "cursor-not-allowed opacity-55"
                              : undefined
                          }
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {index === 0 ? <SidebarAssessmentList /> : null}
          </Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signOutMutation.isPending}
              tooltip={t("pages.appShell.signOut")}
              className="cursor-pointer"
            >
              <LogOutIcon className="text-destructive" />
              <span className="text-destructive">
                {t("pages.appShell.signOut")}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-sidebar-foreground/65">
          <ShieldCheckIcon className="size-4 text-sidebar-primary" />
          <span>{t("pages.appShell.secureWorkspace")}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}

function resolveSectionLabel(
  section: AppShellNavigationSection,
  assessments?: AssessmentSummary[],
) {
  if (section.kind !== "assessment") {
    return section.label;
  }

  if (!section.assessmentId) {
    return t("pages.appShell.chooseAssessmentToView");
  }

  return (
    assessments?.find((assessment) => assessment.id === section.assessmentId)
      ?.name ?? section.label
  );
}
