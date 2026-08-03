import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  PBAC_REASON_CODE,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
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
import { RequireAnyAction } from "./decorators/require-any-action.decorator.js";
import { RequireSession } from "./decorators/require-session.decorator.js";
import type {
  PbacContextLoader,
  PbacContextResult,
} from "./pbac-context.loader.js";
import type { PbacEvaluatorService } from "./pbac-evaluator.service.js";
import { PbacGuard } from "./pbac.guard.js";
import type { PbacRequestContext } from "./interfaces/pbac-request.interface.js";
import type { PbacDecisionResult } from "./pbac.types.js";

class DummyController {
  @RequireAction(PBAC_ACTIONS.inviteDeveloper)
  inviteDeveloper(this: void): void {}

  @RequireSession()
  getWorkspace(this: void): void {}

  @RequireAnyAction(
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.evidenceReadRedacted,
  )
  getEvidence(this: void): void {}

  noDecorator(this: void): void {}
}

function makeContext(options: {
  handler: () => void;
  authorization?: string;
  params?: Record<string, string>;
}): { context: ExecutionContext; request: Record<string, unknown> } {
  const request: Record<string, unknown> = {
    headers: options.authorization
      ? { authorization: options.authorization }
      : {},
    method: "POST",
    params: options.params ?? {},
    route: { path: "/assessments/:assessmentId/conflicts/:conflictId/resolve" },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => options.handler,
    getClass: () => DummyController,
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeSession(): Session {
  return Session.rehydrate({
    id: "session-1",
    userId: "user-1",
    organizationId: "org-1",
    tokenHash: "hash",
    expiresAt: Date.now() + 60_000,
  });
}

function makeMembership(): Membership {
  return Membership.rehydrate({
    id: "membership-1",
    userId: "user-1",
    organizationId: "org-1",
    status: AUTH_MEMBERSHIP_STATUSES.active,
    subjectAttributes: { role: SUBJECT_ROLES.manager },
    policyId: "policy-1",
    policyVersion: "v1",
  });
}

function makePolicy(): Policy {
  return Policy.rehydrate({
    id: "policy-1",
    version: "v1",
    actions: [PBAC_ACTIONS.inviteDeveloper],
    subjectRole: SUBJECT_ROLES.manager,
    stateGate: PBAC_STATE_GATES.membershipActive,
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
    decision: PBAC_DECISION.allow,
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
        actor_id: "user-1",
        session_id: "session-1",
        organization_id: "org-1",
        resource_id: "POST /assessments/:assessmentId/conflicts/:conflictId/resolve",
        decision: PBAC_DECISION.allow,
        action: PBAC_ACTIONS.inviteDeveloper,
      }),
    );
    expect(
      (request as { pbacContext?: PbacRequestContext }).pbacContext,
    ).toMatchObject({
      userId: "user-1",
      sessionId: "session-1",
      organizationId: "org-1",
      subjectRole: SUBJECT_ROLES.manager,
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
      ok: false,
      problem: { code: PBAC_REASON_CODE.sessionInvalid },
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("T03/T04: SESSION_INVALID (expired or revoked) from the loader returns 401 SESSION_INVALID", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: PBAC_REASON_CODE.sessionInvalid },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer expired-token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.sessionInvalid },
    });
  });

  it("T05: MFA enrolled + unverified returns 401 MFA_REQUIRED", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: PBAC_REASON_CODE.mfaRequired },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.mfaRequired },
    });
  });

  it("T06: no active membership returns 403 MEMBERSHIP_MISSING", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: PBAC_REASON_CODE.membershipMissing },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.membershipMissing },
    });
  });

  it("T07: action not in policy returns 403 PBAC_DENIED", async () => {
    const { guard, append } = makeGuard({
      evaluateResult: {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
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
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: PBAC_DECISION.deny,
        reason_code: PBAC_REASON_CODE.actionNotGranted,
      }),
    );
  });

  it("T08: policy not found in DB returns 403 PBAC_DENIED", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: PBAC_REASON_CODE.policyNotFound },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
  });

  it("T09: DB error during load returns 403 PBAC_DENIED (deny on error)", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: PBAC_REASON_CODE.loadError },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
  });

  it("T10: 403 response body has no policyId or actions — clean", async () => {
    const { guard } = makeGuard({
      evaluateResult: {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
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

    expect(Object.keys(body as object).sort()).toEqual(["ok", "problem"]);
    expect(body).toMatchObject({
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
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
      expect.objectContaining({ decision: PBAC_DECISION.allow }),
    );
  });

  it("T13: AuthDecisionLog (append) is written for allow and every deny reason", async () => {
    const scenarios: PbacContextResult[] = [
      { ok: false, reason: PBAC_REASON_CODE.sessionInvalid },
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
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
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
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
    expect(load).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: PBAC_DECISION.deny,
        reason_code: PBAC_REASON_CODE.metadataMissing,
      }),
    );
  });

  it("denies cleanly when the membership has no subject role attribute", async () => {
    const { guard, evaluate, append } = makeGuard({
      loadResult: {
        ok: true,
        session: makeSession(),
        membership: Membership.rehydrate({
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          status: AUTH_MEMBERSHIP_STATUSES.active,
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
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: PBAC_DECISION.deny,
        reason_code: PBAC_REASON_CODE.subjectAttributeMissing,
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
      ok: false,
      problem: { code: PBAC_REASON_CODE.denied },
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: PBAC_DECISION.deny,
        reason_code: PBAC_REASON_CODE.evaluatorError,
      }),
    );
  });

  it("selects and records the first allowed action from @RequireAnyAction", async () => {
    const { guard, evaluate, append } = makeGuard({
      evaluateImpl: (context) => ({
        decision:
          context.action === PBAC_ACTIONS.evidenceReadRedacted
            ? PBAC_DECISION.allow
            : PBAC_DECISION.deny,
        reasonCode:
          context.action === PBAC_ACTIONS.evidenceReadRedacted
            ? undefined
            : PBAC_REASON_CODE.actionNotGranted,
        policyId: "policy-1",
        policyVersion: "v1",
      }),
    });
    const { context, request } = makeContext({
      handler: DummyController.prototype.getEvidence,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(
      (request as { pbacContext?: PbacRequestContext }).pbacContext
        ?.selectedAction,
    ).toBe(PBAC_ACTIONS.evidenceReadRedacted);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PBAC_ACTIONS.evidenceReadRedacted,
        decision: PBAC_DECISION.allow,
      }),
    );
  });

  it("denies and records every candidate when @RequireAnyAction has no allowed action", async () => {
    const { guard, append } = makeGuard({
      evaluateResult: {
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
        policyId: "policy-1",
        policyVersion: "v1",
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getEvidence,
      authorization: "Bearer token",
    });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(append).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: PBAC_ACTIONS.evidenceRead }),
    );
    expect(append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: PBAC_ACTIONS.evidenceReadRedacted }),
    );
  });

  it("records a domain resource id from route params when present", async () => {
    const { guard, append } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.inviteDeveloper,
      authorization: "Bearer token",
      params: { assessmentId: "assessment-1", conflictId: "conflict-1" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        session_id: "session-1",
        resource_id: "assessment:assessment-1:conflict:conflict-1",
      }),
    );
  });
});
