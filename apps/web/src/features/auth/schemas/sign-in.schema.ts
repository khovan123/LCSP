import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "pages.signIn.errors.emailRequired")
    .email("pages.signIn.errors.emailInvalid"),
  password: z.string().min(1, "pages.signIn.errors.passwordRequired"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
