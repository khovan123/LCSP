import Joi from "joi";

import type { AppConfig, NodeEnv } from "./config.types.js";

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  DATABASE_URL: Joi.string().required(),
  AUTH_BCRYPT_COST: Joi.number().integer().min(10).default(12),
  AUTH_SESSION_TTL_SECONDS: Joi.number().integer().positive().default(86400),
  JWT_SECRET: Joi.string().min(32).required(),
  OAUTH_GITHUB_CLIENT_ID: Joi.string().required(),
  OAUTH_GITHUB_CLIENT_SECRET: Joi.string().required(),
  OAUTH_ALLOWED_REDIRECT_URIS: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  RABBITMQ_EXCHANGE: Joi.string().default("lcsp.events"),
  OUTBOX_POLL_INTERVAL_MS: Joi.number().integer().positive().default(1000),
  OUTBOX_BATCH_SIZE: Joi.number().integer().positive().default(50),
  OUTBOX_MAX_ATTEMPTS: Joi.number().integer().positive().default(5),
  MFA_SECRET_ENCRYPTION_KEY: Joi.string()
    .pattern(/^[0-9a-fA-F]{64}$/)
    .required()
    .messages({
      "string.pattern.base":
        '"MFA_SECRET_ENCRYPTION_KEY" must be exactly 64 hex characters (32 bytes)',
    }),
  PYTHON_WORKER_BASE_URL: Joi.string().required(),
}).unknown(true);

function parseRedirectUris(value: string): string[] {
  return value
    .split(",")
    .map((uri) => uri.trim())
    .filter((uri) => uri.length > 0);
}

export function config(): AppConfig {
  const env = process.env;

  return {
    nodeEnv: (env.NODE_ENV as NodeEnv | undefined) ?? "development",
    database: {
      url: env.DATABASE_URL ?? "",
    },
    auth: {
      bcryptCost: Number(env.AUTH_BCRYPT_COST ?? 12),
      sessionTtlSeconds: Number(env.AUTH_SESSION_TTL_SECONDS ?? 86400),
      jwtSecret: env.JWT_SECRET ?? "",
    },
    oauth: {
      githubClientId: env.OAUTH_GITHUB_CLIENT_ID ?? "",
      githubClientSecret: env.OAUTH_GITHUB_CLIENT_SECRET ?? "",
      allowedRedirectUris: parseRedirectUris(
        env.OAUTH_ALLOWED_REDIRECT_URIS ?? "",
      ),
    },
    rabbitmq: {
      url: env.RABBITMQ_URL ?? "",
      exchange: env.RABBITMQ_EXCHANGE ?? "lcsp.events",
    },
    outbox: {
      pollIntervalMs: Number(env.OUTBOX_POLL_INTERVAL_MS ?? 1000),
      batchSize: Number(env.OUTBOX_BATCH_SIZE ?? 50),
      maxAttempts: Number(env.OUTBOX_MAX_ATTEMPTS ?? 5),
    },
    crypto: {
      mfaSecretEncryptionKey: env.MFA_SECRET_ENCRYPTION_KEY ?? "",
    },
    pythonWorker: {
      baseUrl: env.PYTHON_WORKER_BASE_URL ?? "",
    },
  };
}
