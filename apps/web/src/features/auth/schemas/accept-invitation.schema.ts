import { z } from "zod";

export const acceptInvitationSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "pages.acceptInvitation.errors.displayNameRequired")
    .max(100, "pages.acceptInvitation.errors.displayNameTooLong"),
  password: z
    .string()
    .min(12, "pages.acceptInvitation.errors.passwordTooShort"),
});

export type AcceptInvitationFormValues = z.infer<
  typeof acceptInvitationSchema
>;
