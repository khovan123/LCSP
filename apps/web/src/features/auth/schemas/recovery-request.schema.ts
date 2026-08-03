import { z } from "zod";

export const recoveryRequestSchema = z.object({
  email: z
    .string()
    .min(1, "pages.recoveryRequest.errors.emailRequired")
    .email("pages.recoveryRequest.errors.emailInvalid"),
});

export type RecoveryRequestFormValues = z.infer<typeof recoveryRequestSchema>;
