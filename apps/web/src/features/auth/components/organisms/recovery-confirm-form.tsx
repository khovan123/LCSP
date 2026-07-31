"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useConfirmRecoveryMutation } from "@/lib/api/auth-queries";
import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "@/lib/api/outcome-kinds";

import {
  recoveryConfirmSchema,
  type RecoveryConfirmFormValues,
} from "../../schemas/recovery-confirm.schema";

export function RecoveryConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const confirmMutation = useConfirmRecoveryMutation();
  const form = useForm<RecoveryConfirmFormValues>({
    resolver: zodResolver(recoveryConfirmSchema),
    defaultValues: { token, new_password: "" },
  });

  async function onSubmit(values: RecoveryConfirmFormValues) {
    const outcome = await confirmMutation.mutateAsync(values).catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.recoveryConfirm.errors.requestFailedTitle" as const,
      detailKey: "pages.recoveryConfirm.errors.requestFailedDetail" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.verified) {
      router.replace(`${API_REDIRECT_LOCATIONS.signIn}?recovered=1`);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.invalid) {
      form.setError("token", {
        message: "auth.errors.recoveryInvalid.detail",
      });
      return;
    }

    form.setError("root", { message: outcome.detailKey });
  }

  const tokenError = form.formState.errors.token?.message;
  const passwordError = form.formState.errors.new_password?.message;
  const rootError = form.formState.errors.root?.message;

  return (
    <FormProvider {...form}>
      <FormCard
        eyebrow={resolveMessage(appLocale, "pages.recoveryConfirm.formEyebrow")}
        title={resolveMessage(appLocale, "pages.recoveryConfirm.formTitle")}
        description={resolveMessage(
          appLocale,
          "pages.recoveryConfirm.formDescription",
        )}
        footer={
          <>
            <Button
              className="w-full"
              type="submit"
              form="recovery-confirm-form"
              disabled={form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
            >
              {resolveMessage(
                appLocale,
                form.formState.isSubmitting
                  ? "pages.recoveryConfirm.submitting"
                  : "pages.recoveryConfirm.submit",
              )}
            </Button>
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href={API_REDIRECT_LOCATIONS.recoveryRequest}
            >
              {resolveMessage(
                appLocale,
                "pages.recoveryConfirm.requestAnother",
              )}
            </Link>
          </>
        }
      >
        <form
          id="recovery-confirm-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field
              data-invalid={Boolean(tokenError) || undefined}
              className="hidden"
            >
              <FieldLabel htmlFor="token">
                {resolveMessage(appLocale, "pages.recoveryConfirm.tokenLabel")}
              </FieldLabel>
              <Input
                id="token"
                autoComplete="one-time-code"
                aria-invalid={Boolean(tokenError)}
                {...form.register("token")}
              />
              {tokenError ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    tokenError as Parameters<typeof resolveMessage>[1],
                  )}
                </FieldError>
              ) : (
                <FieldDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryConfirm.tokenDescription",
                  )}
                </FieldDescription>
              )}
            </Field>
            <Field data-invalid={Boolean(passwordError) || undefined}>
              <FieldLabel htmlFor="new_password">
                {resolveMessage(
                  appLocale,
                  "pages.recoveryConfirm.passwordLabel",
                )}
              </FieldLabel>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(passwordError)}
                {...form.register("new_password")}
              />
              {passwordError ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    passwordError as Parameters<typeof resolveMessage>[1],
                  )}
                </FieldError>
              ) : (
                <FieldDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryConfirm.passwordDescription",
                  )}
                </FieldDescription>
              )}
            </Field>
            {rootError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.recoveryConfirm.errors.requestFailedTitle",
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
          </FieldGroup>
        </form>
      </FormCard>
    </FormProvider>
  );
}
