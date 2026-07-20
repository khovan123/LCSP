"use client";

import { useEffect, useState } from "react";
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
  acceptInvitation,
  previewInvitation,
  type InvitationPreviewOutcome,
} from "@/lib/api/auth-client";

import {
  acceptInvitationSchema,
  type AcceptInvitationFormValues,
} from "../../schemas/accept-invitation.schema";

type SubmissionError =
  | "invitation_invalid"
  | "email_already_exists"
  | "request_failed"
  | null;

export function AcceptInvitationForm({
  invitationToken,
}: {
  invitationToken: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitationPreviewOutcome | null>(
    invitationToken ? null : { kind: "invitation_invalid" },
  );
  const [submissionError, setSubmissionError] =
    useState<SubmissionError>(null);
  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { display_name: "", password: "" },
  });

  useEffect(() => {
    let isActive = true;
    if (!invitationToken) {
      return () => {
        isActive = false;
      };
    }

    void previewInvitation(invitationToken)
      .then((outcome) => {
        if (isActive) setPreview(outcome);
      })
      .catch(() => {
        if (isActive) setPreview({ kind: "error" });
      });

    return () => {
      isActive = false;
    };
  }, [invitationToken]);

  async function onSubmit(values: AcceptInvitationFormValues) {
    setSubmissionError(null);
    const outcome = await acceptInvitation({
      invitation_token: invitationToken,
      display_name: values.display_name.trim(),
      password: values.password,
    }).catch(() => ({ kind: "error" as const }));

    if (outcome.kind === "invitation_accepted") {
      form.reset();
      router.replace(outcome.location);
      return;
    }
    if (outcome.kind === "password_too_short") {
      form.setError("password", {
        message: "pages.acceptInvitation.errors.passwordTooShort",
      });
      return;
    }
    setSubmissionError(
      outcome.kind === "error" ? "request_failed" : outcome.kind,
    );
  }

  const invalidInvitation =
    preview?.kind === "invitation_invalid" ||
    submissionError === "invitation_invalid";
  const canSubmit = preview?.kind === "loaded" && !invalidInvitation;

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

            {preview?.kind === "loaded" ? (
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

            {submissionError === "email_already_exists" ? (
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

            {(preview?.kind === "error" ||
              submissionError === "request_failed") &&
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
              type="text"
              autoComplete="name"
              labelKey="pages.acceptInvitation.displayNameLabel"
              descriptionKey="pages.acceptInvitation.displayNameDescription"
            />
            <InvitationField
              name="password"
              type="password"
              autoComplete="new-password"
              labelKey="pages.acceptInvitation.passwordLabel"
              descriptionKey="pages.acceptInvitation.passwordDescription"
            />
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}

function InvitationPreviewSummary({
  preview,
}: {
  preview: Extract<InvitationPreviewOutcome, { kind: "loaded" }>["preview"];
}) {
  const visibleActions = getVisibleDeveloperActions(preview.allowed_actions);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
      <p className="font-medium">{preview.organization.name}</p>
      <p className="text-muted-foreground">
        {preview.scope.type === "assessment"
          ? preview.scope.assessment.name
          : resolveMessage(appLocale, "pages.acceptInvitation.organizationScope")}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        {visibleActions.map(({ action, labelKey }) => (
          <li key={action}>{resolveMessage(appLocale, labelKey)}</li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {resolveMessage(appLocale, "pages.acceptInvitation.expiresLabel")}: {" "}
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
}: {
  name: keyof AcceptInvitationFormValues;
  type: "text" | "password";
  autoComplete: string;
  labelKey:
    | "pages.acceptInvitation.displayNameLabel"
    | "pages.acceptInvitation.passwordLabel";
  descriptionKey:
    | "pages.acceptInvitation.displayNameDescription"
    | "pages.acceptInvitation.passwordDescription";
}) {
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
