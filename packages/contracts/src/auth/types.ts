import type { REQUIRED_ACTIONS } from "./actions.ts";
import type {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_ERROR_CODES,
  INVITE_DEVELOPER_ERROR_CODES,
  REVOKE_MEMBERSHIP_ERROR_CODES,
} from "./codes.ts";

export type RequiredAction =
  (typeof REQUIRED_ACTIONS)[keyof typeof REQUIRED_ACTIONS];

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export type AcceptInvitationErrorCode =
  (typeof ACCEPT_INVITATION_ERROR_CODES)[keyof typeof ACCEPT_INVITATION_ERROR_CODES];

export type InviteDeveloperErrorCode =
  (typeof INVITE_DEVELOPER_ERROR_CODES)[keyof typeof INVITE_DEVELOPER_ERROR_CODES];

export type RevokeMembershipErrorCode =
  (typeof REVOKE_MEMBERSHIP_ERROR_CODES)[keyof typeof REVOKE_MEMBERSHIP_ERROR_CODES];
