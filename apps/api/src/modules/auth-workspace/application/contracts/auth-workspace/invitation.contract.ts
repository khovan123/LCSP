export type InviteDeveloperRequest = {
  email?: string;
  assessment_id?: string;
  allowed_actions?: string[];
  expires_in_hours?: number;
};

export type InviteDeveloperResponse = {
  invitation_id: string;
  email: string;
  expires_at: string;
  allowed_actions: string[];
  correlation_id: string;
};

export type InviteDeveloperErrorCode =
  | "INVALID_ACTIONS"
  | "ASSESSMENT_NOT_OWNED"
  | "INVALID_EMAIL"
  | "INVALID_REQUEST";
