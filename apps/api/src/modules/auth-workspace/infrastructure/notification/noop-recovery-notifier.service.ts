import { Injectable } from "@nestjs/common";

import type { RecoveryNotifier } from "../../application/ports/notification/recovery-notifier.ts";

/**
 * Placeholder recovery notifier: this codebase has no outbound email
 * infrastructure yet. Swap this provider for a real email/SMS sender when
 * one exists — the plaintext token must only ever be delivered out-of-band,
 * never returned from the recovery-request API response.
 */
@Injectable()
export class NoopRecoveryNotifierService implements RecoveryNotifier {
  async notify(input: {
    userId: string;
    email: string;
    token: string;
    correlationId: string;
  }): Promise<void> {
    void input;
    return Promise.resolve();
  }
}
