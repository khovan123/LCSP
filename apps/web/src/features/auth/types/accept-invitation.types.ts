import type { InvitationPreviewOutcome } from "@/lib/api/auth-client";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";
import type { AcceptInvitationFormValues } from "../schemas/accept-invitation.schema";

export const ACCEPT_INVITATION_SUBMISSION_ERRORS = {
  invitationInvalid: API_OUTCOME_KINDS.invitationInvalid,
  emailAlreadyExists: API_OUTCOME_KINDS.emailAlreadyExists,
  requestFailed: "request_failed",
} as const;

export const ACCEPT_INVITATION_FIELD_TYPES = {
  text: "text",
  password: "password",
} as const;

export const ACCEPT_INVITATION_FIELD_LABEL_KEYS = {
  displayName: "pages.acceptInvitation.displayNameLabel",
  password: "pages.acceptInvitation.passwordLabel",
} as const;

export const ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS = {
  displayName: "pages.acceptInvitation.displayNameDescription",
  password: "pages.acceptInvitation.passwordDescription",
} as const;

export type SubmissionError =
  | (typeof ACCEPT_INVITATION_SUBMISSION_ERRORS)[keyof typeof ACCEPT_INVITATION_SUBMISSION_ERRORS]
  | null;

export type InvitationFieldType =
  (typeof ACCEPT_INVITATION_FIELD_TYPES)[keyof typeof ACCEPT_INVITATION_FIELD_TYPES];

export type InvitationFieldLabelKey =
  (typeof ACCEPT_INVITATION_FIELD_LABEL_KEYS)[keyof typeof ACCEPT_INVITATION_FIELD_LABEL_KEYS];

export type InvitationFieldDescriptionKey =
  (typeof ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS)[keyof typeof ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS];

export type AcceptInvitationFormProps = {
  invitationToken: string;
};

export type InvitationPreviewSummaryProps = {
  preview: Extract<
    InvitationPreviewOutcome,
    { kind: typeof API_OUTCOME_KINDS.loaded }
  >["preview"];
};

export type InvitationFieldProps = {
  name: keyof AcceptInvitationFormValues;
  type: InvitationFieldType;
  autoComplete: string;
  labelKey: InvitationFieldLabelKey;
  descriptionKey: InvitationFieldDescriptionKey;
};
