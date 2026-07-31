"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { resolveMessage } from "@lcsp/i18n";
import { FormProvider, useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormCard } from "@/components/organisms/form-card";
import { appLocale } from "@/lib/locale";
import { useRequestRecoveryMutation } from "@/lib/api/auth-queries";
import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "@/lib/api/outcome-kinds";

import {
  recoveryRequestSchema,
  type RecoveryRequestFormValues,
} from "../../schemas/recovery-request.schema";

export function RecoveryRequestForm() {
  const requestMutation = useRequestRecoveryMutation();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<{
    titleKey: Parameters<typeof resolveMessage>[1];
    detailKey: Parameters<typeof resolveMessage>[1];
  } | null>(null);
  const form = useForm<RecoveryRequestFormValues>({
    resolver: zodResolver(recoveryRequestSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RecoveryRequestFormValues) {
    setError(null);
    const outcome = await requestMutation.mutateAsync(values).catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.recoveryRequest.errors.requestFailedTitle" as const,
      detailKey: "pages.recoveryRequest.errors.requestFailedDetail" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.requested) {
      setSubmitted(true);
      form.reset();
      return;
    }

    setError(outcome);
  }

  const emailError = form.formState.errors.email?.message;

  return (
    <FormProvider {...form}>
      <FormCard
        eyebrow={resolveMessage(appLocale, "pages.recoveryRequest.formEyebrow")}
        title={resolveMessage(appLocale, "pages.recoveryRequest.formTitle")}
        description={resolveMessage(
          appLocale,
          "pages.recoveryRequest.formDescription",
        )}
        footer={
          <>
            <Button
              className="w-full"
              type="submit"
              form="recovery-request-form"
              disabled={form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
            >
              {resolveMessage(
                appLocale,
                form.formState.isSubmitting
                  ? "pages.recoveryRequest.submitting"
                  : "pages.recoveryRequest.submit",
              )}
            </Button>
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href={API_REDIRECT_LOCATIONS.signIn}
            >
              {resolveMessage(appLocale, "pages.recoveryRequest.backToSignIn")}
            </Link>
          </>
        }
      >
        <form
          id="recovery-request-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(emailError) || undefined}>
              <FieldLabel htmlFor="email">
                {resolveMessage(appLocale, "pages.recoveryRequest.emailLabel")}
              </FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(emailError)}
                {...form.register("email")}
              />
              {emailError ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    emailError as Parameters<typeof resolveMessage>[1],
                  )}
                </FieldError>
              ) : (
                <FieldDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryRequest.emailDescription",
                  )}
                </FieldDescription>
              )}
            </Field>

            {submitted ? (
              <Alert>
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryRequest.successTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryRequest.successDetail",
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(appLocale, error.titleKey)}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(appLocale, error.detailKey)}
                </AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}
