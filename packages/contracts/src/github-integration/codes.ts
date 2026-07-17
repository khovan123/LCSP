export const GITHUB_INTEGRATION_ERROR_CODES = {
  connectionNotFound: "CONNECTION_NOT_FOUND",
  invalidRedirectUri: "INVALID_REDIRECT_URI",
  githubStateInvalid: "GITHUB_STATE_INVALID",
  githubCallbackInvalid: "GITHUB_CALLBACK_INVALID",
  permissionsInsufficient: "PERMISSIONS_INSUFFICIENT",
  refNotResolvable: "REF_NOT_RESOLVABLE",
  refOutOfScope: "REF_OUT_OF_SCOPE",
} as const;
