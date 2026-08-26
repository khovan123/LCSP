import { Query } from "@nestjs/cqrs";

/**
 * Requests all document status views visible to the caller for one assessment.
 */
export class ListDocumentsQuery extends Query<unknown[]> {
  /**
   * Creates the document-list query.
   *
   * @param assessmentId - Assessment whose document requests should be listed.
   * @param scope - RBAC resource scope used for redacted reads.
   * @param selectedAction - RBAC action selected by the authorization guard.
   * @param correlationId - Correlation identifier propagated to authorization and lookup errors.
   */
  constructor(
    public readonly assessmentId: string,
    public readonly scope: string | null,
    public readonly selectedAction: string | null,
    public readonly correlationId: string,
  ) {
    super();
  }
}
