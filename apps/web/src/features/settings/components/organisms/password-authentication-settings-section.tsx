"use client";

import Image from "next/image";
import Link from "next/link";
import { resolveMessage } from "@lcsp/i18n";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { KeyRoundIcon, RefreshCwIcon } from "lucide-react";
import { Controller } from "react-hook-form";

import { LabeledStatusRow, LabeledValueRow } from "@/components/molecules/labeled-value-row";
import { SectionHeading } from "@/components/molecules/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { appLocale } from "@/lib/locale";
import type { PasswordAuthenticationSectionProps } from "../../types/settings-page.types";

export function PasswordAuthenticationSettingsSection({
  profile,
  mfaToggleBusy,
  mfaEditorOpen,
  setMfaEditorOpen,
  mfaError,
  qrCode,
  onToggleMfa,
  onGenerateMfaSetup,
  enrollPending,
  verifyForm,
  onVerifyOtp,
  onSendRecoveryInstructions,
  recoveryRequestSent,
  requestRecoveryPending,
}: PasswordAuthenticationSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.password.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.password.description",
        )}
        icon={<KeyRoundIcon className="size-4" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.password.signInMethodsTitle",
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <LabeledStatusRow
            label={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.password.emailMethod",
            )}
            status={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.badges.configured",
            )}
          />
          <LabeledStatusRow
            label={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.password.passwordMethod",
            )}
            status={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.badges.configured",
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.password.mfaTitle",
              )}
            </CardTitle>
            <CardDescription>
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.password.mfaDescription",
              )}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {resolveMessage(
              appLocale,
              profile?.mfa_enrolled
                ? "pages.workspace.settingsHub.badges.mfaEnabled"
                : "pages.workspace.settingsHub.badges.mfaPending",
            )}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <Field orientation="horizontal" className="items-center gap-3">
              <FieldContent>
                <FieldTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.password.authenticatorApp",
                  )}
                </FieldTitle>
                <FieldDescription>
                  {profile?.mfa_enrolled
                    ? resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.password.authenticatorConfigured",
                      )
                    : resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.password.authenticatorPending",
                      )}
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={profile?.mfa_enrolled === true}
                disabled={mfaToggleBusy}
                onCheckedChange={onToggleMfa}
                aria-label={resolveMessage(
                  appLocale,
                  profile?.mfa_enrolled
                    ? "pages.workspace.settingsHub.actions.turnOff"
                    : "pages.workspace.settingsHub.actions.turnOn",
                )}
              />
            </Field>
            <div className="flex items-center gap-3">
              {profile?.mfa_enrolled ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMfaEditorOpen((current) => !current);
                  }}
                >
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.actions.edit",
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {mfaEditorOpen ? (
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="font-medium">
                    {resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.password.inlineSetupTitle",
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.password.inlineSetupDescription",
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => void onGenerateMfaSetup()}
                  disabled={enrollPending}
                >
                  {enrollPending ? (
                    <RefreshCwIcon className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.actions.generateSetup",
                  )}
                </Button>
              </div>

              {mfaError ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    {resolveMessage(appLocale, mfaError.titleKey)}
                  </AlertTitle>
                  <AlertDescription>
                    {resolveMessage(appLocale, mfaError.detailKey)}
                  </AlertDescription>
                </Alert>
              ) : null}

              {qrCode ? (
                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="rounded-xl border bg-white p-3">
                    <Image
                      src={qrCode}
                      alt={resolveMessage(appLocale, "pages.mfaEnroll.qrAlt")}
                      className="size-60 max-w-full"
                      width={240}
                      height={240}
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
                      {resolveMessage(appLocale, "pages.mfaEnroll.qrHint")}
                    </div>
                    <form
                      onSubmit={verifyForm.handleSubmit(onVerifyOtp)}
                      className="flex flex-col gap-4"
                      noValidate
                    >
                      <FieldGroup>
                        <Field
                          data-invalid={
                            Boolean(verifyForm.formState.errors.otp) ||
                            undefined
                          }
                        >
                          <FieldLabel htmlFor="otp">
                            {resolveMessage(
                              appLocale,
                              "pages.mfaVerify.otpLabel",
                            )}
                          </FieldLabel>
                          <Controller
                            control={verifyForm.control}
                            name="otp"
                            render={({ field }) => (
                              <InputOTP
                                id="otp"
                                maxLength={6}
                                pattern={REGEXP_ONLY_DIGITS}
                                autoComplete="one-time-code"
                                containerClassName="justify-start"
                                disabled={verifyForm.formState.isSubmitting}
                                {...field}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            )}
                          />
                          {verifyForm.formState.errors.otp?.message ? (
                            <FieldError>
                              {resolveMessage(
                                appLocale,
                                verifyForm.formState.errors.otp
                                  .message as Parameters<
                                  typeof resolveMessage
                                >[1],
                              )}
                            </FieldError>
                          ) : (
                            <FieldDescription>
                              {resolveMessage(
                                appLocale,
                                "pages.mfaVerify.otpDescription",
                              )}
                            </FieldDescription>
                          )}
                        </Field>
                      </FieldGroup>
                      <Button
                        type="submit"
                        disabled={verifyForm.formState.isSubmitting}
                      >
                        {resolveMessage(
                          appLocale,
                          verifyForm.formState.isSubmitting
                            ? "pages.mfaVerify.submitting"
                            : "pages.workspace.settingsHub.actions.verifyAndSave",
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.password.recoveryTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.password.recoveryDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LabeledValueRow
            label={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.recoveryEmail",
            )}
            value={
              profile?.recovery_email ??
              resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.states.noRecoveryEmail",
              )
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void onSendRecoveryInstructions()}
              disabled={requestRecoveryPending || !profile}
            >
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.actions.sendRecovery",
              )}
            </Button>
            <Link
              className={buttonVariants({ variant: "ghost" })}
              href="/recovery/request"
            >
              {resolveMessage(
                appLocale,
                "pages.workspace.security.openRecovery",
              )}
            </Link>
          </div>
          {recoveryRequestSent ? (
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
        </CardContent>
      </Card>
    </section>
  );
}
