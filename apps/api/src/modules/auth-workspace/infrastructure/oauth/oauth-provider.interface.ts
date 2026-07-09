export type OAuthAuthorizationRequest = {
  state: string;
  nonce: string;
  redirectUri: string;
};

export type OAuthCallbackInput = {
  code: string;
  redirectUri: string;
  expectedNonce: string;
};

/**
 * Claims recovered from the provider's callback. `nonce`/`issuer`/`audience`/
 * `expiresAt` are `null` when the provider has no cryptographically-verifiable
 * ID token to source them from (e.g. GitHub's classic OAuth2, which has no
 * OIDC ID token at all) — the generic callback handler skips a check whose
 * claim is `null` rather than failing closed on a claim the provider can
 * never supply.
 */
export type OAuthCallbackClaims = {
  providerAccountId: string;
  nonce: string | null;
  issuer: string | null;
  audience: string | null;
  expiresAt: number | null;
};

export class OAuthCallbackError extends Error {}

export interface OAuthProvider {
  readonly name: string;
  /** Issuer this provider's claims must match; `null` if not verifiable for this provider. */
  readonly expectedIssuer: string | null;
  /** Audience this provider's claims must match; `null` if not verifiable for this provider. */
  readonly expectedAudience: string | null;

  buildAuthorizationUrl(request: OAuthAuthorizationRequest): string;

  /** Exchanges the callback code for claims. Throws OAuthCallbackError on any failure — never leaks provider error detail to the caller. */
  handleCallback(input: OAuthCallbackInput): Promise<OAuthCallbackClaims>;
}
