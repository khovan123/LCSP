"use client";

import { resolveMessage } from "@lcsp/i18n";
import { MailIcon } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { appLocale } from "@/lib/locale";
import type { EmailSettingsSectionProps } from "../../types/settings-page.types";

export function EmailSettingsSection({
  profile,
  primaryEmailBadgeKey,
  recoveryEmailEditorOpen,
  setRecoveryEmailEditorOpen,
  recoveryForm,
  onSubmit,
}: EmailSettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.emails.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.emails.description",
        )}
        icon={<MailIcon className="size-4" />}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.emails.primaryTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.emails.primaryDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div>
              <p className="font-medium">{profile?.email ?? "…"}</p>
              <p className="text-sm text-muted-foreground">
                {resolveMessage(appLocale, primaryEmailBadgeKey)}
              </p>
            </div>
            <Badge variant="outline">
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.badges.primary",
              )}
            </Badge>
          </div>

          <Separator />

          <div className="flex flex-col gap-4 rounded-lg border px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.labels.recoveryEmail",
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.recovery_email ??
                    resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.states.noRecoveryEmail",
                    )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setRecoveryEmailEditorOpen((current) => !current)
                }
              >
                {resolveMessage(
                  appLocale,
                  "pages.workspace.settingsHub.actions.edit",
                )}
              </Button>
            </div>

            {recoveryEmailEditorOpen ? (
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
                        "pages.workspace.security.recoveryEmailLabel",
                      )}
                    </FieldLabel>
                    <Input
                      id="recovery_email"
                      type="email"
                      autoComplete="email"
                      {...recoveryForm.register("recovery_email")}
                    />
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
                          "pages.workspace.security.recoveryEmailDescription",
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
                <Button
                  type="submit"
                  disabled={recoveryForm.formState.isSubmitting}
                >
                  {resolveMessage(
                    appLocale,
                    recoveryForm.formState.isSubmitting
                      ? "pages.workspace.security.submitting"
                      : "pages.workspace.security.submit",
                  )}
                </Button>
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
