"use client";

import { useState } from "react";
import {
  AUTH_BACKUP_EMAIL_POLICIES,
  AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES,
  type AuthBackupEmailPolicy,
  type AuthPrimaryEmailAddressPolicy,
} from "@lcsp/contracts/auth";
import { resolveMessage } from "@lcsp/i18n";
import { MailIcon, MoreHorizontalIcon } from "lucide-react";

import { SectionHeading } from "@/components/molecules/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appLocale } from "@/lib/locale";
import type { EmailSettingsSectionProps } from "../../types/settings-page.types";

export function EmailSettingsSection({
  profile,
  primaryEmailBadgeKey,
  recoveryForm,
  onSubmit,
  onPrimaryEmailPolicyChange,
  onBackupPolicyChange,
  primaryPolicySaving,
  backupPolicySaving,
}: EmailSettingsSectionProps) {
  const [selectedPrimaryEmail, setSelectedPrimaryEmail] =
    useState<AuthPrimaryEmailAddressPolicy | null>(null);
  const [selectedBackupEmail, setSelectedBackupEmail] =
    useState<AuthBackupEmailPolicy | null>(null);

  const emailAddresses = [
    {
      value: profile?.email ?? "",
      badgeKey: primaryEmailBadgeKey,
      secondaryBadgeKey: "pages.workspace.settingsHub.badges.primary" as const,
      descriptionKey:
        "pages.workspace.settingsHub.emails.primaryRowDescription" as const,
      menuLabelKey:
        "pages.workspace.settingsHub.emails.primaryMenuLabel" as const,
    },
    ...(profile?.recovery_email
      ? [
          {
            value: profile.recovery_email,
            badgeKey: "pages.workspace.settingsHub.badges.configured" as const,
            secondaryBadgeKey:
              "pages.workspace.settingsHub.badges.backup" as const,
            descriptionKey:
              "pages.workspace.settingsHub.emails.recoveryRowDescription" as const,
            menuLabelKey:
              "pages.workspace.settingsHub.emails.recoveryMenuLabel" as const,
          },
        ]
      : []),
  ].filter((entry) => entry.value.length > 0);

  const resolvedPrimaryEmail = selectedPrimaryEmail ?? profile?.email ?? "";
  const resolvedPrimaryEmailPolicy =
    selectedPrimaryEmail ??
    profile?.primary_email_address_policy ??
    AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES.accountEmail;
  const resolvedBackupEmail =
    selectedBackupEmail ??
    profile?.backup_recovery_email_policy ??
    AUTH_BACKUP_EMAIL_POLICIES.allVerified;
  const selectedBackupLabel =
    resolvedBackupEmail === AUTH_BACKUP_EMAIL_POLICIES.recoveryEmail &&
    profile?.recovery_email
      ? profile.recovery_email
      : resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.emails.backupAllVerifiedOption",
        );

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.emails.title",
        )}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.emails.description",
        )}
        icon={<MailIcon className="size-4" />}
      />

      <Card className="border-border/70">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.emails.addressListTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.emails.addressListDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b border-border/70">
            {emailAddresses.map((entry) => (
              <div
                key={entry.value}
                className="flex items-start justify-between gap-4 px-5 py-5"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-medium">
                      {entry.value}
                    </p>
                    <Badge variant="outline">
                      {resolveMessage(appLocale, entry.secondaryBadgeKey)}
                    </Badge>
                    <Badge variant="outline">
                      {resolveMessage(appLocale, entry.badgeKey)}
                    </Badge>
                  </div>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {resolveMessage(appLocale, entry.descriptionKey)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={resolveMessage(appLocale, entry.menuLabelKey)}
                >
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4 px-5 py-5">
            <h3 className="text-lg font-semibold">
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.emails.addEmailTitle",
              )}
            </h3>
            <form
              className="flex flex-col gap-4"
              onSubmit={recoveryForm.handleSubmit(onSubmit)}
              noValidate
            >
              <FieldGroup>
                <Field
                  data-invalid={
                    Boolean(recoveryForm.formState.errors.recovery_email) ||
                    undefined
                  }
                >
                  <FieldLabel htmlFor="recovery_email">
                    {resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.emails.addEmailInputLabel",
                    )}
                  </FieldLabel>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Input
                      id="recovery_email"
                      type="email"
                      autoComplete="email"
                      className="sm:max-w-sm"
                      placeholder={resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.emails.addEmailPlaceholder",
                      )}
                      {...recoveryForm.register("recovery_email")}
                    />
                    <Button
                      type="submit"
                      disabled={recoveryForm.formState.isSubmitting}
                    >
                      {resolveMessage(
                        appLocale,
                        recoveryForm.formState.isSubmitting
                          ? "pages.workspace.security.submitting"
                          : "pages.workspace.settingsHub.emails.addEmailAction",
                      )}
                    </Button>
                  </div>
                  {recoveryForm.formState.errors.recovery_email?.message ? (
                    <FieldError>
                      {resolveMessage(
                        appLocale,
                        recoveryForm.formState.errors.recovery_email
                          .message as Parameters<typeof resolveMessage>[1],
                      )}
                    </FieldError>
                  ) : (
                    <FieldDescription>
                      {resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.emails.addEmailDescription",
                      )}
                    </FieldDescription>
                  )}
                </Field>
                {recoveryForm.formState.errors.root?.message ? (
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
                        recoveryForm.formState.errors.root
                          .message as Parameters<typeof resolveMessage>[1],
                      )}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </FieldGroup>
            </form>
          </div>

          <div className="border-t border-border/70 px-5 py-5">
            <div className="flex flex-col gap-4 rounded-xl border border-border/70 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.emails.primaryPreferenceTitle",
                  )}
                </h3>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.emails.primaryPreferenceDescription",
                  )}
                </p>
              </div>
              <Select
                value={resolvedPrimaryEmailPolicy}
                onValueChange={async (nextValue) => {
                  const nextPolicy =
                    (nextValue as AuthPrimaryEmailAddressPolicy | null) ??
                    AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES.accountEmail;
                  setSelectedPrimaryEmail(nextPolicy);

                  const saved = await onPrimaryEmailPolicyChange(nextPolicy);
                  if (!saved) {
                    setSelectedPrimaryEmail(null);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full bg-background lg:w-80"
                  disabled={primaryPolicySaving}
                >
                  <SelectValue>
                    {resolvedPrimaryEmailPolicy ===
                    AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES.recoveryEmail
                      ? profile?.recovery_email || resolvedPrimaryEmail || "…"
                      : resolvedPrimaryEmail || "…"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES.accountEmail}
                  >
                    {profile?.email ?? "…"}
                  </SelectItem>
                  {profile?.recovery_email ? (
                    <SelectItem
                      value={AUTH_PRIMARY_EMAIL_ADDRESS_POLICIES.recoveryEmail}
                    >
                      {profile.recovery_email}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border/70 px-5 py-5">
            <div className="flex flex-col gap-4 rounded-xl border border-border/70 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.emails.backupPreferenceTitle",
                  )}
                </h3>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.emails.backupPreferenceDescription",
                  )}
                </p>
              </div>
              <Select
                value={resolvedBackupEmail}
                onValueChange={async (nextValue) => {
                  const nextPolicy =
                    (nextValue as AuthBackupEmailPolicy | null) ??
                    AUTH_BACKUP_EMAIL_POLICIES.allVerified;
                  setSelectedBackupEmail(nextPolicy);

                  const saved = await onBackupPolicyChange(nextPolicy);
                  if (!saved) {
                    setSelectedBackupEmail(null);
                  }
                }}
              >
                <SelectTrigger
                  className="w-full bg-background lg:w-80"
                  disabled={backupPolicySaving}
                >
                  <SelectValue>{selectedBackupLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTH_BACKUP_EMAIL_POLICIES.allVerified}>
                    {resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.emails.backupAllVerifiedOption",
                    )}
                  </SelectItem>
                  {profile?.recovery_email ? (
                    <SelectItem
                      value={AUTH_BACKUP_EMAIL_POLICIES.recoveryEmail}
                    >
                      {profile.recovery_email}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
