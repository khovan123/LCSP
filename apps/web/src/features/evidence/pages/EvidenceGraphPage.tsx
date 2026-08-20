/**
 * Evidence Graph Page Container
 *
 * Top-level page component that orchestrates evidence graph visualization.
 * Fetches data, manages state, and renders the full UI.
 */

"use client";

import { EvidenceGraphViewer } from "@/features/evidence/components/organisms/EvidenceGraphViewer";
import { GraphUIProvider } from "@/features/evidence/context/GraphUIProvider";
import type { GraphScope } from "@/features/evidence/types/evidence-graph.types";
import { isGraphApiError } from "@/lib/api/evidence-graph-client";
import { useEvidenceGraph } from "@/lib/api/evidence-graph-queries";

export interface EvidenceGraphPageProps {
  assessmentId: string;
  scope?: GraphScope;
  clusterId?: string;
  className?: string;
}

/**
 * Evidence graph page component.
 *
 * Wraps GraphUIProvider and manages data fetching.
 *
 * @example
 * export default function AssessmentEvidencePage() {
 *   return (
 *     <EvidenceGraphPage
 *       assessmentId="assessment-123"
 *       scope="overview"
 *     />
 *   );
 * }
 */
export function EvidenceGraphPage({
  assessmentId,
  scope = "overview",
  clusterId,
  className = "",
}: EvidenceGraphPageProps) {
  // Fetch evidence graph data
  const {
    data: apiResult,
    isLoading,
    error: queryError,
    refetch,
  } = useEvidenceGraph(
    {
      assessmentId,
      scope,
      clusterId,
      cache: "no-store",
    },
    true,
  );

  // Extract data or error from API result
  let graphData = null;
  let apiError = null;
  let errorCode = undefined;

  if (apiResult && !isLoading) {
    if (isGraphApiError(apiResult)) {
      apiError = new Error(apiResult.problem.detailKey);
      errorCode = apiResult.problem.code;
    } else {
      graphData = apiResult.data;
    }
  }

  const error = queryError || apiError;

  return (
    <GraphUIProvider
      initialState={{
        viewMode: scope === "detail" ? "2d" : "3d",
        display: {
          showNodeLabels: true,
          showEdgeLabels: false,
          showClusters: scope === "overview",
          highlightSeverity: true,
          useColors: true,
          nodeSize: "medium",
          edgeWidth: "medium",
        },
      }}
    >
      <EvidenceGraphViewer
        nodes={graphData?.nodes ?? []}
        edges={graphData?.edges ?? []}
        clusters={graphData?.clusters}
        isLoading={isLoading}
        error={error}
        errorCode={errorCode}
        onRefresh={() => refetch()}
        className={className}
      />
    </GraphUIProvider>
  );
}
