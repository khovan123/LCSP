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
  DeveloperTaskContextOutcome,
  EvidenceOutcome,
} from "../../types/developer-task.types";
import { RedactedFindingsList } from "./redacted-findings-list";
import { ScopeSummaryCard } from "./scope-summary-card";

export function DeveloperTaskWorkspace({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [context, setContext] = useState<DeveloperTaskContext | null>(null);
  const [contextOutcome, setContextOutcome] = useState<DeveloperTaskContextOutcome | null>(
    null
  );
  const [evidenceOutcome, setEvidenceOutcome] = useState<EvidenceOutcome | null>(
    null
  );

  useEffect(() => {
    let isActive = true;

    async function loadTask() {
      if (!assessmentId) return;

      // Load both context and evidence in parallel
      const [contextResult, evidenceResult] = await Promise.all([
        getDeveloperTaskContext(),
        getTechnicalEvidence(assessmentId),
      ]);

      if (!isActive) return;

      setContextOutcome(contextResult);
      setEvidenceOutcome(evidenceResult);
    }

    void loadTask().catch(() => {
      if (isActive) {
        setContextOutcome({ kind: "error" });
        setEvidenceOutcome({ kind: "error" });
      }
    });
    return () => {
      isActive = false;
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

            {/* Loading state */}
            {!contextOutcome || !evidenceOutcome ? (
              <p role="status" className="text-sm text-muted-foreground">
                {resolveMessage(appLocale, "pages.developerTask.loading")}
              </p>
            ) : null}

            {/* Redirect cases */}
            {(contextOutcome.kind === "redirect" || evidenceOutcome?.kind === "redirect") && (
              <>
                {contextOutcome.kind === "redirect" && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Redirecting...
                  </p>
                )}
                {evidenceOutcome?.kind === "redirect" && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Redirecting...
                  </p>
                )}
              </>
            )}

            {/* Access revoked */}
            {((contextOutcome.kind === "access_revoked" ||
                evidenceOutcome?.kind === "access_revoked") &&
                !(contextOutcome.kind === "redirect" ||
                  evidenceOutcome?.kind === "redirect")) && (
              <Alert variant="destructive" data-component="blocked-banner">
                <AlertTitle>
                  {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
                </AlertDescription>
              </Alert>
            )}

            {/* Error state */}
            {((contextOutcome.kind === "error" ||
                evidenceOutcome?.kind === "error") &&
                !(contextOutcome.kind === "access_revoked" ||
                  evidenceOutcome?.kind === "access_revoked") &&
                !(contextOutcome.kind === "redirect" ||
                  evidenceOutcome?.kind === "redirect")) && (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(appLocale, "pages.developerTask.errorTitle")}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, "pages.developerTask.errorDetail")}
                </AlertDescription>
              </Alert>
            )}

            {/* Success state - show scope and findings */}
            {contextOutcome.kind === "loaded" && contextOutcome.context && (
              <>
                {/* Scope mismatch check - if we're on an assessment page but context is for org scope */}
                {contextOutcome.context.scope.type === "assessment" &&
                  contextOutcome.context.scope.assessment.id !== assessmentId && (
                    <Alert variant="destructive" data-component="blocked-banner">
                      <AlertTitle>
                        {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
                      </AlertTitle>
                      <AlertDescription>
                        {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Show scope summary and findings when we have valid context */}
                {!(
                  contextOutcome.context.scope.type === "assessment" &&
                  contextOutcome.context.scope.assessment.id !== assessmentId
                ) && (
                  <>
                    <ScopeSummaryCard context={contextOutcome.context} />
                    {evidenceOutcome?.kind === "loaded" ? (
                      <RedactedFindingsList findings={evidenceOutcome.findings} />
                    ) : (evidenceOutcome?.kind === "empty" ||
                      evidenceOutcome?.kind === "loaded" && evidenceOutcome.findings.length === 0) ? (
                        <div className="mt-6">
                          <p className="text-muted-foreground">
                            {resolveMessage(appLocale, "pages.developerTask.emptyTitle")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {resolveMessage(appLocale, "pages.developerTask.emptyDescription")}
                          </p>
                        </div>
                      ) : evidenceOutcome?.kind === "loading" ? (
                        <p role="status" className="text-sm text-muted-foreground">
                          {resolveMessage(appLocale, "pages.developerTask.loading")}
                        </p>
                      ) : null}
                  </>
                )
              </>
              )
            }
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
