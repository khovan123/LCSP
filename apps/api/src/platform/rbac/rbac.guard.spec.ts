import { jest } from "@jest/globals";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  actionsForRole,
  RBAC_ACTIONS,
  RBAC_DECISION,
  RBAC_REASON_CODE,
} from "@lcsp/contracts/rbac";
import {
  HttpStatus,
  type ExecutionContext,
  type HttpException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthorizationDecisionRepository } from "../../modules/auth-workspace/application/ports/persistence/authorization-decision.repository.js";
import { Session } from "../../modules/auth-workspace/domain/entities/session.entity.js";
import { User } from "../../modules/auth-workspace/domain/entities/user.entity.js";
import type { AuthorizationDecision } from "../../modules/auth-workspace/domain/models/auth-workspace.models.js";
import { RequireAction } from "./decorators/require-action.decorator.js";
import { RequireAnyAction } from "./decorators/require-any-action.decorator.js";
import { RequireSession } from "./decorators/require-session.decorator.js";
import type { RbacRequestContext } from "./interfaces/rbac-request.interface.js";
import type {
  RbacContextLoader,
  RbacContextResult,
} from "./rbac-context.loader.js";
import type { RbacEvaluatorService } from "./rbac-evaluator.service.js";
import { RbacGuard } from "./rbac.guard.js";
import type { RbacDecisionResult } from "./rbac.types.js";

class DummyController {
  @RequireAction(RBAC_ACTIONS.workspaceRead)
  getWorkspaceRead(this: void): void {}

  @RequireSession()
  getWorkspace(this: void): void {}

  @RequireAnyAction(
    RBAC_ACTIONS.evidenceRead,
    RBAC_ACTIONS.evidenceReadRedacted,
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
    tokenHash: "hash",
    expiresAt: Date.now() + 60_000,
  });
}

function makeUser(): User {
  return User.rehydrate({
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    emailVerified: true,
    failedLoginCount: 0,
    role: AUTH_USER_ROLES.customer,
  });
}

function makeOkLoadResult(): RbacContextResult {
  const user = makeUser();
  return {
    ok: true,
    session: makeSession(),
    user,
    grantedActions: actionsForRole(user.role),
  };
}

function makeGuard(
  overrides: {
    loadResult?: RbacContextResult;
    evaluateResult?: RbacDecisionResult;
    evaluateImpl?: RbacEvaluatorService["evaluate"];
    appendImpl?: (decision: AuthorizationDecision) => Promise<void>;
  } = {},
) {
  const load = jest
    .fn<RbacContextLoader["load"]>()
    .mockResolvedValue(overrides.loadResult ?? makeOkLoadResult());
  const loader = { load } as unknown as RbacContextLoader;

  const evaluateResult: RbacDecisionResult = overrides.evaluateResult ?? {
    decision: RBAC_DECISION.allow,
  };
  const evaluate = jest
    .fn<RbacEvaluatorService["evaluate"]>()
    .mockImplementation(overrides.evaluateImpl ?? (() => evaluateResult));
  const evaluator = { evaluate } as unknown as RbacEvaluatorService;

  const append = jest
    .fn<AuthorizationDecisionRepository["append"]>()
    .mockImplementation(overrides.appendImpl ?? (() => Promise.resolve()));
  const decisions = { append } as unknown as AuthorizationDecisionRepository;

  const guard = new RbacGuard(new Reflector(), loader, evaluator, decisions);

  return { guard, load, evaluate, append };
}

async function captureError(promise: Promise<unknown>): Promise<HttpException> {
  return (await promise.catch((error: unknown) => error)) as HttpException;
}

