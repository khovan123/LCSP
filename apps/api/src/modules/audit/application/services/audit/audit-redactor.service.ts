import { Injectable } from "@nestjs/common";

import { AuditSanitizer } from "../../../../../platform/audit/audit-sanitizer.js";

@Injectable()
export class AuditRedactorService {
  redact(payload: unknown): Record<string, unknown> | null {
    if (!isRecord(payload)) {
      return null;
    }

    return AuditSanitizer.sanitize(payload).payload ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
