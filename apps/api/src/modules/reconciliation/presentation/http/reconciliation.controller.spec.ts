import { HttpException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { ASSESSMENT_ERROR_CODES } from "@lcsp/contracts/assessment";
import { VERIFIED_PROFILE_REQUIRED_FOR } from "@lcsp/contracts/evidence";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { GetVerifiedProfileQuery } from "../../application/queries/get-verified-profile/get-verified-profile.query.js";
import { ReconciliationController } from "./reconciliation.controller.js";

function request(): AuthenticatedRequest {
  return {
    correlationId: "corr-1",
    pbacContext: {
      organizationId: "org-1",
    },
  } as AuthenticatedRequest;
}

describe("ReconciliationController.getVerifiedProfile", () => {
  it("TC-03: forwards an exact profile version and named purpose to the protected query", async () => {
    const commandBus = {};
    const queryBus = {
      execute: jest
        .fn()
        .mockResolvedValue({ result: { profile_ref: "verified:vp-1" } }),
    };
    const controller = new ReconciliationController(
      commandBus as never,
      queryBus as never,
    );

    const response = await controller.getVerifiedProfile(
      "assessment-1",
      "vp-1",
      "3",
      VERIFIED_PROFILE_REQUIRED_FOR.legalMatching,
      request(),
    );

    expect(response).toEqual({
      ok: true,
      data: { result: { profile_ref: "verified:vp-1" } },
    });
    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetVerifiedProfileQuery(
        "assessment-1",
        "org-1",
        "vp-1",
        "3",
        VERIFIED_PROFILE_REQUIRED_FOR.legalMatching,
        "corr-1",
      ),
    );
  });

  it("TC-03: rejects malformed version and unknown purpose before dispatch", async () => {
    const queryBus = { execute: jest.fn() };
    const controller = new ReconciliationController(
      {} as never,
      queryBus as never,
    );

    await expect(
      controller.getVerifiedProfile(
        "assessment-1",
        "vp-1",
        "0",
        "UNKNOWN",
        request(),
      ),
    ).rejects.toBeInstanceOf(HttpException);
    expect(queryBus.execute).not.toHaveBeenCalled();
    try {
      await controller.getVerifiedProfile(
        "assessment-1",
        "vp-1",
        "3",
        "UNKNOWN",
        request(),
      );
    } catch (error) {
      expect((error as HttpException).getResponse()).toMatchObject({
        problem: { code: ASSESSMENT_ERROR_CODES.invalidRequest },
      });
    }
  });
});
