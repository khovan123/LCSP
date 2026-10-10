export class TriggerScanRequest {
  snapshot_id!: string;
  trigger_source?: string;
  idempotency_key!: string;
  response_language?: string;
  locale?: string;
}
