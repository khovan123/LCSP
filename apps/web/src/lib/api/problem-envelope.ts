import {
  REQUIRED_ACTIONS,
  type ProblemMeta,
  type ProblemKey,
  type ProblemResult,
  type RequiredAction,
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

export function getProblemRequiredAction(
  payload: unknown,
): RequiredAction | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const result = payload as Partial<ProblemResult<string>>;
  return result.ok === false && typeof result.problem?.requiredAction === "string"
    ? (result.problem.requiredAction as RequiredAction)
    : undefined;
}

export function getProblemMeta(payload: unknown): ProblemMeta | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const result = payload as Partial<ProblemResult<string>>;
  return result.ok === false &&
    typeof result.problem === "object" &&
    result.problem !== null &&
    typeof result.problem.meta === "object" &&
    result.problem.meta !== null
    ? result.problem.meta
    : undefined;
}

export function getMfaRedirectLocation(
  payload: unknown,
): "/mfa/verify" {
  void payload;
  return "/mfa/verify";
}

export function getProblemMessageKeys(
  payload: unknown,
):
  | {
      titleKey: ProblemKey;
      detailKey: ProblemKey;
    }
  | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const result = payload as Partial<ProblemResult<string>>;
  return result.ok === false &&
    typeof result.problem?.titleKey === "string" &&
    typeof result.problem?.detailKey === "string"
    ? {
        titleKey: result.problem.titleKey,
        detailKey: result.problem.detailKey,
      }
    : undefined;
}
