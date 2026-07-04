import type { CommonMessages } from "../../types.ts";

export const enCommon = {
  actions: {
    signIn: "Sign in",
    verifyEmail: "Verify email",
    acceptInvite: "Accept invite",
    contactOwner: "Contact organization owner",
    waitAndRetry: "Wait and retry",
    verifyMfa: "Verify two-factor code",
    retryRecovery: "Request a new recovery link",
    none: "No action required"
  }
} as const satisfies CommonMessages;
