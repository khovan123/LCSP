import { z } from "zod";

export const profileSafetySchema = z.object({
  recovery_email: z
    .string()
    .trim()
    .email("pages.workspace.security.errors.recoveryEmailInvalid")
    .or(z.literal("")),
});

export type ProfileSafetyFormValues = z.infer<typeof profileSafetySchema>;
