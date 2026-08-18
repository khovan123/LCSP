/**
 * Evidence Graph API Client
 *
 * Client-side wrapper for:
 * GET /assessments/:assessmentId/evidence-graph
 *
 * Handles HTTP requests, error parsing, and response envelope parsing.
 */

import type {
  EvidenceGraphDto,
  GraphApiResponse,
  GraphErrorProblem,
  GraphScope,
} from "../../features/evidence/types/evidence-graph.types";
import { apiRequest } from "./api-request";

/**
 * Error result from evidence graph API call.
 */
export interface GraphApiError {
  problem: GraphErrorProblem;
  status: number;
}

/**
 * Success result from evidence graph API call.
 */
export interface GraphApiSuccess {
  data: EvidenceGraphDto;
}

/**
 * Complete result type: success or error.
 */
export type GraphApiResult = GraphApiSuccess | GraphApiError;

/**
 * Request parameters for evidence graph query.
 */
export interface GetEvidenceGraphParams {
  assessmentId: string;
  scope: GraphScope;
  clusterId?: string;
  cache?: RequestCache;
}

export function isEvidenceGraphMockEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_EVIDENCE_GRAPH_MOCK === "true"
  );
}

/**
 * Fetch evidence graph data from API.
 *
 * @param params - Query parameters (assessmentId, scope, optional clusterId)
 * @returns Success result with EvidenceGraphDto or error result with problem details
 *
 * @example
 * const result = await getEvidenceGraph({
 *   assessmentId: "assessment-123",
 *   scope: "overview"
 * });
 *
 * if ("data" in result) {
 *   console.log("Nodes:", result.data.nodes.length);
 * } else {
 *   console.error("Error:", result.problem.titleKey);
 * }
 */
export async function getEvidenceGraph(
  params: GetEvidenceGraphParams,
): Promise<GraphApiResult> {
  const { assessmentId, scope, clusterId, cache = "no-store" } = params;

  // Build query string
  const searchParams = new URLSearchParams();
  searchParams.set("scope", scope);
  if (clusterId) {
    searchParams.set("clusterId", clusterId);
  }

  const url = `/api/assessments/${encodeURIComponent(
    assessmentId,
  )}/evidence-graph?${searchParams.toString()}`;

  // Make request using shared apiRequest helper
  const { payload, ok, status } = await apiRequest(url, { cache });

  // apiRequest already unwraps successful envelopes to their data payload.
  if (ok && payload) {
    return { data: payload as EvidenceGraphDto };
  }

  // Parse error response
  const errorResponse = payload as GraphApiResponse;
  if (!errorResponse.ok && "problem" in errorResponse) {
    return {
      problem: errorResponse.problem,
      status,
    };
  }

  // Fallback error
  return {
    problem: {
      type: "EVIDENCE_NOT_FOUND",
      status: 500,
      code: "GRAPH_API_ERROR",
      titleKey: "error_graph_api_failure",
      detailKey: "error_graph_api_failure_detail",
    },
    status,
  };
}

/**
 * Type guard: check if result is success.
 */
export function isGraphApiSuccess(
  result: GraphApiResult,
): result is GraphApiSuccess {
  return "data" in result;
}

/**
 * Type guard: check if result is error.
 */
export function isGraphApiError(
  result: GraphApiResult,
): result is GraphApiError {
  return "problem" in result;
}
