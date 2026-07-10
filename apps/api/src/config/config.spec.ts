import { config, configValidationSchema } from "./config.js";

const VALID_ENV = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/lcsp",
  AUTH_BCRYPT_COST: "12",
  AUTH_SESSION_TTL_SECONDS: "86400",
  JWT_SECRET: "a".repeat(32),
  OAUTH_GITHUB_CLIENT_ID: "client-id",
  OAUTH_GITHUB_CLIENT_SECRET: "client-secret",
  OAUTH_ALLOWED_REDIRECT_URIS: "http://localhost:3000/callback",
  RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
  RABBITMQ_EXCHANGE: "lcsp.events",
  OUTBOX_POLL_INTERVAL_MS: "1000",
  OUTBOX_BATCH_SIZE: "50",
  OUTBOX_MAX_ATTEMPTS: "5",
  MFA_SECRET_ENCRYPTION_KEY: "0123456789abcdef".repeat(4),
  PYTHON_WORKER_BASE_URL: "http://localhost:8000",
  WORKER_API_KEY: "w".repeat(32),
};

function validate(env: Record<string, string | undefined>) {
  return configValidationSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
  });
}

function withoutKeys(
  env: Record<string, string | undefined>,
  keys: string[],
): Record<string, string | undefined> {
  const result = { ...env };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

describe("configValidationSchema", () => {
  it("T01: passes when all required vars are set", () => {
    const { error } = validate(VALID_ENV);

    expect(error).toBeUndefined();
  });

  it("T02: fails with a descriptive error when DATABASE_URL is missing", () => {
    const { error } = validate(withoutKeys(VALID_ENV, ["DATABASE_URL"]));

    expect(error?.message).toContain("DATABASE_URL");
  });

  it("T03: fails when JWT_SECRET is missing", () => {
    const { error } = validate(withoutKeys(VALID_ENV, ["JWT_SECRET"]));

    expect(error?.message).toContain("JWT_SECRET");
  });

  it("lists every missing required key in a single error (not just the first)", () => {
    const { error } = validate(
      withoutKeys(VALID_ENV, ["DATABASE_URL", "JWT_SECRET"]),
    );

    expect(error?.message).toContain("DATABASE_URL");
    expect(error?.message).toContain("JWT_SECRET");
  });

  it("T04: fails when MFA_SECRET_ENCRYPTION_KEY is the wrong length", () => {
    const { error } = validate({
      ...VALID_ENV,
      MFA_SECRET_ENCRYPTION_KEY: "too-short",
    });

    expect(error?.message).toContain("MFA_SECRET_ENCRYPTION_KEY");
  });

  it("T05: fails when AUTH_BCRYPT_COST is below 10", () => {
    const { error } = validate({ ...VALID_ENV, AUTH_BCRYPT_COST: "9" });

    expect(error?.message).toContain("AUTH_BCRYPT_COST");
  });
});

describe("config()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...VALID_ENV };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("T06: parses OAUTH_ALLOWED_REDIRECT_URIS into a string array", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = "a,b,c";

    expect(config().oauth.allowedRedirectUris).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace and drops empty entries from redirect URIs", () => {
    process.env.OAUTH_ALLOWED_REDIRECT_URIS = " a , b ,,c ";

    expect(config().oauth.allowedRedirectUris).toEqual(["a", "b", "c"]);
  });

  it("maps every env var to its typed config group", () => {
    const result = config();

    expect(result).toEqual({
      nodeEnv: "test",
      database: { url: VALID_ENV.DATABASE_URL },
      auth: {
        bcryptCost: 12,
        sessionTtlSeconds: 86400,
        jwtSecret: VALID_ENV.JWT_SECRET,
      },
      oauth: {
        githubClientId: VALID_ENV.OAUTH_GITHUB_CLIENT_ID,
        githubClientSecret: VALID_ENV.OAUTH_GITHUB_CLIENT_SECRET,
        allowedRedirectUris: [VALID_ENV.OAUTH_ALLOWED_REDIRECT_URIS],
      },
      rabbitmq: {
        url: VALID_ENV.RABBITMQ_URL,
        exchange: VALID_ENV.RABBITMQ_EXCHANGE,
      },
      outbox: {
        pollIntervalMs: 1000,
        batchSize: 50,
        maxAttempts: 5,
      },
      crypto: { mfaSecretEncryptionKey: VALID_ENV.MFA_SECRET_ENCRYPTION_KEY },
      pythonWorker: { baseUrl: VALID_ENV.PYTHON_WORKER_BASE_URL },
      worker: { apiKey: VALID_ENV.WORKER_API_KEY },
      internal: { apiToken: "test-internal-token" },
    });
  });

  it("T07: fails when WORKER_API_KEY is missing", () => {
    const { error } = validate(withoutKeys(VALID_ENV, ["WORKER_API_KEY"]));

    expect(error?.message).toContain("WORKER_API_KEY");
  });
});
