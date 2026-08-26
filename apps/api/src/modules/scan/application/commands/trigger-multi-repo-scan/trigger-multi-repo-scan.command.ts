import type { PbacRequestContext } from "../../../../../platform/pbac/interfaces/pbac-request.interface.js";

/**
 * Triggers a new multi-repo scan for an assessment, creating one scan job per
 * repository in the AssessmentRepositoryScope (or legacy RepositoryConnection fallback).
 * Architecture declarations are injected into each job payload for the Python worker.
 */
export class TriggerMultiRepoScanCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly idempotencyKey: string,
    public readonly pbacContext: PbacRequestContext,
    public readonly correlationId: string,
  ) {}
}
