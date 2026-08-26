export class ResolveConflictCommand {
  constructor(
    readonly assessmentId: string,
    readonly conflictId: string,
    readonly resolvedById: string,
    readonly subjectRole: string,
    readonly resolution: unknown,
    readonly resolutionNote: unknown,
    readonly correlationId: string,
    readonly authorization: {
      selectedAction: string | null;
    },
  ) {}
}
