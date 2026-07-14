import { jest } from "@jest/globals";
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { Membership } from "../../modules/auth-workspace/domain/entities/membership.entity.js";
import { Policy } from "../../modules/auth-workspace/domain/entities/policy.entity.js";
import { Session } from "../../modules/auth-workspace/domain/entities/session.entity.js";
import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import type { AuthorizationDecision } from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import { RequireAction } from "./decorators/require-action.decorator.js";
import { RequireSession } from "./decorators/require-session.decorator.js";
import type {
  PbacContextLoader,
  PbacContextResult,
} from "./pbac-context.loader.js";
import type { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import { PbacGuard, type PbacRequestContext } from "./pbac.guard.js";
import type { PbacDecisionResult } from "./pbac.types.js";

class DummyController {
  @RequireAction("invite:developer")
  inviteDeveloper(this: void): void {}

  @RequireSession()
  getWorkspace(this: void): void {}

  noDecorator(this: void): void {}
}

function makeContext(options: {
  handler: () => void;
  authorization?: string;
}): { context: ExecutionContext; request: Record<string, unknown> } {
  const request: Record<string, unknown> = {
    headers: options.authorization
      ? { authorization: options.authorization }
      : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => options.handler,
    getClass: () => DummyController,
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeSession(): Session {
  return new Session({
    id: "session-1",
    userId: "user-1",
    organizationId: "org-1",
    tokenHash: "hash",
    expiresAt: Date.now() + 60_000,
  });
}

function makeMembership(): Membership {
  return new Membership({
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: "active",
    subjectAttributes: { role: "Manager" },
    policyId: "policy-1",
    policyVersion: "v1",
  });
}

function makePolicy(): Policy {
  return new Policy({
    id: "policy-1",
    version: "v1",
    actions: ["invite:developer"],
    subjectRole: "Manager",
    stateGate: "membership_active",
    organizationId: "org-1",
  });
}

function makeGuard(
  overrides: {
    loadResult?: PbacContextResult;
    evaluateResult?: PbacDecisionResult;
    evaluateImpl?: PbacEvaluatorService["evaluate"];
    appendImpl?: (decision: AuthorizationDecision) => Promise<void>;
  } = {},
) {
  const loadResult: PbacContextResult = overrides.loadResult ?? {
    ok: true,
    session: makeSession(),
    membership: makeMembership(),
    policy: makePolicy(),
  };

  const load = jest
    .fn<PbacContextLoader["load"]>()
    .mockResolvedValue(loadResult);
  const loader = { load } as unknown as PbacContextLoader;

  const evaluateResult: PbacDecisionResult = overrides.evaluateResult ?? {
    decision: "allow",
    policyId: "policy-1",
    policyVersion: "v1",
  };

  const evaluate = jest
    .fn<PbacEvaluatorService["evaluate"]>()
    .mockImplementation(overrides.evaluateImpl ?? (() => evaluateResult));
  const evaluator = { evaluate } as unknown as PbacEvaluatorService;

  const append = jest
    .fn<AuthorizationDecisionRepository["append"]>()
    .mockImplementation(overrides.appendImpl ?? (() => Promise.resolve()));
  const decisions = { append } as unknown as AuthorizationDecisionRepository;

  const guard = new PbacGuard(new Reflector(), loader, evaluator, decisions);

  return { guard, loader, evaluator, decisions, load, evaluate, append };
}

describe("PbacGuard", () => {
  it("T01: valid session + active membership + action in policy allows and logs the decision", async () => {
    const { guard, append } = makeGuard();
    const { context, request } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer valid-token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "allow",
        action: "invite:developer",
      }),
    );
    expect(
      (request as { pbacContext?: PbacRequestContext }).pbacContext,
    ).toMatchObject({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      subjectRole: "Manager",
      policyId: "policy-1",
    });
  });

  it("T02: missing Authorization header returns 401 SESSION_INVALID", async () => {
    const { guard, load } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      error_code: "SESSION_INVALID",
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("T03/T04: SESSION_INVALID (expired or revoked) from the loader returns 401 SESSION_INVALID", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: "SESSION_INVALID" },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer expired-token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      error_code: "SESSION_INVALID",
    });
  });

  it("T05: MFA enrolled + unverified returns 401 MFA_REQUIRED", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: "MFA_REQUIRED" },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      error_code: "MFA_REQUIRED",
    });
  });

  it("T06: no active membership returns 403 MEMBERSHIP_MISSING", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: "MEMBERSHIP_MISSING" },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "MEMBERSHIP_MISSING",
    });
  });

  it("T07: action not in policy returns 403 PBAC_DENIED", async () => {
    const { guard, append } = makeGuard({
      evaluateResult: {
        decision: "deny",
        reasonCode: "ACTION_NOT_GRANTED",
        policyId: "policy-1",
        policyVersion: "v1",
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "deny",
        reason_code: "ACTION_NOT_GRANTED",
      }),
    );
  });

  it("T08: policy not found in DB returns 403 PBAC_DENIED", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: "POLICY_NOT_FOUND" },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
  });

  it("T09: DB error during load returns 403 PBAC_DENIED (deny on error)", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: "LOAD_ERROR" },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
  });

  it("T10: 403 response body has no policyId or actions — clean", async () => {
    const { guard } = makeGuard({
      evaluateResult: {
        decision: "deny",
        reasonCode: "ACTION_NOT_GRANTED",
        policyId: "policy-1",
        policyVersion: "v1",
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = (await guard
      .canActivate(context)
      .catch((e: unknown) => e)) as ForbiddenException;
    const body = error.getResponse();

    expect(Object.keys(body as object).sort()).toEqual([
      "correlation_id",
      "error_code",
    ]);
    expect(JSON.stringify(body)).not.toMatch(/policyId|actions/i);
  });

  it("T11: request.pbacContext is set on the request after allow", async () => {
    const { guard } = makeGuard();
    const { context, request } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    await guard.canActivate(context);

    expect(
      (request as { pbacContext?: PbacRequestContext }).pbacContext,
    ).toBeDefined();
  });

  it("T12: @RequireSession() passes with no action — valid session + membership allow", async () => {
    const { guard, evaluate, append } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspace,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "allow" }),
    );
  });

  it("T13: AuthDecisionLog (append) is written for allow and every deny reason", async () => {
    const scenarios: PbacContextResult[] = [
      { ok: false, reason: "SESSION_INVALID" },
      {
        ok: true,
        session: makeSession(),
        membership: makeMembership(),
        policy: makePolicy(),
      },
    ];

    for (const loadResult of scenarios) {
      const { guard, append } = makeGuard({ loadResult });
      const { context } = makeContext({
        handler: DummyController.prototype.inviteDeveloper,
        authorization: "Bearer token",
      });

      await guard.canActivate(context).catch(() => undefined);

      expect(append).toHaveBeenCalledTimes(1);
    }

    const { guard: denyGuard, append: denyAppend } = makeGuard({
      evaluateResult: {
        decision: "deny",
        reasonCode: "ACTION_NOT_GRANTED",
        policyId: "policy-1",
        policyVersion: "v1",
      },
    });
    const { context: denyContext } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });
    await denyGuard.canActivate(denyContext).catch(() => undefined);
    expect(denyAppend).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the decision-log write itself fails (never allow on error, never crash on log failure)", async () => {
    const { guard } = makeGuard({
      appendImpl: () => Promise.reject(new Error("db down")),
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("defaults to deny when PbacGuard is applied without @RequireAction() or @RequireSession()", async () => {
    const { guard, load, evaluate, append } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.noDecorator,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
    expect(load).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "deny",
        reason_code: "PBAC_METADATA_MISSING",
      }),
    );
  });

  it("denies cleanly when the membership has no subject role attribute", async () => {
    const { guard, evaluate, append } = makeGuard({
      loadResult: {
        ok: true,
        session: makeSession(),
        membership: new Membership({
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          status: "active",
          subjectAttributes: {},
          policyId: "policy-1",
          policyVersion: "v1",
        }),
        policy: makePolicy(),
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "deny",
        reason_code: "SUBJECT_ATTRIBUTE_MISSING",
      }),
    );
  });

  it("denies cleanly if the evaluator throws unexpectedly", async () => {
    const { guard, append } = makeGuard({
      evaluateImpl: () => {
        throw new Error("boom");
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      error_code: "PBAC_DENIED",
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "deny",
        reason_code: "EVALUATOR_ERROR",
      }),
    );
  });
});
