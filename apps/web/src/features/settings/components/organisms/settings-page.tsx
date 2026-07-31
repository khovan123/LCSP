"use client";

import { useEffect, useState } from "react";
import { resolveMessage } from "@lcsp/i18n";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { appLocale } from "@/lib/locale";
import {
  useDisableMfaMutation,
  useAuthRepositoriesQuery,
  useAuthSessionsQuery,
  useAuthSettingsProfileQuery,
  useMfaEnrollMutation,
  useMfaVerifyMutation,
  useRequestRecoveryMutation,
  useRevokeAuthSessionMutation,
  useUpdateProfileMutation,
} from "@/lib/api/auth-queries";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";
import { profileSafetySchema } from "@/features/auth/schemas/profile-safety.schema";
import {
  mfaVerifySchema,
  type MfaVerifyFormValues,
} from "@/features/auth/schemas/mfa-verify.schema";
import { useForm } from "react-hook-form";

import { AccountSettingsSection } from "./account-settings-section";
import { AppearanceSettingsSection } from "./appearance-settings-section";
import { EmailSettingsSection } from "./email-settings-section";
import { NotificationsSettingsSection } from "./notifications-settings-section";
import { PasswordAuthenticationSettingsSection } from "./password-authentication-settings-section";
import { RepositoriesSettingsSection } from "./repositories-settings-section";
import { SessionsSettingsSection } from "./sessions-settings-section";
import { useQrCode } from "../../hooks/use-qr-code";
import { SETTINGS_SECTION_IDS } from "../../types/settings.types";
import type {
  RecoveryEmailFormValues,
  SettingsAlertMessage,
} from "../../types/settings-page.types";
import { isSettingsSectionId } from "../../utils/settings-page.utils";

