"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { resolveMessage } from "@lcsp/i18n";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { FormCard } from "@/components/organisms/form-card";
import { Spinner } from "@/components/ui/spinner";
import {
  useMfaRecoveryCodeVerifyMutation,
  useMfaVerifyMutation,
} from "@/lib/api/auth-queries";
import { API_OUTCOME_KINDS, API_REDIRECT_LOCATIONS } from "@/lib/api/outcome-kinds";
import type { MfaVerifyError } from "@/lib/api/types/mfa-verify.types";

import { appLocale } from "@/lib/locale";
import {
  mfaRecoveryCodeVerifySchema,
  mfaVerifySchema,
  type MfaRecoveryCodeVerifyFormValues,
  type MfaVerifyFormValues,
} from "../../schemas/mfa-verify.schema";

const MFA_VERIFY_METHODS = {
  otp: "otp",
  recoveryCode: "recovery_code",
} as const;

type MfaVerifyMethod =
  (typeof MFA_VERIFY_METHODS)[keyof typeof MFA_VERIFY_METHODS];

export function MfaVerifyForm() {
  const router = useRouter();
  const mfaVerifyMutation = useMfaVerifyMutation();
  const recoveryCodeVerifyMutation = useMfaRecoveryCodeVerifyMutation();
  const [error, setError] = useState<MfaVerifyError>();
  const [isLocked, setIsLocked] = useState(false);
  const [method, setMethod] = useState<MfaVerifyMethod>(
    MFA_VERIFY_METHODS.otp,
  );
  const form = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { otp: "" },
  });
  const recoveryCodeForm = useForm<MfaRecoveryCodeVerifyFormValues>({
    resolver: zodResolver(mfaRecoveryCodeVerifySchema),
    defaultValues: { code: "" },
  });
  const otpError = form.formState.errors.otp?.message;
  const recoveryCodeError = recoveryCodeForm.formState.errors.code?.message;
  const isSubmitting =
    form.formState.isSubmitting || recoveryCodeForm.formState.isSubmitting;

  async function onSubmit(values: MfaVerifyFormValues) {
    setError(undefined);
    const outcome = await mfaVerifyMutation.mutateAsync(values).catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.mfaVerify.errors.requestFailedTitle" as const,
      detailKey: "pages.mfaVerify.errors.requestFailedDetail" as const,
    }));
    form.resetField("otp");

    if (outcome.kind === API_OUTCOME_KINDS.verified) {
      router.replace("/workspace");
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.sessionInvalid) {
      router.replace(API_REDIRECT_LOCATIONS.signIn);
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.mfaRequired) {
      router.replace(API_REDIRECT_LOCATIONS.mfaEnroll);
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.rateLimited) {
      setIsLocked(true);
    }
    setError(outcome);
  }

  async function onRecoveryCodeSubmit(
    values: MfaRecoveryCodeVerifyFormValues,
  ) {
    setError(undefined);
    const outcome = await recoveryCodeVerifyMutation
      .mutateAsync(values)
      .catch(() => ({
        kind: API_OUTCOME_KINDS.error,
        titleKey: "pages.mfaVerify.errors.requestFailedTitle" as const,
        detailKey: "pages.mfaVerify.errors.requestFailedDetail" as const,
      }));
    recoveryCodeForm.resetField("code");

    if (outcome.kind === API_OUTCOME_KINDS.verified) {
      router.replace("/workspace");
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.sessionInvalid) {
      router.replace(API_REDIRECT_LOCATIONS.signIn);
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.mfaRequired) {
      router.replace(API_REDIRECT_LOCATIONS.mfaEnroll);
      return;
    }
    if (outcome.kind === API_OUTCOME_KINDS.rateLimited) {
      setIsLocked(true);
    }
    setError(outcome);
  }

  const switchMethod = () => {
    setError(undefined);
    setMethod((current) =>
      current === MFA_VERIFY_METHODS.otp
        ? MFA_VERIFY_METHODS.recoveryCode
        : MFA_VERIFY_METHODS.otp,
    );
  };

  const activeFormId =
    method === MFA_VERIFY_METHODS.otp
      ? "mfa-verify-form"
      : "mfa-recovery-code-verify-form";

  return (
    <FormCard
      eyebrow={resolveMessage(appLocale, "pages.mfaVerify.formEyebrow")}
      title={resolveMessage(
        appLocale,
        method === MFA_VERIFY_METHODS.otp
          ? "pages.mfaVerify.formTitle"
          : "pages.mfaVerify.recoveryCodeTitle",
      )}
      description={resolveMessage(
        appLocale,
        method === MFA_VERIFY_METHODS.otp
          ? "pages.mfaVerify.formDescription"
          : "pages.mfaVerify.recoveryCodeDescription",
      )}
      footer={
        <>
          <Button
            className="w-full"
            type="submit"
            form={activeFormId}
            disabled={isSubmitting || isLocked}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting
              ? resolveMessage(appLocale, "pages.mfaVerify.submitting")
              : resolveMessage(
                  appLocale,
                  method === MFA_VERIFY_METHODS.otp
                    ? "pages.mfaVerify.submit"
                    : "pages.mfaVerify.recoveryCodeSubmit",
                )}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {resolveMessage(appLocale, "pages.mfaVerify.accessHelp")}
          </p>
          <p className="text-center text-xs">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-xs"
              onClick={switchMethod}
            >
              {resolveMessage(
                appLocale,
                method === MFA_VERIFY_METHODS.otp
                  ? "pages.mfaVerify.moreOptions"
                  : "pages.mfaVerify.useAuthenticator",
              )}
            </Button>
          </p>
        </>
      }
    >
      {method === MFA_VERIFY_METHODS.otp ? (
        <form
          id="mfa-verify-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FieldGroup>
            <Field
              data-invalid={Boolean(otpError) || undefined}
              data-disabled={isSubmitting || isLocked || undefined}
            >
              <FieldLabel htmlFor="otp">
                {resolveMessage(appLocale, "pages.mfaVerify.otpLabel")}
              </FieldLabel>
              <Controller
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    autoComplete="one-time-code"
                    containerClassName="justify-center"
                    disabled={isSubmitting || isLocked}
                    aria-invalid={Boolean(otpError)}
                    {...field}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        aria-invalid={Boolean(otpError)}
                      />
                      <InputOTPSlot
                        index={1}
                        aria-invalid={Boolean(otpError)}
                      />
                      <InputOTPSlot
                        index={2}
                        aria-invalid={Boolean(otpError)}
                      />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={3}
                        aria-invalid={Boolean(otpError)}
                      />
                      <InputOTPSlot
                        index={4}
                        aria-invalid={Boolean(otpError)}
                      />
                      <InputOTPSlot
                        index={5}
                        aria-invalid={Boolean(otpError)}
                      />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              {otpError ? (
                <FieldError>
                  {resolveMessage(
                    appLocale,
                    otpError as Parameters<typeof resolveMessage>[1],
                  )}
                </FieldError>
              ) : (
                <FieldDescription>
                  {resolveMessage(appLocale, "pages.mfaVerify.otpDescription")}
                </FieldDescription>
              )}
            </Field>
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
      ) : (
        <form
          id="mfa-recovery-code-verify-form"
          onSubmit={recoveryCodeForm.handleSubmit(onRecoveryCodeSubmit)}
          noValidate
        >
        <FieldGroup>
          <Field
            data-invalid={Boolean(recoveryCodeError) || undefined}
            data-disabled={isSubmitting || isLocked || undefined}
          >
            <FieldLabel htmlFor="recovery-code">
              {resolveMessage(appLocale, "pages.mfaVerify.recoveryCodeLabel")}
            </FieldLabel>
            <Controller
              control={recoveryCodeForm.control}
              name="code"
              render={({ field }) => (
                <Input
                  id="recovery-code"
                  autoComplete="one-time-code"
                  inputMode="text"
                  disabled={isSubmitting || isLocked}
                  aria-invalid={Boolean(recoveryCodeError)}
                  placeholder={resolveMessage(
                    appLocale,
                    "pages.mfaVerify.recoveryCodePlaceholder",
                  )}
                  {...field}
                  onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                />
              )}
            />
            {recoveryCodeError ? (
              <FieldError>
                {resolveMessage(
                  appLocale,
                  recoveryCodeError as Parameters<typeof resolveMessage>[1],
                )}
              </FieldError>
            ) : (
              <FieldDescription>
                {resolveMessage(
                  appLocale,
                  "pages.mfaVerify.recoveryCodeHelp",
                )}
              </FieldDescription>
            )}
          </Field>
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
      )}
    </FormCard>
  );
}
