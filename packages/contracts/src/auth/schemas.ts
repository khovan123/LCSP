import { z } from "zod";

import { AUTH_BACKUP_EMAIL_POLICIES } from "./backup-email-policy.ts";
import { MFA_RECOVERY_CODE_ACCESS_ACTIONS } from "./mfa.ts";
import { AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES } from "./primary-email-address-policy.ts";
import { AUTH_USER_ROLES } from "./roles.ts";

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  session_token: z.string().optional(),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(1).optional(),
  display_name: z.string().trim().min(1).max(100).optional(),
  organization_name: z.string().trim().optional(),
  email: z.string().trim().email(),
  password: z.string().min(1),
  role: z
    .enum(
      Object.values(AUTH_USER_ROLES) as [
        (typeof AUTH_USER_ROLES)[keyof typeof AUTH_USER_ROLES],
        ...(typeof AUTH_USER_ROLES)[keyof typeof AUTH_USER_ROLES][],
      ],
    )
    .optional(),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const revokeSessionSchema = z.object({
  session_token: z.string().min(1),
});
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

export const verifyMfaOtpSchema = z.object({
  session_token: z.string().min(1),
  otp: z.string().trim().min(1),
});
export type VerifyMfaOtpInput = z.infer<typeof verifyMfaOtpSchema>;

export const verifyMfaRecoveryCodeSchema = z.object({
  session_token: z.string().min(1),
  code: z.string().trim().min(1),
});
export type VerifyMfaRecoveryCodeInput = z.infer<
  typeof verifyMfaRecoveryCodeSchema
>;

export const recordMfaRecoveryCodeAccessSchema = z.object({
  action: z.enum(
    Object.values(MFA_RECOVERY_CODE_ACCESS_ACTIONS) as [
      (typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS)[keyof typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS],
      ...(typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS)[keyof typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS][],
    ],
  ),
});
export type RecordMfaRecoveryCodeAccessInput = z.infer<
  typeof recordMfaRecoveryCodeAccessSchema
>;

export const requestPasswordRecoverySchema = z.object({
  email: z.string().trim().email(),
});
export type RequestPasswordRecoveryInput = z.infer<
  typeof requestPasswordRecoverySchema
>;

export const confirmPasswordRecoverySchema = z.object({
  recovery_token: z.string().min(1),
  new_password: z.string().min(8),
});
export type ConfirmPasswordRecoveryInput = z.infer<
  typeof confirmPasswordRecoverySchema
>;

export const passwordReauthSchema = z.object({
  password: z.string().min(1),
});
export type PasswordReauthInput = z.infer<typeof passwordReauthSchema>;

export const updateProfileSchema = z.object({
  display_name: z.string().trim().max(120).optional(),
  recovery_email: z.string().trim().email().or(z.literal("")).optional(),
  primary_email_address_policy: z
    .enum(
      Object.values(AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES) as [
        (typeof AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES)[keyof typeof AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES],
        ...(typeof AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES)[keyof typeof AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES][],
      ],
    )
    .optional(),
  backup_recovery_email_policy: z
    .enum(
      Object.values(AUTH_BACKUP_EMAIL_POLICIES) as [
        (typeof AUTH_BACKUP_EMAIL_POLICIES)[keyof typeof AUTH_BACKUP_EMAIL_POLICIES],
        ...(typeof AUTH_BACKUP_EMAIL_POLICIES)[keyof typeof AUTH_BACKUP_EMAIL_POLICIES][],
      ],
    )
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const checkSensitiveRouteSchema = z
  .object({
    method: z.string().min(1),
    path: z.string().optional(),
    route: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.path && data.path.trim().length > 0) ||
          (data.route && data.route.trim().length > 0),
      ),
    {
      message: "Either path or route must be provided",
    },
  );
export type CheckSensitiveRouteInput = z.infer<typeof checkSensitiveRouteSchema>;

export const oauthStartSchema = z.object({
  provider: z.string().min(1),
  redirect_uri: z.string().min(1),
});
export type OAuthStartInput = z.infer<typeof oauthStartSchema>;

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  provider: z.string().min(1),
});
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;

export const oauthLinkStartSchema = z.object({
  provider: z.string().min(1),
  redirect_uri: z.string().min(1),
});
export type OAuthLinkStartInput = z.infer<typeof oauthLinkStartSchema>;

export const oauthLinkCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  provider: z.string().min(1),
});
export type OAuthLinkCallbackInput = z.infer<typeof oauthLinkCallbackSchema>;
