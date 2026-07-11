import type { PagesMessages } from "../../types.ts";
export const enPages = {
  signIn: {
    metadataTitle: "Sign in | LCSP",
    metadataDescription: "Access the LCSP compliance workspace.",
    homeAriaLabel: "LCSP home",
    formEyebrow: "Secure access",
    formTitle: "Sign in to LCSP",
    formDescription: "Use your approved organization account.",
    emailLabel: "Work email",
    emailDescription: "Enter the address associated with your organization.",
    passwordLabel: "Password",
    passwordDescription:
      "On a shared device, do not save this password in your browser.",
    submit: "Sign in",
    submitting: "Checking access",
    divider: "or",
    oauthGitHub: "Continue with GitHub",
    accessHelp: "Need access? Contact your organization owner.",
    errors: {
      emailRequired: "Enter your work email.",
      emailInvalid: "Enter a valid work email.",
      passwordRequired: "Enter your password.",
      requestFailedTitle: "Unable to sign in",
      requestFailedDetail: "Unable to sign in. Please try again.",
    },
  },
} as const satisfies PagesMessages;
