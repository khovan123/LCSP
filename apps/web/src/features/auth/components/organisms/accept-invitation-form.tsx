"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { resolveMessage } from "@lcsp/i18n";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FormCard } from "@/components/organisms/form-card";
import { getVisibleDeveloperActions } from "@/features/developer-task/config/action-labels";
import { appLocale } from "@/lib/locale";
import {
  INVITATION_SCOPE_TYPES,
  type InvitationPreviewOutcome,
} from "@/lib/api/auth-client";
import {
  useAcceptInvitationMutation,
  useInvitationPreviewQuery,
} from "@/lib/api/auth-queries";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";

import {
  acceptInvitationSchema,
  type AcceptInvitationFormValues,
} from "../../schemas/accept-invitation.schema";
import {
  ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS,
  ACCEPT_INVITATION_FIELD_LABEL_KEYS,
  ACCEPT_INVITATION_FIELD_TYPES,
  ACCEPT_INVITATION_SUBMISSION_ERRORS,
  type AcceptInvitationFormProps,
  type InvitationFieldDescriptionKey,
  type InvitationFieldLabelKey,
  type InvitationFieldProps,
  type InvitationFieldType,
  type InvitationPreviewSummaryProps,
  type SubmissionError,
} from "../../types/accept-invitation.types";

export function AcceptInvitationForm({
  invitationToken,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const previewQuery = useInvitationPreviewQuery(invitationToken);
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const [submissionError, setSubmissionError] =
    useState<SubmissionError>(null);
  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { display_name: "", password: "" },
  });

  async function onSubmit(values: AcceptInvitationFormValues) {
    setSubmissionError(null);
    const outcome = await acceptInvitationMutation.mutateAsync({
      invitation_token: invitationToken,
      display_name: values.display_name.trim(),
      password: values.password,
    }).catch(() => ({ kind: API_OUTCOME_KINDS.error }));

    if (outcome.kind === API_OUTCOME_KINDS.invitationAccepted) {
      form.reset();
      router.replace(outcome.location);
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.passwordTooShort) {
      form.setError("password", {
        message: "pages.acceptInvitation.errors.passwordTooShort",
      });
      return;
    }
    setSubmissionError(
      outcome.kind === API_OUTCOME_KINDS.error
        ? ACCEPT_INVITATION_SUBMISSION_ERRORS.requestFailed
        : outcome.kind,
    );
  }

  const preview: InvitationPreviewOutcome | null = !invitationToken
    ? { kind: API_OUTCOME_KINDS.invitationInvalid }
    : previewQuery.isError
      ? { kind: API_OUTCOME_KINDS.error }
      : previewQuery.data ?? null;
  const invalidInvitation =
    preview?.kind === API_OUTCOME_KINDS.invitationInvalid ||
    submissionError === ACCEPT_INVITATION_SUBMISSION_ERRORS.invitationInvalid;
  const canSubmit =
    preview?.kind === API_OUTCOME_KINDS.loaded && !invalidInvitation;

  return (
    <FormProvider {...form}>
      <FormCard
        eyebrow={resolveMessage(appLocale, "pages.acceptInvitation.eyebrow")}
        title={resolveMessage(appLocale, "pages.acceptInvitation.title")}
        description={resolveMessage(
          appLocale,
          "pages.acceptInvitation.description",
        )}
        footer={
          <Button
            className="w-full"
            type="submit"
            form="accept-invitation-form"
            disabled={!canSubmit || form.formState.isSubmitting}
            aria-busy={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {resolveMessage(
              appLocale,
              form.formState.isSubmitting
                ? "pages.acceptInvitation.submitting"
                : "pages.acceptInvitation.submit",
            )}
          </Button>
        }
      >
        <form
          id="accept-invitation-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            {preview === null ? (
              <p className="text-sm text-muted-foreground" role="status">
                {resolveMessage(appLocale, "pages.acceptInvitation.loading")}
              </p>
            ) : null}

            {preview?.kind === API_OUTCOME_KINDS.loaded ? (
              <InvitationPreviewSummary preview={preview.preview} />
            ) : null}

            {invalidInvitation ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.invalidTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.invalidDetail",
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {submissionError ===
            ACCEPT_INVITATION_SUBMISSION_ERRORS.emailAlreadyExists ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.emailExistsTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.emailExistsDetail",
                  )}{" "}
                  <Link className="underline" href="/sign-in">
                    {resolveMessage(
                      appLocale,
                      "pages.acceptInvitation.signInInstead",
                    )}
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}

            {(preview?.kind === API_OUTCOME_KINDS.error ||
              submissionError ===
                ACCEPT_INVITATION_SUBMISSION_ERRORS.requestFailed) &&
            !invalidInvitation ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.requestTitle",
                  )}
                </AlertTitle>
                <AlertDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.acceptInvitation.errors.requestDetail",
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            <InvitationField
              name="display_name"
              type={ACCEPT_INVITATION_FIELD_TYPES.text}
              autoComplete="name"
              labelKey={ACCEPT_INVITATION_FIELD_LABEL_KEYS.displayName}
              descriptionKey={ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS.displayName}
            />
            <InvitationField
              name="password"
              type={ACCEPT_INVITATION_FIELD_TYPES.password}
              autoComplete="new-password"
              labelKey={ACCEPT_INVITATION_FIELD_LABEL_KEYS.password}
              descriptionKey={ACCEPT_INVITATION_FIELD_DESCRIPTION_KEYS.password}
            />
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}

function InvitationPreviewSummary({
  preview,
}: InvitationPreviewSummaryProps) {
  const visibleActions = getVisibleDeveloperActions(preview.allowed_actions);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="font-medium">{preview.organization.name}</p>
      <p className="text-muted-foreground">
        {preview.scope.type === INVITATION_SCOPE_TYPES.assessment
          ? preview.scope.assessment.name
          : resolveMessage(appLocale, "pages.acceptInvitation.organizationScope")}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {visibleActions.map(({ action, labelKey }) => (
          <li key={action}>{resolveMessage(appLocale, labelKey)}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {resolveMessage(appLocale, "pages.acceptInvitation.expiresLabel")}:{" "}
        <time dateTime={preview.expires_at}>{preview.expires_at}</time>
      </p>
    </div>
  );
}

function InvitationField({
  name,
  type,
  autoComplete,
  labelKey,
  descriptionKey,
}: InvitationFieldProps) {
  const { formState, register } = useFormContext<AcceptInvitationFormValues>();
  const error = formState.errors[name]?.message;
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={name}>{resolveMessage(appLocale, labelKey)}</FieldLabel>
      <Input
        id={name}
        type={type}
        autoComplete={autoComplete}
        disabled={formState.isSubmitting}
        aria-invalid={Boolean(error)}
        {...register(name)}
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
          {resolveMessage(appLocale, descriptionKey)}
        </FieldDescription>
      )}
    </Field>
  );
}
