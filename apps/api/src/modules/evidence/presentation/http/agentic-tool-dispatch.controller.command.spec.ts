import { AGENTIC_TOOL_NAMES } from "@lcsp/contracts/evidence";
import {
  PBAC_ACTIONS,
  PBAC_DECISION,
  PBAC_REASON_CODE,
} from "@lcsp/contracts/pbac";
import { jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";

import type { AppConfig } from "../../../../config/config.types.js";
import type { PbacPreflightService } from "../../../../platform/pbac/pbac-preflight.service.js";
import type { AssessmentRuntimeEventService } from "../../../../platform/runtime-events/assessment-runtime-event.service.js";
import type { PythonWorkerRuntimeClient } from "../../application/services/evidence/python-worker-runtime.client.js";
import { InternalAgenticToolDispatchController } from "./agentic-tool-dispatch.controller.js";

function runtimeEventsMock() {
  return {
    recordRunStartedIfMissing: jest.fn(async () => undefined),
    recordRunStageChangedIfNeeded: jest.fn(async () => undefined),
    recordToolStarted: jest.fn(async () => undefined),
    recordToolWaitingInput: jest.fn(async () => undefined),
    recordToolCompleted: jest.fn(async () => undefined),
    recordToolFailed: jest.fn(async () => undefined),
  } as unknown as AssessmentRuntimeEventService;
}

function configMock() {
  return {
    get: jest.fn(() => false),
  } as unknown as ConfigService<AppConfig, true>;
}

function commandPayload() {
  return {
    tool_name: AGENTIC_TOOL_NAMES.submitClassificationForIndependentReview,
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-1",
    correlationId: "correlation-1",
    workflow_run_id: "run-1",
    artifact_versions: { baselineId: "baseline-1" },
    input: {
      baselineRef: "legal-match:baseline-1",
      proposedClass: "HIGH_RISK",
      rationaleCitationRefs: ["citation:1"],
      proposalGateRef: "proposal-gate:1",
      idempotencyKey: "submit-12345678",
    },
  };
}

describe("InternalAgenticToolDispatchController protected commands", () => {
  it("re-evaluates PBAC and passes trusted policy metadata to CommandBus", async () => {
    const queryBus = { execute: jest.fn() } as unknown as QueryBus;
    const pythonWorkerRuntime = {} as PythonWorkerRuntimeClient;
    const commandBus = {
      execute: jest.fn(async () => ({ status: "READY" })),
    } as unknown as CommandBus;
    const pbacPreflight = {
      evaluateWithPolicy: jest.fn(async () => ({
        decision: PBAC_DECISION.allow,
        reasonCode: null,
        correlationId: "correlation-1",
        policyId: "policy-trusted",
        policyVersion: "v7",
      })),
    } as unknown as PbacPreflightService;

    const controller = new InternalAgenticToolDispatchController(
      queryBus,
      pythonWorkerRuntime,
      configMock(),
      runtimeEventsMock(),
      commandBus,
      pbacPreflight,
    );

    await controller.dispatch(commandPayload());

    expect(pbacPreflight.evaluateWithPolicy).toHaveBeenCalledWith({
      userId: "user-1",
      organizationId: "org-1",
      action: PBAC_ACTIONS.classificationReviewSubmit,
      correlationId: "correlation-1",
    });
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const command = (commandBus.execute as jest.Mock).mock.calls[0][0] as {
      policyId: string;
      policyVersion: string;
    };
    expect(command.policyId).toBe("policy-trusted");
    expect(command.policyVersion).toBe("v7");
    expect(queryBus.execute).not.toHaveBeenCalled();
  });

  it("fails closed on PBAC deny before CommandBus execution", async () => {
    const queryBus = { execute: jest.fn() } as unknown as QueryBus;
    const commandBus = { execute: jest.fn() } as unknown as CommandBus;
    const pbacPreflight = {
      evaluateWithPolicy: jest.fn(async () => ({
        decision: PBAC_DECISION.deny,
        reasonCode: PBAC_REASON_CODE.actionNotGranted,
        correlationId: "correlation-1",
        policyId: null,
        policyVersion: null,
      })),
    } as unknown as PbacPreflightService;

    const controller = new InternalAgenticToolDispatchController(
      queryBus,
      {} as PythonWorkerRuntimeClient,
      configMock(),
      runtimeEventsMock(),
      commandBus,
      pbacPreflight,
    );

    await expect(controller.dispatch(commandPayload())).rejects.toBeDefined();
    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(queryBus.execute).not.toHaveBeenCalled();
  });
});