export function SettingsPage() {
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = isSettingsSectionId(requestedSection)
    ? requestedSection
    : SETTINGS_SECTION_IDS.passwordAndAuthentication;

  const profileQuery = useAuthSettingsProfileQuery();
  const sessionsQuery = useAuthSessionsQuery();
  const repositoriesQuery = useAuthRepositoriesQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const enrollMutation = useMfaEnrollMutation();
  const disableMfaMutation = useDisableMfaMutation();
  const verifyMutation = useMfaVerifyMutation();
  const revokeSessionMutation = useRevokeAuthSessionMutation();
  const requestRecoveryMutation = useRequestRecoveryMutation();

  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [mfaEditorOpen, setMfaEditorOpen] = useState(false);
  const [recoveryEmailEditorOpen, setRecoveryEmailEditorOpen] = useState(false);
  const [mfaError, setMfaError] = useState<SettingsAlertMessage | null>(null);
  const [recoveryRequestSent, setRecoveryRequestSent] = useState(false);

  const recoveryForm = useForm<RecoveryEmailFormValues>({
    resolver: zodResolver(profileSafetySchema),
    defaultValues: { recovery_email: "" },
  });
  const verifyForm = useForm<MfaVerifyFormValues>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: { otp: "" },
  });

  const profile = profileQuery.data;
  const sessions = sessionsQuery.data ?? [];
  const repositories = repositoriesQuery.data ?? [];

  useEffect(() => {
    if (profile) {
      recoveryForm.reset({
        recovery_email: profile.recovery_email ?? "",
      });
    }
  }, [profile, recoveryForm]);

  const repositoryCount = repositories.length;
  const activeSessionsCount = sessions.filter(
    (session) => session.revoked_at === null,
  ).length;
  const primaryEmailBadgeKey = profile?.email_verified
    ? "pages.workspace.settingsHub.badges.verified"
    : "pages.workspace.settingsHub.badges.unverified";

  const profileLoadFailed =
    profileQuery.isError || sessionsQuery.isError || repositoriesQuery.isError;

  async function handleSaveRecoveryEmail(values: RecoveryEmailFormValues) {
    const outcome = await updateProfileMutation
      .mutateAsync(values)
      .catch(() => ({
        kind: API_OUTCOME_KINDS.error,
        titleKey:
          "pages.workspace.settingsHub.errors.profileLoadTitle" as const,
        detailKey:
          "pages.workspace.settingsHub.errors.profileLoadDetail" as const,
      }));

    if (outcome.kind === API_OUTCOME_KINDS.saved) {
      await profileQuery.refetch();
      setRecoveryEmailEditorOpen(false);
      toast.success(
        resolveMessage(appLocale, "pages.workspace.security.successTitle"),
      );
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.validationError) {
      recoveryForm.setError("recovery_email", {
        message: outcome.detailKey,
      });
      return;
    }

    recoveryForm.setError("root", {
      message:
        outcome.kind === API_OUTCOME_KINDS.sessionInvalid
          ? "auth.errors.sessionInvalid.detail"
          : outcome.kind === API_OUTCOME_KINDS.mfaRequired
            ? "auth.errors.mfaRequired.detail"
            : outcome.detailKey,
    });
  }

  async function handleGenerateMfaSetup() {
    setMfaError(null);
    setRecoveryRequestSent(false);
    const outcome = await enrollMutation.mutateAsync().catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.mfaEnroll.errors.requestFailedTitle" as const,
      detailKey: "pages.mfaEnroll.errors.requestFailedDetail" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.loaded) {
      setTotpUri(outcome.totpUri);
      setMfaEditorOpen(true);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.sessionInvalid) {
      setMfaError({
        titleKey: "auth.errors.sessionInvalid.title",
        detailKey: "auth.errors.sessionInvalid.detail",
      });
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.mfaRequired) {
      setMfaError({
        titleKey: "auth.errors.mfaRequired.title",
        detailKey: "auth.errors.mfaRequired.detail",
      });
      return;
    }

    setMfaError({
      titleKey: outcome.titleKey,
      detailKey: outcome.detailKey,
    });
  }

  async function handleVerifyOtp(values: MfaVerifyFormValues) {
    setMfaError(null);
    const outcome = await verifyMutation.mutateAsync(values).catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey: "pages.mfaVerify.errors.requestFailedTitle" as const,
      detailKey: "pages.mfaVerify.errors.requestFailedDetail" as const,
    }));

    verifyForm.reset();

    if (outcome.kind === API_OUTCOME_KINDS.verified) {
      setTotpUri(null);
      setMfaEditorOpen(false);
      await Promise.all([profileQuery.refetch(), sessionsQuery.refetch()]);
      toast.success(
        resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.password.mfaVerifiedTitle",
        ),
      );
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.invalid) {
      verifyForm.setError("otp", {
        message: outcome.detailKey,
      });
      return;
    }

    setMfaError(
      outcome.kind === API_OUTCOME_KINDS.sessionInvalid
        ? {
            titleKey: "auth.errors.sessionInvalid.title",
            detailKey: "auth.errors.sessionInvalid.detail",
          }
        : {
            titleKey: outcome.titleKey,
            detailKey: outcome.detailKey,
          },
    );
  }

  async function handleToggleMfa(nextEnabled: boolean) {
    if (!profile) {
      return;
    }

    setMfaError(null);

    if (nextEnabled) {
      setMfaEditorOpen(true);
      if (!totpUri) {
        await handleGenerateMfaSetup();
      }
      return;
    }

    const outcome = await disableMfaMutation.mutateAsync().catch(() => ({
      kind: API_OUTCOME_KINDS.error,
      titleKey:
        "pages.workspace.settingsHub.password.disableFailedTitle" as const,
      detailKey:
        "pages.workspace.settingsHub.password.disableFailedDescription" as const,
    }));

    if (outcome.kind === API_OUTCOME_KINDS.disabled) {
      setTotpUri(null);
      setMfaEditorOpen(false);
      setRecoveryRequestSent(false);
      verifyForm.reset();
      await Promise.all([profileQuery.refetch(), sessionsQuery.refetch()]);
      toast.success(
        resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.password.mfaDisabledTitle",
        ),
      );
      return;
    }

    setMfaError(
      outcome.kind === API_OUTCOME_KINDS.sessionInvalid
        ? {
            titleKey: "auth.errors.sessionInvalid.title",
            detailKey: "auth.errors.sessionInvalid.detail",
          }
        : outcome.kind === API_OUTCOME_KINDS.mfaRequired
          ? {
              titleKey: "auth.errors.mfaRequired.title",
              detailKey: "auth.errors.mfaRequired.detail",
            }
          : {
              titleKey: outcome.titleKey,
              detailKey: outcome.detailKey,
            },
    );
  }

  async function handleSendRecoveryInstructions() {
    if (!profile) return;

    setRecoveryRequestSent(false);
    const outcome = await requestRecoveryMutation
      .mutateAsync({ email: profile.email })
      .catch(() => ({
        kind: API_OUTCOME_KINDS.error,
        titleKey: "pages.recoveryRequest.errors.requestFailedTitle" as const,
        detailKey: "pages.recoveryRequest.errors.requestFailedDetail" as const,
      }));

    if (outcome.kind === API_OUTCOME_KINDS.requested) {
      setRecoveryRequestSent(true);
      return;
    }

    setMfaError(outcome);
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      await revokeSessionMutation.mutateAsync(sessionId);
      toast.success(
        resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.sessions.revokedTitle",
        ),
      );
    } catch {
      toast.error(
        resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.errors.sessionActionDetail",
        ),
      );
    }
  }

  const qrCode = useQrCode(totpUri);
  const mfaToggleBusy =
    enrollMutation.isPending ||
    disableMfaMutation.isPending ||
    verifyMutation.isPending;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 text-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.workspace.settingsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.description",
            )}
          </p>
        </header>

        {profileLoadFailed ? (
          <Alert variant="destructive">
            <AlertTitle>
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.errors.profileLoadTitle",
              )}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.errors.profileLoadDetail",
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-6">
          <Card className="border-border/70">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">
                  {profile?.display_name ??
                    resolveMessage(
                      appLocale,
                      "pages.workspace.settingsHub.labels.account",
                    )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.email ?? "…"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {profile
                    ? resolveMessage(appLocale, primaryEmailBadgeKey)
                    : "…"}
                </Badge>
                <Badge variant="outline">
                  {profile?.mfa_enrolled
                    ? resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.badges.mfaEnabled",
                      )
                    : resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.badges.mfaPending",
                      )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {activeSection === SETTINGS_SECTION_IDS.account ? (
            <AccountSettingsSection
              profile={profile}
              primaryEmailBadgeKey={primaryEmailBadgeKey}
            />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.appearance ? (
            <AppearanceSettingsSection />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.notifications ? (
            <NotificationsSettingsSection
              profile={profile}
              primaryEmailBadgeKey={primaryEmailBadgeKey}
            />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.emails ? (
            <EmailSettingsSection
              profile={profile}
              primaryEmailBadgeKey={primaryEmailBadgeKey}
              recoveryEmailEditorOpen={recoveryEmailEditorOpen}
              setRecoveryEmailEditorOpen={setRecoveryEmailEditorOpen}
              recoveryForm={recoveryForm}
              onSubmit={handleSaveRecoveryEmail}
            />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.passwordAndAuthentication ? (
            <PasswordAuthenticationSettingsSection
              profile={profile}
              primaryEmailBadgeKey={primaryEmailBadgeKey}
              mfaToggleBusy={mfaToggleBusy}
              mfaEditorOpen={mfaEditorOpen}
              setMfaEditorOpen={setMfaEditorOpen}
              mfaError={mfaError}
              qrCode={qrCode}
              onToggleMfa={handleToggleMfa}
              onGenerateMfaSetup={handleGenerateMfaSetup}
              enrollPending={enrollMutation.isPending}
              verifyForm={verifyForm}
              onVerifyOtp={handleVerifyOtp}
              onSendRecoveryInstructions={handleSendRecoveryInstructions}
              recoveryRequestSent={recoveryRequestSent}
              requestRecoveryPending={requestRecoveryMutation.isPending}
            />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.sessions ? (
            <SessionsSettingsSection
              sessions={sessions}
              activeSessionsCount={activeSessionsCount}
              revokePending={revokeSessionMutation.isPending}
              onRevokeSession={handleRevokeSession}
            />
          ) : null}

          {activeSection === SETTINGS_SECTION_IDS.repositories ? (
            <RepositoriesSettingsSection
              repositories={repositories}
              repositoryCount={repositoryCount}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
