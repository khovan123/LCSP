"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  selectEvidenceTopology,
  zoomAtPoint,
  type ViewportState,
} from "../../utils/program-evidence-path-map";

const MAX_PERSISTENT_RELATIONSHIP_LABELS = 8;

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
  const requestVersionRef = useRef(0);
  const loadDetail = useCallback(() => {
    if (!assessmentId) return;
    const requestVersion = ++requestVersionRef.current;
    // Keep a previously rendered graph visible while a later open refreshes it.
    setLoading(true);
    void getProgramEvidenceGraphDetail(assessmentId)
      .then((value) => {
        if (requestVersion === requestVersionRef.current) {
          setDetail(value);
          setLoading(false);
        }
      })
      .catch(() => {
        if (requestVersion === requestVersionRef.current) {
          setDetail(null);
          setLoading(false);
        }
      });
  }, [assessmentId]);
  const openArtifact = (ref: ArtifactRef, trigger?: HTMLElement | null) => {
    if (
      ref.type === ARTIFACT_TYPES.programEvidenceGraph &&
      ref.assessmentId === assessmentId
    ) {
      triggerRef.current = trigger ?? null;
      setOpen(true);
      loadDetail();
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
    // The assessment remains mounted while optional graph metrics load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetail();
  }, [assessmentId, loadDetail]);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[min(820px,calc(100vh-2rem))] w-[min(1320px,calc(100vw-2rem))] max-w-none gap-0 p-0"
      >
        <DialogHeader className="relative shrink-0 justify-between px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>
                {resolveAppMessage("pages.assessmentFlow.graph.title" as never)}
              </DialogTitle>
              <DialogDescription>
                {resolveAppMessage(
                  "pages.assessmentFlow.graph.drawerDescription" as never,
                )}
              </DialogDescription>
            </div>
            <Button
              className="absolute right-3 top-3"
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
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner
                aria-label={resolveAppMessage(
                  "pages.assessmentFlow.graph.loading" as never,
                )}
              />
              <span>
                {resolveAppMessage(
                  "pages.assessmentFlow.graph.loading" as never,
                )}
              </span>
            </div>
          ) : detail ? (
            <GraphFirstDetail assessmentId={assessmentId} detail={detail} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {resolveAppMessage(
                "pages.assessmentFlow.graph.loadError" as never,
              )}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GraphFirstDetail({
  assessmentId,
  detail,
}: {
  assessmentId: string;
  detail: ProgramEvidenceGraphDetail;
}) {
  const topology = selectEvidenceTopology(
    detail.paths.nodes,
    detail.paths.edges,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  const { zoom, pan } = viewport;
  const dragRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    nodeId: string | null;
    dragging: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const selected =
    topology.nodes.find((node) => node.id === selectedId) ?? null;
  const incoming = selected
    ? topology.edges.filter((edge) => edge.target === selected.id)
    : [];
  const outgoing = selected
    ? topology.edges.filter((edge) => edge.source === selected.id)
    : [];
  const selectedIncidentDegree = incoming.length + outgoing.length;
  const showPersistentLabels =
    selectedIncidentDegree > 0 &&
    selectedIncidentDegree <= MAX_PERSISTENT_RELATIONSHIP_LABELS;
  const width = Math.max(
    900,
    ...Array.from(topology.positions.values()).map(
      (position) => position.x + 190,
    ),
  );
  const height = Math.max(
    620,
    ...Array.from(topology.positions.values()).map(
      (position) => position.y + 60,
    ),
  );
  const target = buildArtifactOpenTarget({
    assessmentId,
    type: ARTIFACT_TYPES.programEvidenceGraph,
  });
  const selectedSource = selected?.file
    ? {
        file: selected.file,
        symbol: selected.symbol,
        start_line: selected.line,
        end_line: null,
        evidence_reference: null,
      }
    : null;
  const selectedClaims = selected
    ? detail.claims.filter(
        (claim) =>
          (selected.symbol && claim.symbol === selected.symbol) ||
          (selected.file &&
            claim.file === selected.file &&
            (selected.line === null || claim.line === selected.line)),
      )
    : [];
  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_330px]">
      <section
        className="flex min-h-0 flex-col overflow-hidden border-r border-border/70 bg-muted/20 p-4"
        aria-label={resolveAppMessage(
          "pages.assessmentFlow.graph.pathMap" as never,
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              {detail.repository.repository_full_name ??
                resolveAppMessage(
                  "pages.assessmentFlow.graph.unavailable" as never,
                )}
            </p>
            <p className="text-[0.6875rem] text-muted-foreground">
              {detail.repository.branch ?? detail.repository.ref ?? "—"} ·{" "}
              {detail.repository.pinned_commit ?? "—"}
            </p>
          </div>
          <span className="text-[0.6875rem] text-muted-foreground">
            {topology.nodes.length} nodes · {topology.edges.length} edges
          </span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-background">
          <div
            className="absolute right-3 top-3 z-10 flex gap-1 rounded-md border border-border/70 bg-card/90 p-1 shadow-sm"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom out"
              onClick={() =>
                setViewport((state) =>
                  zoomAtPoint(
                    state,
                    { x: width / 2, y: height / 2 },
                    state.zoom - 0.15,
                  ),
                )
              }
            >
              −
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Fit graph"
              onClick={() => {
                setViewport({
                  zoom: Math.max(0.2, Math.min(1, 900 / width, 620 / height)),
                  pan: { x: 0, y: 0 },
                });
              }}
            >
              ⌂
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom in"
              onClick={() =>
                setViewport((state) =>
                  zoomAtPoint(
                    state,
                    { x: width / 2, y: height / 2 },
                    state.zoom + 0.15,
                  ),
                )
              }
            >
              +
            </Button>
          </div>
          <svg
            className="h-full min-h-[620px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            onPointerDown={(event) => {
              const target = event.target as Element;
              dragRef.current = {
                x: event.clientX,
                y: event.clientY,
                panX: pan.x,
                panY: pan.y,
                nodeId:
                  target
                    .closest?.("[data-node-id]")
                    ?.getAttribute("data-node-id") ?? null,
                dragging: false,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              const distance = Math.hypot(
                event.clientX - dragRef.current.x,
                event.clientY - dragRef.current.y,
              );
              if (!dragRef.current.dragging && distance < 6) return;
              dragRef.current.dragging = true;
              suppressClickRef.current = true;
              const rect = event.currentTarget.getBoundingClientRect();
              const scaleX = width / rect.width;
              const scaleY = height / rect.height;
              const dragStart = dragRef.current;
              if (!dragStart) return;
              const nextPan = {
                x: dragStart.panX + (event.clientX - dragStart.x) * scaleX,
                y: dragStart.panY + (event.clientY - dragStart.y) * scaleY,
              };
              setViewport((state) => ({
                ...state,
                pan: {
                  x: nextPan.x,
                  y: nextPan.y,
                },
              }));
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              if (drag && !drag.dragging && drag.nodeId)
                setSelectedId(drag.nodeId);
              dragRef.current = null;
              event.currentTarget.releasePointerCapture?.(event.pointerId);
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              suppressClickRef.current = false;
            }}
            onWheel={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const point = {
                x: ((event.clientX - rect.left) / rect.width) * width,
                y: ((event.clientY - rect.top) / rect.height) * height,
              };
              setViewport((state) =>
                zoomAtPoint(state, point, state.zoom - event.deltaY * 0.001),
              );
            }}
            aria-label={resolveAppMessage(
              "pages.assessmentFlow.graph.pathMap" as never,
            )}
          >
            <defs>
              <marker
                id="pge-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L7,3 z" className="fill-brand" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {topology.edges.map((edge) => {
                const from = topology.positions.get(edge.source);
                const to = topology.positions.get(edge.target);
                if (!from || !to) return null;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x + 150}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className={
                        selected &&
                        (edge.source === selected.id ||
                          edge.target === selected.id)
                          ? "stroke-brand"
                          : selected
                            ? "stroke-muted-foreground/15"
                            : "stroke-muted-foreground/25"
                      }
                      strokeWidth={
                        selected &&
                        (edge.source === selected.id ||
                          edge.target === selected.id)
                          ? 2
                          : 1
                      }
                      markerEnd="url(#pge-arrow)"
                      style={{ pointerEvents: "stroke" }}
                      tabIndex={0}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onFocus={() => setHoveredEdgeId(edge.id)}
                      onBlur={() => setHoveredEdgeId(null)}
                    />
                    <text
                      x={(from.x + to.x + 150) / 2}
                      y={(from.y + to.y) / 2 - 4}
                      className="pointer-events-none fill-muted-foreground text-[9px]"
                      visibility={
                        selected &&
                        (showPersistentLabels || hoveredEdgeId === edge.id) &&
                        (edge.source === selected.id ||
                          edge.target === selected.id)
                          ? "visible"
                          : "hidden"
                      }
                    >
                      {edge.relationship}
                    </text>
                  </g>
                );
              })}
              {topology.nodes.map((node) => {
                const position = topology.positions.get(node.id);
                if (!position) return null;
                const selectedNode = node.id === selected?.id;
                return (
                  <g
                    key={node.id}
                    data-node-id={node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={node.label}
                    aria-pressed={selectedNode}
                    onClick={() => {
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }
                      setSelectedId(node.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ")
                        setSelectedId(node.id);
                    }}
                  >
                    <rect
                      x={position.x}
                      y={position.y - 22}
                      width="150"
                      height="44"
                      rx="8"
                      className={
                        selectedNode
                          ? "fill-brand/20 stroke-brand"
                          : "fill-card stroke-border"
                      }
                      strokeWidth={selectedNode ? 2 : 1}
                    />
                    <text
                      x={position.x + 8}
                      y={position.y - 3}
                      className="fill-foreground text-[10px]"
                    >
                      {node.label.slice(0, 28)}
                    </text>
                    <text
                      x={position.x + 8}
                      y={position.y + 12}
                      className="fill-muted-foreground text-[8px]"
                    >
                      {node.kind}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </section>
      <aside className="min-h-0 overflow-auto bg-card p-5">
        <h3 className="text-base font-semibold break-words">
          {selected?.label ??
            resolveAppMessage(
              "pages.assessmentFlow.graph.unavailable" as never,
            )}
        </h3>
        {selected ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected.kind}
            </p>
            {selected.file ? (
              <p className="mt-3 break-words text-xs">
                {selected.file}
                {selected.line ? `:${selected.line}` : ""}
              </p>
            ) : null}
            {selected.symbol ? (
              <p className="mt-1 break-words text-xs font-medium">
                {selected.symbol}
              </p>
            ) : null}
            <RelationshipList
              title="Incoming"
              edges={incoming}
              nodes={topology.nodes}
              incoming
            />
            <section className="mt-5 border-t border-border/60 pt-4">
              <h4 className="text-sm font-semibold">
                {resolveAppMessage(
                  "pages.assessmentFlow.graph.claims" as never,
                )}
              </h4>
              {selectedClaims.length ? (
                <div className="mt-2 space-y-2">
                  {selectedClaims.map((claim) => (
                    <div
                      className="rounded-md border border-border/60 p-2"
                      key={claim.id}
                    >
                      <p className="break-words text-xs">{claim.meaning}</p>
                      {claim.evidence_refs.length ? (
                        <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                          {resolveAppMessage(
                            "pages.assessmentFlow.graph.evidence" as never,
                          )}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {resolveAppMessage(
                    "pages.assessmentFlow.graph.noClaims" as never,
                  )}
                </p>
              )}
            </section>
            <RelationshipList
              title="Outgoing"
              edges={outgoing}
              nodes={topology.nodes}
            />
          </>
        ) : null}
        <div className="mt-6 border-t border-border/60 pt-4">
          <h4 className="text-sm font-semibold">
            {resolveAppMessage(
              "pages.assessmentFlow.graph.provenance" as never,
            )}
          </h4>
          {selectedSource ? (
            <SourceTrace source={selectedSource} />
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {resolveAppMessage(
                "pages.assessmentFlow.graph.unavailable" as never,
              )}
            </p>
          )}
          {target.kind === ARTIFACT_OPEN_KINDS.internal ||
          target.kind === ARTIFACT_OPEN_KINDS.download ? (
            <Link
              className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
              href={target.href}
            >
              {resolveAppMessage(
                "pages.assessmentFlow.graph.openArtifacts" as never,
              )}
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function RelationshipList({
  title,
  edges,
  nodes,
  incoming = false,
}: {
  title: string;
  edges: ProgramEvidenceGraphDetail["paths"]["edges"];
  nodes: ProgramEvidenceGraphDetail["paths"]["nodes"];
  incoming?: boolean;
}) {
  return (
    <section className="mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground">{title}</h4>
      <ul className="mt-2 space-y-1 text-xs">
        {edges.map((edge) => {
          const node = nodes.find(
            (candidate) =>
              candidate.id === (incoming ? edge.source : edge.target),
          );
          return (
            <li className="break-words" key={edge.id}>
              {node?.label ?? "—"}{" "}
              <span className="text-muted-foreground">
                {incoming ? `← ${edge.relationship}` : `→ ${edge.relationship}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function GraphDetail({
  assessmentId,
  detail,
}: {
  assessmentId: string;
  detail: ProgramEvidenceGraphDetail;
}) {
  const paths: Array<{
    nodes: ProgramEvidenceGraphDetail["paths"]["nodes"];
    edges: ProgramEvidenceGraphDetail["paths"]["edges"];
  }> = [];
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
    </div>
  );
}
