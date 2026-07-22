"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheckIcon } from "lucide-react";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { WorkspaceSidebar } from "@/features/workspace/components/organisms/workspace-sidebar";
import { getDeveloperTaskContext } from "@/lib/api/developer-task-client";
import { getTechnicalEvidence } from "@/lib/api/evidence-client";
import { appLocale } from "@/lib/locale";

import type {
  DeveloperFinding,
  DeveloperTaskContext,
} from "../../types/developer-task.types";
import { RedactedFindingsList } from "./redacted-findings-list";
import { ScopeSummaryCard } from "./scope-summary-card";

type PageState = "loading" | "loaded" | "empty" | "access_revoked" | "error";

export function DeveloperTaskWorkspace({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [context, setContext] = useState<DeveloperTaskContext | null>(null);
  const [findings, setFindings] = useState<DeveloperFinding[]>([]);

  useEffect(() => {
    let isActive = true;
    let requestInFlight = false;

    async function loadTask() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const [contextOutcome, evidenceOutcome] = await Promise.all([
          getDeveloperTaskContext(),
          getTechnicalEvidence(assessmentId),
        ]);
        if (!isActive) return;

        if (contextOutcome.kind === "redirect") {
          setContext(null);
          setFindings([]);
          router.replace(contextOutcome.location);
          return;
        }
        if (evidenceOutcome.kind === "redirect") {
          setContext(null);
          setFindings([]);
          router.replace(evidenceOutcome.location);
          return;
        }
        if (
          contextOutcome.kind === "access_revoked" ||
          evidenceOutcome.kind === "access_revoked"
        ) {
          setContext(null);
          setFindings([]);
          setPageState("access_revoked");
          return;
        }
        if (contextOutcome.kind !== "loaded" || evidenceOutcome.kind === "error") {
          setContext(null);
          setFindings([]);
          setPageState("error");
          return;
        }
        if (
          contextOutcome.context.scope.type === "assessment" &&
          contextOutcome.context.scope.assessment.id !== assessmentId
        ) {
          setContext(null);
          setFindings([]);
          setPageState("access_revoked");
          return;
        }

        setContext(contextOutcome.context);
        if (evidenceOutcome.kind === "empty") {
          setFindings([]);
          setPageState("empty");
          return;
        }
        if (evidenceOutcome.kind === "loaded") {
          setFindings(evidenceOutcome.findings);
          setPageState(evidenceOutcome.findings.length === 0 ? "empty" : "loaded");
          return;
        }

        setContext(null);
        setFindings([]);
        setPageState("error");
      } finally {
        requestInFlight = false;
      }
    }

    void loadTask().catch(() => {
      if (isActive) {
        setContext(null);
        setFindings([]);
        setPageState("error");
      }
    });
    const revalidate = () => {
      void loadTask().catch(() => {
        if (isActive) {
          setContext(null);
          setFindings([]);
          setPageState("error");
        }
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const intervalId = window.setInterval(revalidate, 5_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [assessmentId, router]);

  const navigationLabel = resolveMessage(
    appLocale,
    "pages.developerTask.navigationLabel",
  );
  const navigationItems = [
    {
      href: `/developer/assessments/${encodeURIComponent(assessmentId)}`,
      label: resolveMessage(appLocale, "pages.developerTask.taskNav"),
      icon: ClipboardCheckIcon,
    },
  ];

  return (
    <SidebarProvider>
      <WorkspaceSidebar
        productName="LCSP"
        navigationLabel={navigationLabel}
        mobileTitle={resolveMessage(appLocale, "pages.developerTask.sidebarTitle")}
        mobileDescription={resolveMessage(
          appLocale,
          "pages.developerTask.sidebarDescription",
        )}
        items={navigationItems}
      />
      <SidebarInset>
        <main className="flex min-h-dvh flex-col gap-6 bg-background px-6 py-8 text-foreground">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <SidebarTrigger
              label={resolveMessage(appLocale, "pages.developerTask.sidebarToggle")}
            />
            <span className="text-sm text-muted-foreground">{navigationLabel}</span>
          </div>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <header>
              <h1 className="text-3xl font-semibold tracking-tight">
                {resolveMessage(appLocale, "pages.developerTask.pageTitle")}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {resolveMessage(appLocale, "pages.developerTask.pageDescription")}
              </p>
            </header>

            {pageState === "loading" ? (
              <p role="status" className="text-sm text-muted-foreground">
                {resolveMessage(appLocale, "pages.developerTask.loading")}
              </p>
            ) : null}

            {pageState === "access_revoked" ? (
              <Alert variant="destructive" data-component="blocked-banner">
                <AlertTitle>
                  {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
                </AlertDescription>
              </Alert>
            ) : null}

            {pageState === "error" ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(appLocale, "pages.developerTask.errorTitle")}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, "pages.developerTask.errorDetail")}
                </AlertDescription>
              </Alert>
            ) : null}

            {context && (pageState === "loaded" || pageState === "empty") ? (
              <>
                <ScopeSummaryCard context={context} />
                <RedactedFindingsList findings={findings} />
              </>
            ) : null}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}