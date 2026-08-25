import { jest } from "@jest/globals";
import { RBAC_DECISION, RBAC_REASON_CODE } from "@lcsp/contracts/rbac";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { RbacPreflightController } from "./rbac-preflight.controller.js";
import type { RbacPreflightService } from "./rbac-preflight.service.js";

const VALID_KEY = "correct-worker-api-key-value-1234";

function makeController(
  overrides: {
    evaluateImpl?: RbacPreflightService["evaluate"];
  } = {},
) {
  const evaluate = jest
    .fn<RbacPreflightService["evaluate"]>()
    .mockImplementation(
      overrides.evaluateImpl ??
        (() =>
          Promise.resolve({
            decision: RBAC_DECISION.allow,
            reasonCode: null,
            correlationId: "corr-1",
          })),
    );
  const preflightService = { evaluate } as unknown as RbacPreflightService;

  const configService = {
    get: (_key: string, fallback?: unknown) => VALID_KEY ?? fallback,
  } as unknown as ConfigService;

  const controller = new RbacPreflightController(
    preflightService,
    configService,
  );

  return { controller, evaluate };
}

describe("RbacPreflightController", () => {
  it("T04: missing X-Worker-Api-Key returns 401", async () => {
    const { controller } = makeController();

    await expect(
      controller.preflight(
        {
          user_id: "u",
          organization_id: "o",
          action: "a",
          correlationId: "c",
        },
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("T04: invalid X-Worker-Api-Key returns 401", async () => {
    const { controller } = makeController();

    await expect(
      controller.preflight(
        {
          user_id: "u",
          organization_id: "o",
          action: "a",
          correlationId: "c",
        },
        "wrong-key",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns the decision with camelCase correlationId when the key is valid", async () => {
    const { controller } = makeController();

    const response = await controller.preflight(
      { user_id: "u", organization_id: "o", action: "a", correlationId: "c" },
      VALID_KEY,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        decision: RBAC_DECISION.allow,
        reason_code: null,
        correlationId: "corr-1",
      },
    });
  });

  it("always returns 200 (no exception) for a deny decision", async () => {
    const { controller } = makeController({
      evaluateImpl: () =>
        Promise.resolve({
          decision: RBAC_DECISION.deny,
          reasonCode: RBAC_REASON_CODE.actionNotGranted,
          correlationId: "corr-1",
        }),
    });

    const response = await controller.preflight(
      { user_id: "u", organization_id: "o", action: "a", correlationId: "c" },
      VALID_KEY,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        decision: RBAC_DECISION.deny,
        reason_code: RBAC_REASON_CODE.actionNotGranted,
        correlationId: "corr-1",
      },
    });
  });

  it("accepts camelCase correlationId from runtime callers", async () => {
    const { controller, evaluate } = makeController();

    await controller.preflight(
      {
        user_id: "u",
        organization_id: "o",
        action: "a",
        correlationId: "camel-corr-1",
      },
      VALID_KEY,
    );

    expect(evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "camel-corr-1",
      }),
    );
  });
});
