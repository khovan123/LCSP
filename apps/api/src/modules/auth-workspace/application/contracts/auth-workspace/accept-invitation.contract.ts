export type AcceptInvitationRequest = {
  invitation_token?: string;
  display_name?: string;
  password?: string;
};

export type AcceptInvitationResponse = {
  user_id: string;
  session_token: string;
  expires_at: string;
  organization_id: string;
  allowed_actions: string[];
  correlation_id: string;
};

export type AcceptInvitationErrorCode =
  | "INVITATION_INVALID"
  | "INVITATION_NOT_APPROVED"
  | "EMAIL_ALREADY_EXISTS"
  | "PASSWORD_TOO_SHORT"
  | "INVALID_REQUEST";
