import { jest } from "@jest/globals";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { PbacPreflightController } from "./pbac-preflight.controller.js";
import type { PbacPreflightService } from "./pbac-preflight.service.js";

const VALID_KEY = "correct-worker-api-key-value-1234";

function makeController(
  overrides: {
    evaluateImpl?: PbacPreflightService["evaluate"];
  } = {},
) {
  const evaluate = jest
    .fn<PbacPreflightService["evaluate"]>()
    .mockImplementation(
      overrides.evaluateImpl ??
        (() =>
          Promise.resolve({
            decision: "allow",
            reasonCode: null,
            correlationId: "corr-1",
          })),
    );
  const preflightService = { evaluate } as unknown as PbacPreflightService;

  const configService = {
    get: (_key: string, fallback?: unknown) => VALID_KEY ?? fallback,
  } as unknown as ConfigService;

  const controller = new PbacPreflightController(
    preflightService,
    configService,
  );

  return { controller, evaluate };
}

describe("PbacPreflightController", () => {
  it("T04: missing X-Worker-Api-Key returns 401", async () => {
    const { controller } = makeController();

    await expect(
      controller.preflight(
        {
          user_id: "u",
          organization_id: "o",
          action: "a",
          correlation_id: "c",
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
          correlation_id: "c",
        },
        "wrong-key",
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns the decision as a snake_case body when the key is valid", async () => {
    const { controller } = makeController();

    const response = await controller.preflight(
      { user_id: "u", organization_id: "o", action: "a", correlation_id: "c" },
      VALID_KEY,
    );

    expect(response).toEqual({
      decision: "allow",
      reason_code: null,
      correlation_id: "corr-1",
    });
  });

  it("always returns 200 (no exception) for a deny decision", async () => {
    const { controller } = makeController({
      evaluateImpl: () =>
        Promise.resolve({
          decision: "deny",
          reasonCode: "ACTION_NOT_GRANTED",
          correlationId: "corr-1",
        }),
    });

    const response = await controller.preflight(
      { user_id: "u", organization_id: "o", action: "a", correlation_id: "c" },
      VALID_KEY,
    );

    expect(response).toEqual({
      decision: "deny",
      reason_code: "ACTION_NOT_GRANTED",
      correlation_id: "corr-1",
    });
  });
});
