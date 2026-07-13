import { REVOKE_MEMBERSHIP_ERROR_CODES } from "@lcsp/contracts/auth";

export type RevokeMembershipResponse = {
  revoked: true;
  affected_sessions: number;
  correlation_id: string;
};

export type RevokeMembershipErrorCode =
  (typeof REVOKE_MEMBERSHIP_ERROR_CODES)[keyof typeof REVOKE_MEMBERSHIP_ERROR_CODES];
