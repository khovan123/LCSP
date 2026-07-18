export class TriggerScanRequest {
  snapshot_id!: string;
  trigger_source?: string;
  idempotency_key!: string;
}
