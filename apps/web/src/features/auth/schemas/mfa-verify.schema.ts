import { z } from "zod";

export const mfaVerifySchema = z.object({
  otp: z
    .string()
    .min(1, "pages.mfaVerify.errors.otpRequired")
    .regex(/^\d{6}$/, "pages.mfaVerify.errors.otpInvalidFormat"),
});

export type MfaVerifyFormValues = z.infer<typeof mfaVerifySchema>;

export const mfaRecoveryCodeVerifySchema = z.object({
  code: z
    .string()
    .min(1, "pages.mfaVerify.errors.recoveryCodeRequired")
    .regex(
      /^[A-Za-z0-9]{4}[-\s]?[A-Za-z0-9]{4}[-\s]?[A-Za-z0-9]{4}$/,
      "pages.mfaVerify.errors.recoveryCodeInvalidFormat",
    ),
});

export type MfaRecoveryCodeVerifyFormValues = z.infer<
  typeof mfaRecoveryCodeVerifySchema
>;
