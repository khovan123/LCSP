import { z } from "zod";

export const mfaVerifySchema = z.object({
  otp: z
    .string()
    .min(1, "pages.mfaVerify.errors.otpRequired")
    .regex(/^\d{6}$/, "pages.mfaVerify.errors.otpInvalidFormat"),
});

export type MfaVerifyFormValues = z.infer<typeof mfaVerifySchema>;
