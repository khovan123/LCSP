import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PUBLIC_ENTRY_ROUTES } from "../../auth-entry.ts";
import type {
  WizardAnswers,
  WizardPageOutcome,
  WizardSaveOutcome,
  WizardSubmitOutcome,
} from "@/features/wizard/types/wizard.types";

type ApiProblemPayload = {
  code?: string;
  error_code?: string;
  problem?: {
    code?: string;
    error_code?: string;
  };
};

type AssessmentDetailPayload = {
  assessment_id?: unknown;
  name?: unknown;
  wizard_status?: unknown;
};

export async function getWizardAssessment(
  assessmentId: string,
): Promise<WizardPageOutcome> {
  const response = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);

  if (response.ok && isAssessmentDetailPayload(payload)) {
    return {
      kind: "loaded",
      assessment: {
        assessmentId: payload.assessment_id,
        name: payload.name,
        wizardStatus: payload.wizard_status,
      },
    };
  }

  const code = getProblemCode(payload);
  if (
    response.status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  return {
    kind: "error",
    titleKey: "pages.wizard.errors.loadTitle",
    detailKey: "pages.wizard.errors.loadDetail",
  };
}

export async function saveWizardDraft(
  assessmentId: string,
  answers: WizardAnswers,
): Promise<WizardSaveOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/draft`,
    {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return { kind: "saved", savedAt: new Date().toISOString() };
  }

  return toWizardSaveOutcome(payload, response.status);
}

export async function submitWizard(
  assessmentId: string,
  answers: WizardAnswers,
): Promise<WizardSubmitOutcome> {
  const response = await fetch(
    `/api/assessments/${encodeURIComponent(assessmentId)}/wizard/submit`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );
  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) {
    return { kind: "submitted" };
  }

  return toWizardSubmitOutcome(payload, response.status);
}

function toWizardSaveOutcome(
  payload: unknown,
  status: number,
): WizardSaveOutcome {
  const code = getProblemCode(payload);

  if (
    status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  if (code === "WIZARD_ALREADY_SUBMITTED") {
    return { kind: "already_submitted" };
  }

  return {
    kind: "error",
    detailKey: "pages.wizard.errors.saveFailed",
  };
}

function toWizardSubmitOutcome(
  payload: unknown,
  status: number,
): WizardSubmitOutcome {
  const code = getProblemCode(payload);

  if (
    status === 401 ||
    code === AUTH_ERROR_CODES.authRequired ||
    code === AUTH_ERROR_CODES.sessionInvalid
  ) {
    return { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn };
  }

  if (code === "WIZARD_ALREADY_SUBMITTED") {
    return { kind: "already_submitted" };
  }

  return {
    kind: "error",
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

function getProblemCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as ApiProblemPayload;
  return (
    problem.problem?.code ??
    problem.problem?.error_code ??
    problem.code ??
    problem.error_code
  );
}
