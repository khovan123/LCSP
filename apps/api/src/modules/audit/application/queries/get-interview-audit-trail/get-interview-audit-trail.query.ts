/**
 * Query to retrieve the chronological interview audit trail and material context provenance for an assessment.
 */
export class GetInterviewAuditTrailQuery {
  /**
   * Creates the query.
   *
   * @param assessmentId - Target assessment identifier.
   * @param sessionUserId - Authenticated user identifier making the query.
   * @param subjectRole - Authenticated user's RBAC role.
   * @param subjectScope - Optional RBAC tenant/organization scope.
   * @param correlationId - Request correlation identifier.
   */
  constructor(
    public readonly assessmentId: string,
    public readonly sessionUserId: string,
    public readonly subjectRole: string,
    public readonly subjectScope: string | undefined,
    public readonly correlationId: string,
  ) {}
}
