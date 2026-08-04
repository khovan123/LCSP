import type { AuthBackupEmailPolicy } from "@lcsp/contracts/auth";
import type { AuthPrimaryEmailAddressPolicy } from "@lcsp/contracts/auth";
import type { MessageKey } from "@lcsp/i18n";
import type { UseFormReturn } from "react-hook-form";

import type {
  AuthRepositorySummary,
  AuthSessionSummary,
  AuthSettingsProfile,
} from "@/lib/api/auth-client";
import type { MfaVerifyFormValues } from "@/features/auth/schemas/mfa-verify.schema";

export type RecoveryEmailFormValues = {
  recovery_email: string;
};

export type SettingsAlertMessage = {
  titleKey: MessageKey;
  detailKey: MessageKey;
};

export type SettingsSectionSharedProps = {
  profile: AuthSettingsProfile | undefined;
  primaryEmailBadgeKey: MessageKey;
  oauthLinkStatus?: string | null;
};

export type EmailSettingsSectionProps = SettingsSectionSharedProps & {
  recoveryForm: UseFormReturn<RecoveryEmailFormValues>;
  onSubmit: (values: RecoveryEmailFormValues) => void | Promise<void>;
  onPrimaryEmailPolicyChange: (
    policy: AuthPrimaryEmailAddressPolicy,
  ) => Promise<boolean> | boolean;
  onBackupPolicyChange: (
    policy: AuthBackupEmailPolicy,
  ) => Promise<boolean> | boolean;
  primaryPolicySaving: boolean;
  backupPolicySaving: boolean;
};

export type PasswordAuthenticationSectionProps = SettingsSectionSharedProps & {
  mfaToggleBusy: boolean;
  mfaEditorOpen: boolean;
  setMfaEditorOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  mfaError: SettingsAlertMessage | null;
  qrCode: string | null;
  onToggleMfa: (checked: boolean) => void | Promise<void>;
  onGenerateMfaSetup: () => void | Promise<void>;
  enrollPending: boolean;
  verifyForm: UseFormReturn<MfaVerifyFormValues>;
  onVerifyOtp: (values: MfaVerifyFormValues) => void | Promise<void>;
  onSendRecoveryInstructions: () => void | Promise<void>;
  recoveryRequestSent: boolean;
  requestRecoveryPending: boolean;
};

export type SessionsSettingsSectionProps = {
  sessions: AuthSessionSummary[];
  activeSessionsCount: number;
  revokePending: boolean;
  onRevokeSession: (sessionId: string) => void | Promise<void>;
};

export type RepositoriesSettingsSectionProps = {
  repositories: AuthRepositorySummary[];
  repositoryCount: number;
};
