"use client";

import { resolveMessage } from "@lcsp/i18n";
import { useFormContext } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { authLocale } from "../../config/locale";
import type { SignInFormValues } from "../../schemas/sign-in.schema";
import type { CredentialFieldProps } from "../../types/sign-in.types";

export function CredentialField({ field }: CredentialFieldProps) {
  const { formState, register } = useFormContext<SignInFormValues>();
  const error = formState.errors[field.name]?.message;

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={field.name}>
        {resolveMessage(authLocale, field.labelKey)}
      </FieldLabel>
      <Input
        id={field.name}
        type={field.type}
        autoComplete={field.autoComplete}
        disabled={formState.isSubmitting}
        aria-invalid={Boolean(error)}
        {...register(field.name)}
      />
      {error ? (
        <FieldError>
          {resolveMessage(
            authLocale,
            error as Parameters<typeof resolveMessage>[1],
          )}
        </FieldError>
      ) : (
        <FieldDescription>
          {resolveMessage(authLocale, field.descriptionKey)}
        </FieldDescription>
      )}
    </Field>
  );
}
