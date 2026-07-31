import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { WIZARD_ERROR_CODES } from "@lcsp/contracts/wizard";
import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";
import { apiRequest } from "./api-request.ts";
import { API_OUTCOME_KINDS } from "./outcome-kinds.ts";
import type {
  WizardPageOutcome,
  WizardSaveOutcome,
  WizardSubmitOutcome,
} from "@/features/wizard/types/wizard.types";
import type { WizardAnswer } from "@lcsp/contracts/wizard";

type AssessmentDetailPayload = {
  assessment_id?: unknown;
  name?: unknown;
  wizard_status?: unknown;
};

export async function getWizardAssessment(
  assessmentId: string,
): Promise<WizardPageOutcome> {
  const { payload, ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}`,
    {
      cache: "no-store",
    },
  );

  if (ok && isAssessmentDetailPayload(payload)) {
    return {
      kind: API_OUTCOME_KINDS.loaded,
      assessment: {
        assessmentId: payload.assessment_id,
        name: payload.name,
        wizardStatus: payload.wizard_status,
      },
    };
  }

  if (
    status === 401 ||
    problemCode === AUTH_ERROR_CODES.authRequired ||
    problemCode === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: PUBLIC_ENTRY_ROUTES.signIn,
    };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    titleKey: "pages.wizard.errors.loadTitle",
    detailKey: "pages.wizard.errors.loadDetail",
  };
}

export async function saveWizardDraft(
  assessmentId: string,
  answers: WizardAnswer[],
): Promise<WizardSaveOutcome> {
  const { ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/draft`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );

  if (ok) {
    return {
      kind: API_OUTCOME_KINDS.saved,
      savedAt: new Date().toISOString(),
    };
  }

  return toWizardSaveOutcome(status, problemCode);
}

export async function submitWizard(
  assessmentId: string,
  answers: WizardAnswer[],
): Promise<WizardSubmitOutcome> {
  const { ok, status, problemCode } = await apiRequest(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/submit`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );

  if (ok) {
    return { kind: API_OUTCOME_KINDS.submitted };
  }

  return toWizardSubmitOutcome(status, problemCode);
}

function toWizardSaveOutcome(
  status: number,
  problemCode: string | undefined,
): WizardSaveOutcome {
  if (
    status === 401 ||
    problemCode === AUTH_ERROR_CODES.authRequired ||
    problemCode === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: PUBLIC_ENTRY_ROUTES.signIn,
    };
  }

  if (problemCode === WIZARD_ERROR_CODES.alreadySubmitted) {
    return { kind: API_OUTCOME_KINDS.alreadySubmitted };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    detailKey: "pages.wizard.errors.saveFailed",
  };
}

function toWizardSubmitOutcome(
  status: number,
  problemCode: string | undefined,
): WizardSubmitOutcome {
  if (
    status === 401 ||
    problemCode === AUTH_ERROR_CODES.authRequired ||
    problemCode === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return {
      kind: API_OUTCOME_KINDS.redirect,
      location: PUBLIC_ENTRY_ROUTES.signIn,
    };
  }

  if (problemCode === WIZARD_ERROR_CODES.alreadySubmitted) {
    return { kind: API_OUTCOME_KINDS.alreadySubmitted };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    detailKey: "pages.wizard.errors.submitFailed",
  };
}

function isAssessmentDetailPayload(
  payload: unknown,
): payload is {
  assessment_id: string;
  name: string;
  wizard_status: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as AssessmentDetailPayload;
  return (
    typeof candidate.assessment_id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.wizard_status === "string"
  );
}
