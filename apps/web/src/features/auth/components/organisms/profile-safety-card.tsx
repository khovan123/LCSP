"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { resolveMessage } from "@lcsp/i18n";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { appLocale } from "@/lib/locale";
import { useUpdateProfileMutation } from "@/lib/api/auth-queries";
import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "@/lib/api/outcome-kinds";

import {
  profileSafetySchema,
  type ProfileSafetyFormValues,
} from "../../schemas/profile-safety.schema";

export function ProfileSafetyCard() {
  const updateMutation = useUpdateProfileMutation();
  const form = useForm<ProfileSafetyFormValues>({
    resolver: zodResolver(profileSafetySchema),
    defaultValues: { recovery_email: "" },
  });
  const recoveryEmailError = form.formState.errors.recovery_email?.message;
  const rootError = form.formState.errors.root?.message;

  async function onSubmit(values: ProfileSafetyFormValues) {
    const outcome = await updateMutation.mutateAsync(values).catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.workspace.security.errors.requestFailedTitle" as const,
      detailKey: "pages.workspace.security.errors.requestFailedDetail" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.saved) {
      form.reset(values);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.validationError) {
      form.setError("recovery_email", { message: outcome.detailKey });
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.sessionInvalid) {
      form.setError("root", {
        message: "auth.errors.sessionInvalid.detail",
      });
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.mfaRequired) {
      form.setError("root", {
        message: "auth.errors.mfaRequired.detail",
      });
      return;
    }

    form.setError("root", { message: outcome.detailKey });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {resolveMessage(appLocale, "pages.workspace.security.title")}
        </CardTitle>
        <CardDescription>
          {resolveMessage(appLocale, "pages.workspace.security.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={API_REDIRECT_LOCATIONS.mfaEnroll} />} variant="outline">
            {resolveMessage(
              appLocale,
              "pages.workspace.security.openMfaEnroll",
            )}
          </Button>
          <Button render={<Link href={API_REDIRECT_LOCATIONS.recoveryRequest} />} variant="ghost">
            {resolveMessage(appLocale, "pages.workspace.security.openRecovery")}
          </Button>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(recoveryEmailError) || undefined}>
              <FieldLabel htmlFor="recovery_email">
                {resolveMessage(
                  appLocale,
                  "pages.workspace.security.recoveryEmailLabel",
                )}
              </FieldLabel>
              <Input
                id="recovery_email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(recoveryEmailError)}
                {...form.register("recovery_email")}
              />
              {recoveryEmailError ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    recoveryEmailError as Parameters<typeof resolveMessage>[1],
                  )}
                </FieldError>
              ) : (
                <FieldDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.security.recoveryEmailDescription",
                  )}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          {updateMutation.isSuccess ? (
            <Alert>
              <AlertTitle>
                {resolveMessage(
                  appLocale,
                  "pages.workspace.security.successTitle",
                )}
              </AlertTitle>
              <AlertDescription>
                {resolveMessage(
                  appLocale,
                  "pages.workspace.security.successDetail",
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          {rootError ? (
            <Alert variant="destructive">
              <AlertTitle>
                {resolveMessage(
                  appLocale,
                  "pages.workspace.security.errors.requestFailedTitle",
                )}
              </AlertTitle>
              <AlertDescription>
                {resolveMessage(
                  appLocale,
                  rootError as Parameters<typeof resolveMessage>[1],
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {resolveMessage(
              appLocale,
              form.formState.isSubmitting
                ? "pages.workspace.security.submitting"
                : "pages.workspace.security.submit",
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
