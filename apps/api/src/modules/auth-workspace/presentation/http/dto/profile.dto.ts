import type {
  AuthBackupEmailPolicy,
  AuthPrimaryEmailAddressPolicy,
} from "@lcsp/contracts/auth";

export class UpdateProfileDto {
  display_name?: string;
  recovery_email?: string;
  primary_email_address_policy?: AuthPrimaryEmailAddressPolicy;
  backup_recovery_email_policy?: AuthBackupEmailPolicy;
}

