import {
  ASSESSMENT_RUNTIME_CONTROL_STATES as States,
  type AssessmentRuntimeControlResult,
} from "@lcsp/contracts/evidence";

const order = {
  [States.running]: 0,
  [States.stopRequested]: 1,
  [States.stopped]: 2,
  [States.resumeRequested]: 3,
  [States.completed]: 4,
};

/** A slow request response cannot overwrite a newer runtime acknowledgement. */
export function mergeRuntimeControlResponse(
  current: AssessmentRuntimeControlResult | null | undefined,
  response: AssessmentRuntimeControlResult | null,
): AssessmentRuntimeControlResult | null {
  if (!current) return response;
  if (!response || current.targetRunId !== response.targetRunId) return current;
  return order[current.state] > order[response.state] ? current : response;
}
