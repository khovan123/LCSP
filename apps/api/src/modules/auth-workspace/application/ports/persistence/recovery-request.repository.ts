import type { RecoveryRequest } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_RECOVERY_REQUEST_REPOSITORY =
  "AUTH_WORKSPACE_RECOVERY_REQUEST_REPOSITORY";

export interface RecoveryRequestRepository {
  nextId(): string;
  save(request: RecoveryRequest, fingerprint?: string): Promise<void>;
  findByFingerprint(fingerprint: string): Promise<RecoveryRequest | null>;
}
