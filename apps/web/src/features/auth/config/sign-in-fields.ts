import type { CredentialFieldDefinition } from "../types/sign-in.types";

export const signInFields: readonly CredentialFieldDefinition[] = [
  {
    name: "email",
    labelKey: "pages.signIn.emailLabel",
    type: "email",
    autoComplete: "email",
    descriptionKey: "pages.signIn.emailDescription",
  },
  {
    name: "password",
    labelKey: "pages.signIn.passwordLabel",
    type: "password",
    autoComplete: "current-password",
    descriptionKey: "pages.signIn.passwordDescription",
  },
];
