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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { FormCard } from "@/components/organisms/form-card";
import { Spinner } from "@/components/ui/spinner";
import { verifyMfaOtp } from "@/lib/api/auth-client";
import type { MfaVerifyError } from "@/lib/api/types/mfa-verify.types";

import { appLocale } from "@/lib/locale";
import {
  mfaVerifySchema,
  type MfaVerifyFormValues,
} from "../../schemas/mfa-verify.schema";

export function MfaVerifyForm() {
  const router = useRouter();
  const [error, setError] = useState<MfaVerifyError>();
  const [isLocked, setIsLocked] = useState(false);
  const form = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { otp: "" },
  });
  const otpError = form.formState.errors.otp?.message;

  async function onSubmit(values: MfaVerifyFormValues) {
    setError(undefined);
    const outcome = await verifyMfaOtp(values).catch(() => ({
      kind: "error" as const,
      titleKey: "pages.mfaVerify.errors.requestFailedTitle" as const,
      detailKey: "pages.mfaVerify.errors.requestFailedDetail" as const,
    }));
    form.resetField("otp");

    if (outcome.kind === "verified") {
      router.replace("/workspace");
      return;
    }
    if (outcome.kind === "session_invalid") {
      router.replace("/sign-in");
      return;
    }
    if (outcome.kind === "rate_limited") {
      setIsLocked(true);
    }
    setError(outcome);
  }

  return (
    <FormCard
      eyebrow={resolveMessage(appLocale, "pages.mfaVerify.formEyebrow")}
      title={resolveMessage(appLocale, "pages.mfaVerify.formTitle")}
      description={resolveMessage(appLocale, "pages.mfaVerify.formDescription")}
      footer={
        <>
          <Button
            className="w-full"
            type="submit"
            form="mfa-verify-form"
            disabled={form.formState.isSubmitting || isLocked}
            aria-busy={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Spinner data-icon="inline-start" />
            ) : null}
            {form.formState.isSubmitting
              ? resolveMessage(appLocale, "pages.mfaVerify.submitting")
              : resolveMessage(appLocale, "pages.mfaVerify.submit")}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {resolveMessage(appLocale, "pages.mfaVerify.accessHelp")}
          </p>
        </>
      }
    >
      <form
        id="mfa-verify-form"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <FieldGroup>
          <Field
            data-invalid={Boolean(otpError) || undefined}
            data-disabled={form.formState.isSubmitting || isLocked || undefined}
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
                  disabled={form.formState.isSubmitting || isLocked}
                  aria-invalid={Boolean(otpError)}
                  {...field}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} aria-invalid={Boolean(otpError)} />
                    <InputOTPSlot index={1} aria-invalid={Boolean(otpError)} />
                    <InputOTPSlot index={2} aria-invalid={Boolean(otpError)} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} aria-invalid={Boolean(otpError)} />
                    <InputOTPSlot index={4} aria-invalid={Boolean(otpError)} />
                    <InputOTPSlot index={5} aria-invalid={Boolean(otpError)} />
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
    </FormCard>
  );
}