describe("RbacGuard", () => {
  it("allows when the session loads and the action is granted", async () => {
    const { guard, append } = makeGuard();
    const { context, request } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer valid-token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        session_id: "session-1",
        decision: RBAC_DECISION.allow,
        action: RBAC_ACTIONS.workspaceRead,
      }),
    );
    expect(
      (request as { rbacContext?: RbacRequestContext }).rbacContext,
    ).toMatchObject({
      userId: "user-1",
      sessionId: "session-1",
      role: AUTH_USER_ROLES.customer,
      selectedAction: RBAC_ACTIONS.workspaceRead,
    });
  });

  it("returns 401 SESSION_INVALID when the Authorization header is missing", async () => {
    const { guard, load } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(error.getResponse()).toMatchObject({
      ok: false,
      problem: { code: RBAC_REASON_CODE.sessionInvalid },
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("returns 401 SESSION_INVALID when the loader rejects the session", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: RBAC_REASON_CODE.sessionInvalid },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer expired-token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(error.getResponse()).toMatchObject({
      ok: false,
      problem: { code: RBAC_REASON_CODE.sessionInvalid },
    });
  });

  it("returns 401 MFA_REQUIRED when the loaded session needs MFA", async () => {
    const { guard } = makeGuard({
      loadResult: {
        ok: false,
        reason: RBAC_REASON_CODE.mfaRequired,
        mfaEnrolled: true,
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect(error.getResponse()).toMatchObject({
      ok: false,
      problem: {
        code: RBAC_REASON_CODE.mfaRequired,
        meta: { mfaEnrolled: true },
      },
    });
  });

  it("returns 403 RBAC_DENIED on loader load errors", async () => {
    const { guard } = makeGuard({
      loadResult: { ok: false, reason: RBAC_REASON_CODE.loadError },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(error.getResponse()).toMatchObject({
      ok: false,
      problem: { code: RBAC_REASON_CODE.denied },
    });
  });

  it("returns 403 RBAC_DENIED and logs the evaluator reason when action evaluation denies", async () => {
    const { guard, append } = makeGuard({
      evaluateResult: {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.actionNotGranted,
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(error.getResponse()).toMatchObject({
      ok: false,
      problem: { code: RBAC_REASON_CODE.denied },
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: RBAC_DECISION.deny,
        reason_code: RBAC_REASON_CODE.actionNotGranted,
      }),
    );
  });

  it("@RequireSession passes without action evaluation", async () => {
    const { guard, evaluate, append } = makeGuard();
    const { context, request } = makeContext({
      handler: DummyController.prototype.getWorkspace,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(evaluate).not.toHaveBeenCalled();
    expect(
      (request as { rbacContext?: RbacRequestContext }).rbacContext,
    ).toMatchObject({
      role: AUTH_USER_ROLES.customer,
      selectedAction: null,
    });
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ decision: RBAC_DECISION.allow }),
    );
  });

  it("defaults to deny when no RBAC metadata is present", async () => {
    const { guard, load, evaluate, append } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.noDecorator,
      authorization: "Bearer token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(load).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: RBAC_DECISION.deny,
        reason_code: RBAC_REASON_CODE.metadataMissing,
      }),
    );
  });

  it("selects and records the first allowed action from @RequireAnyAction", async () => {
    const { guard, evaluate, append } = makeGuard({
      evaluateImpl: (context) => ({
        decision:
          context.action === RBAC_ACTIONS.evidenceReadRedacted
            ? RBAC_DECISION.allow
            : RBAC_DECISION.deny,
        reasonCode:
          context.action === RBAC_ACTIONS.evidenceReadRedacted
            ? undefined
            : RBAC_REASON_CODE.actionNotGranted,
      }),
    });
    const { context, request } = makeContext({
      handler: DummyController.prototype.getEvidence,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(
      (request as { rbacContext?: RbacRequestContext }).rbacContext
        ?.selectedAction,
    ).toBe(RBAC_ACTIONS.evidenceReadRedacted);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: RBAC_ACTIONS.evidenceReadRedacted,
        decision: RBAC_DECISION.allow,
      }),
    );
  });

  it("denies and records every candidate when @RequireAnyAction has no allowed action", async () => {
    const { guard, append } = makeGuard({
      evaluateResult: {
        decision: RBAC_DECISION.deny,
        reasonCode: RBAC_REASON_CODE.actionNotGranted,
      },
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getEvidence,
      authorization: "Bearer token",
    });

    const error = await captureError(guard.canActivate(context));

    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(append).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: RBAC_ACTIONS.evidenceRead }),
    );
    expect(append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: RBAC_ACTIONS.evidenceReadRedacted }),
    );
  });

  it("does not throw when decision logging fails after an allow", async () => {
    const { guard } = makeGuard({
      appendImpl: () => Promise.reject(new Error("db down")),
    });
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("records a domain resource id from route params when present", async () => {
    const { guard, append } = makeGuard();
    const { context } = makeContext({
      handler: DummyController.prototype.getWorkspaceRead,
      authorization: "Bearer token",
      params: { assessmentId: "assessment-1", conflictId: "conflict-1" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_id: "assessment:assessment-1:conflict:conflict-1",
      }),
    );
  });
});
