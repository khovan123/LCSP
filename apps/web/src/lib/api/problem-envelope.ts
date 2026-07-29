import {
  REQUIRED_ACTIONS,
  type ProblemKey,
  type ProblemResult,
} from "@lcsp/contracts/auth";

export function problemEnvelope(
  code: string,
  status: number,
  correlationId?: string,
): ProblemResult<string> {
  return {
    ok: false,
    problem: {
      type: `problem/${code.toLowerCase().replaceAll("_", "-")}`,
      status,
      code,
      titleKey: "auth.errors.validationFailed.title" satisfies ProblemKey,
      detailKey: "auth.errors.validationFailed.detail" satisfies ProblemKey,
      requiredAction: REQUIRED_ACTIONS.none,
      correlationId: correlationId ?? "web-bff",
    },
  };
}

export function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const result = payload as Partial<ProblemResult<string>>;
  return result.ok === false && typeof result.problem?.code === "string"
    ? result.problem.code
    : undefined;
}
