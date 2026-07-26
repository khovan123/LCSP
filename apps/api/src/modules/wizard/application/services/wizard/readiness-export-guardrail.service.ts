import { Injectable } from "@nestjs/common";

const OVERCLAIM_PATTERN =
  /\b(high|medium|low|risk|severity|violation|non-compliant|certified|certification|approved|legal conclusion|final classification|classification result)\b/i;

export interface ReadinessExportGuardrailResult {
  passed: boolean;
  blockedReason: string | null;
}

@Injectable()
export class ReadinessExportGuardrailService {
  check(content: unknown): ReadinessExportGuardrailResult {
    const serialized = JSON.stringify(content);
    const match = OVERCLAIM_PATTERN.exec(serialized);

    if (!match) {
      return { passed: true, blockedReason: null };
    }

    return {
      passed: false,
      blockedReason: `READINESS_EXPORT_OVERCLAIM:${match[1].toLowerCase()}`,
    };
  }
}
