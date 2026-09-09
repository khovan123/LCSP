"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { resolveAppMessage } from "@/lib/i18n";
import {
  getProgramEvidenceGraphDetail,
  type ProgramEvidenceGraphDetail,
  type ProgramEvidenceGraphOverview,
} from "@/lib/api/evidence-graph-detail-client";
import {
  ARTIFACT_TYPES,
  type ArtifactRef,
} from "@/features/artifacts/types/artifact.types";
import {
  ARTIFACT_OPEN_KINDS,
  buildArtifactOpenTarget,
} from "@/features/artifacts/utils/artifact-routes";
import { selectEvidencePaths } from "../../utils/program-evidence-path-map";

type DrawerContextValue = {
  openArtifact: (ref: ArtifactRef, trigger?: HTMLElement | null) => void;
  overview: ProgramEvidenceGraphOverview | null;
};
const DrawerContext = createContext<DrawerContextValue>({
  openArtifact: () => undefined,
  overview: null,
});

export function ProgramEvidenceGraphProvider({
  assessmentId,
  children,
}: {
  assessmentId?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ProgramEvidenceGraphDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const openArtifact = (ref: ArtifactRef, trigger?: HTMLElement | null) => {
    if (
      ref.type === ARTIFACT_TYPES.programEvidenceGraph &&
      ref.assessmentId === assessmentId
    ) {
      triggerRef.current = trigger ?? null;
      setOpen(true);
    }
  };
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      const trigger = triggerRef.current;
      if (trigger) requestAnimationFrame(() => trigger.focus());
    }
    wasOpenRef.current = open;
  }, [open]);
  useEffect(() => {
    if (!assessmentId) return;
    let active = true;
    // The assessment remains mounted while optional graph metrics load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void getProgramEvidenceGraphDetail(assessmentId)
      .then((value) => {
        if (active) {
          setDetail(value);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setDetail(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [assessmentId]);
  return (
    <DrawerContext.Provider
      value={{ openArtifact, overview: detail?.overview ?? null }}
    >
      {children}
      {assessmentId ? (
        <ProgramEvidenceGraphDrawer
          assessmentId={assessmentId}
          detail={detail}
          loading={loading}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </DrawerContext.Provider>
  );
}

export function useProgramEvidenceGraphDrawer() {
  return useContext(DrawerContext);
}

function ProgramEvidenceGraphDrawer({
  assessmentId,
  detail,
  loading,
  open,
  onOpenChange,
}: {
  assessmentId: string;
  detail: ProgramEvidenceGraphDetail | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full min-h-0 w-full max-w-lg gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle>
                {resolveAppMessage("pages.assessmentFlow.graph.title" as never)}
              </SheetTitle>
              <SheetDescription>
                {resolveAppMessage(
                  "pages.assessmentFlow.graph.drawerDescription" as never,
                )}
              </SheetDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label={resolveAppMessage(
                "pages.assessmentFlow.graph.close" as never,
              )}
            >
              <XIcon />
            </Button>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {resolveAppMessage("pages.assessmentFlow.graph.loading" as never)}
            </p>
          ) : detail ? (
            <GraphDetail assessmentId={assessmentId} detail={detail} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {resolveAppMessage(
                "pages.assessmentFlow.graph.loadError" as never,
              )}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GraphDetail({
  assessmentId,
  detail,
}: {
  assessmentId: string;
  detail: ProgramEvidenceGraphDetail;
}) {
  const paths = selectEvidencePaths(detail.paths.nodes, detail.paths.edges);
  const artifactsTarget = buildArtifactOpenTarget({
    assessmentId,
    type: ARTIFACT_TYPES.programEvidenceGraph,
  });
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border/70 bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">
          {resolveAppMessage(
            "pages.assessmentFlow.graph.repositorySnapshot" as never,
          )}
        </p>
        <p className="mt-2 text-base font-semibold">
          {detail.repository.repository_full_name ?? "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {detail.repository.branch ?? detail.repository.ref ?? "—"} ·{" "}
          {detail.repository.pinned_commit ?? "—"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {detail.repository.status ??
            resolveAppMessage(
              "pages.assessmentFlow.graph.unavailable" as never,
            )}
        </p>
      </section>
      <section>
        <h3 className="text-sm font-semibold">
          {resolveAppMessage("pages.assessmentFlow.graph.overview" as never)}
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          {[
            ["servicesScanned", detail.overview.services_scanned],
            ["codeSymbolsIndexed", detail.overview.code_symbols_indexed],
            ["aiProviderCallPaths", detail.overview.ai_provider_call_paths],
            ["evidenceMappedScope", detail.overview.evidence_mapped_scope],
          ].map(([key, value]) => (
            <div className="rounded-lg border border-border/60 p-3" key={key}>
              <dt className="text-xs text-muted-foreground">
                {resolveAppMessage(
                  `pages.assessmentFlow.graph.${key}` as never,
                )}
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {value === null ? "—" : value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="text-sm font-semibold">
          {resolveAppMessage("pages.assessmentFlow.graph.pathMap" as never)}
        </h3>
        <div className="mt-3 space-y-4">
          {paths.length ? (
            paths.map((path, pathIndex) => (
              <div className="space-y-2" key={`path-${pathIndex}`}>
                {path.nodes.map((node, index) => (
                  <div key={node.id}>
                    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                      <p className="break-words text-xs font-medium">
                        {node.label}
                      </p>
                      <p className="break-words text-[0.6875rem] text-muted-foreground">
                        {node.kind}
                        {node.file
                          ? ` · ${node.file}${node.line ? `:${node.line}` : ""}`
                          : ""}
                      </p>
                    </div>
                    {path.edges[index] ? (
                      <div className="flex items-center gap-2 px-3 py-1 text-[0.6875rem] text-muted-foreground">
                        <span
                          className="h-3 w-px bg-border"
                          aria-hidden="true"
                        />
                        <span className="break-words">
                          {path.edges[index].relationship}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              {resolveAppMessage(
                "pages.assessmentFlow.graph.unavailable" as never,
              )}
            </p>
          )}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-semibold">
          {resolveAppMessage("pages.assessmentFlow.graph.claims" as never)}
        </h3>
        {detail.claims.length ? (
          <div className="mt-3 space-y-2">
            {detail.claims.map((claim) => (
              <div
                className="rounded-lg border border-border/60 p-3"
                key={claim.id}
              >
                <p className="text-xs">{claim.meaning}</p>
                <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                  {claim.symbol ?? "—"}
                  {claim.file
                    ? ` · ${claim.file}${claim.line ? `:${claim.line}` : ""}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {resolveAppMessage("pages.assessmentFlow.graph.noClaims" as never)}
          </p>
        )}
      </section>
      <section className="border-t border-border/60 pt-4">
        <h3 className="text-sm font-semibold">
          {resolveAppMessage("pages.assessmentFlow.graph.provenance" as never)}
        </h3>
        {detail.provenance.finding ? (
          <div className="mt-3 rounded-lg border border-border/60 p-3">
            <p className="text-[0.6875rem] font-semibold text-muted-foreground">
              {resolveAppMessage("pages.assessmentFlow.graph.finding" as never)}
            </p>
            <p className="mt-1 break-words text-xs">
              {detail.provenance.finding.meaning}
            </p>
            {detail.provenance.finding.source ? (
              <SourceTrace source={detail.provenance.finding.source} />
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 rounded-lg border border-border/60 p-3">
          <p className="text-[0.6875rem] font-semibold text-muted-foreground">
            {resolveAppMessage(
              "pages.assessmentFlow.graph.evidenceSource" as never,
            )}
          </p>
          {detail.provenance.source ? (
            <SourceTrace source={detail.provenance.source} />
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {resolveAppMessage(
                "pages.assessmentFlow.graph.unavailable" as never,
              )}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium">
            {resolveAppMessage("pages.assessmentFlow.graph.generated" as never)}
            :
          </span>{" "}
          {new Date(detail.provenance.generated_at).toLocaleString()}
        </p>
        {artifactsTarget.kind === ARTIFACT_OPEN_KINDS.internal ||
        artifactsTarget.kind === ARTIFACT_OPEN_KINDS.download ? (
          <Link
            className="mt-3 inline-flex text-xs font-medium text-primary hover:underline"
            href={artifactsTarget.href}
          >
            {resolveAppMessage(
              "pages.assessmentFlow.graph.openArtifacts" as never,
            )}
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function SourceTrace({
  source,
}: {
  source: NonNullable<ProgramEvidenceGraphDetail["provenance"]["source"]>;
}) {
  const location = source.file
    ? `${source.file}${source.start_line ? `:${source.start_line}${source.end_line && source.end_line !== source.start_line ? `–${source.end_line}` : ""}` : ""}`
    : null;
  return (
    <div className="mt-1 space-y-1 text-xs text-muted-foreground">
      {source.symbol ? (
        <p className="break-words font-medium text-foreground">
          {source.symbol}
        </p>
      ) : null}
      {location ? <p className="break-words">{location}</p> : null}
      {source.evidence_reference ? (
        <p className="break-all text-[0.625rem]">
          {resolveAppMessage(
            "pages.assessmentFlow.graph.evidenceReference" as never,
          )}
          : {source.evidence_reference}
        </p>
      ) : null}
    </div>
  );
}
