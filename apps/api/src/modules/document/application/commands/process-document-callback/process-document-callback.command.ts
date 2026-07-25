export class ProcessDocumentCallbackCommand {
  constructor(
    public readonly payload: unknown,
    public readonly correlationId: string,
  ) {}
}
