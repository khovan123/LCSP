export const MFA_RECOVERY_CODE_ACCESS_ACTIONS = {
  view: "VIEW",
  download: "DOWNLOAD",
  print: "PRINT",
  copy: "COPY",
} as const;

export type MfaRecoveryCodeAccessAction =
  (typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS)[keyof typeof MFA_RECOVERY_CODE_ACCESS_ACTIONS];
