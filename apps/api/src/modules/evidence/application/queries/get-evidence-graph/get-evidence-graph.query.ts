/**
 * GetEvidenceGraph Query
 *
 * Query to fetch evidence graph data for an assessment.
 * Includes scope (overview|detail) and optional cluster expansion.
 */

export class GetEvidenceGraphQuery {
  constructor(
    readonly assessmentId: string,
    readonly organizationId: string,
    readonly userId: string,
    readonly subjectRole: "MANAGER" | "DEVELOPER",
    readonly scope: "overview" | "detail" = "overview",
    readonly clusterId?: string,
    readonly correlationId?: string,
  ) {}
}
