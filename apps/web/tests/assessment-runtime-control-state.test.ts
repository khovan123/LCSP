import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSESSMENT_RUNTIME_CONTROL_STATES as States } from "@lcsp/contracts/evidence";
import { mergeRuntimeControlResponse } from "../src/lib/api/assessment-runtime-control-state.ts";

test("a delayed Stop response cannot revert a stopped acknowledgement", () => {
  const stopped = {
    state: States.stopped,
    targetRunId: "old",
    requestId: "stop",
  };
  assert.equal(
    mergeRuntimeControlResponse(stopped, {
      ...stopped,
      state: States.stopRequested,
    }),
    stopped,
  );
});
test("a delayed response from the cancelled generation cannot replace resumed state", () => {
  const resumed = {
    state: States.running,
    targetRunId: "new",
    requestId: null,
  };
  assert.equal(
    mergeRuntimeControlResponse(resumed, {
      state: States.resumeRequested,
      targetRunId: "old",
      requestId: "continue",
    }),
    resumed,
  );
});
test("completion wins over delayed stop acknowledgement", () => {
  const completed = {
    state: States.completed,
    targetRunId: "old",
    requestId: "stop",
  };
  assert.equal(
    mergeRuntimeControlResponse(completed, {
      ...completed,
      state: States.stopped,
    }),
    completed,
  );
});
