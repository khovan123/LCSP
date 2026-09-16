export class RequestPasswordRecoveryDto {
  email?: string;
}

export class ConfirmPasswordRecoveryDto {
  recovery_token?: string;
  new_password?: string;
}

export class PasswordReauthDto {
  password?: string;
}

