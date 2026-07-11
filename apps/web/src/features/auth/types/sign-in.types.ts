import type { SignInFormValues } from "../schemas/sign-in.schema";
import type { MessageKey } from "@lcsp/i18n";

export type CredentialFieldName = keyof SignInFormValues;

export type CredentialFieldDefinition = {
  name: CredentialFieldName;
  labelKey: MessageKey;
  type: "email" | "password";
  autoComplete: "email" | "current-password";
  descriptionKey: MessageKey;
};

export type CredentialFieldProps = {
  field: CredentialFieldDefinition;
};
