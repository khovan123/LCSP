"use client";

import { useState } from "react";
import { resolveMessage } from "@lcsp/i18n";
import {
  ChevronRightIcon,
  FileCheck2Icon,
  ListIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { getAssessmentActiveHref } from "@/lib/api/workspace-client";
import { useAssessmentsQuery } from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";

export function SidebarAssessmentList() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const assessmentsQuery = useAssessmentsQuery();
  const assessments =
    assessmentsQuery.data?.kind === "loaded"
      ? assessmentsQuery.data.assessments
      : [];
  const visibleAssessments = assessments.slice(0, 3);
  const normalizedSearch = assessmentSearch.trim().toLocaleLowerCase();
  const filteredAssessments = normalizedSearch
    ? assessments.filter((assessment) =>
        assessment.name.toLocaleLowerCase().includes(normalizedSearch),
      )
    : assessments;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      setAssessmentSearch("");
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("pages.appShell.recentAssessments")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleAssessments.map((assessment) => {
            const baseHref = `/assessments/${encodeURIComponent(assessment.id)}`;
            const activeHref = getAssessmentActiveHref(assessment);
            const active = pathname.startsWith(baseHref);

            return (
              <SidebarMenuItem key={assessment.id}>
                <SidebarMenuButton
                  render={<Link href={activeHref} />}
                  isActive={active}
                  tooltip={assessment.name}
                >
                  <FileCheck2Icon />
                  <span>{assessment.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {assessmentsQuery.isLoading ? (
            <SidebarMenuItem>
              <SidebarMenuButton type="button" disabled>
                <Spinner data-icon="inline-start" />
                <span>{t("pages.workspace.loadingAssessments")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          <SidebarMenuItem>
            <Collapsible
              open={isOpen}
              onOpenChange={handleOpenChange}
              className="relative"
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    type="button"
                    tooltip={t("pages.appShell.moreAssessments")}
                    className="w-full cursor-pointer"
                  />
                }
              >
                <ListIcon />
                <span>{t("pages.appShell.moreAssessments")}</span>
                <ChevronRightIcon className="ml-auto size-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute left-0 top-full z-40 mt-1 w-72 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md ring-1 ring-foreground/10">
                <div className="relative mb-2">
                  <SearchIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={assessmentSearch}
                    onChange={(event) =>
                      setAssessmentSearch(event.target.value)
                    }
                    placeholder={t("pages.appShell.searchAssessments")}
                    className="h-8 pl-8"
                  />
                </div>
                <div className="space-y-1">
                  {filteredAssessments.map((assessment) => {
                    const href = getAssessmentActiveHref(assessment);

                    return (
                      <Link
                        key={assessment.id}
                        href={href}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleOpenChange(false)}
                      >
                        <FileCheck2Icon className="size-4 shrink-0" />
                        <span className="truncate">{assessment.name}</span>
                      </Link>
                    );
                  })}
                  {filteredAssessments.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      {t("pages.appShell.noAssessmentMatches")}
                    </p>
                  ) : null}
                  <Link
                    href="/assessments"
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleOpenChange(false)}
                  >
                    <ListIcon className="size-4 shrink-0" />
                    <span>{t("pages.appShell.allAssessments")}</span>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
