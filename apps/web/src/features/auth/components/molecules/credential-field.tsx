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

import { appLocale } from "@/lib/locale";
import type { SignInFormValues } from "../../schemas/sign-in.schema";
import type { CredentialFieldProps } from "../../types/sign-in.types";

export function CredentialField({ field }: CredentialFieldProps) {
  const { formState, register } = useFormContext<SignInFormValues>();
  const error = formState.errors[field.name]?.message;

  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={field.name}>
        {resolveMessage(appLocale, field.labelKey)}
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
            appLocale,
            error as Parameters<typeof resolveMessage>[1],
          )}
        </FieldError>
      ) : (
        <FieldDescription>
          {resolveMessage(appLocale, field.descriptionKey)}
        </FieldDescription>
      )}
    </Field>
  );
}
