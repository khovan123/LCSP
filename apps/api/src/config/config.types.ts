export interface DatabaseConfig {
  url: string;
}

export interface AuthConfig {
  bcryptCost: number;
  sessionTtlSeconds: number;
  jwtSecret: string;
}

export interface OAuthConfig {
  githubClientId: string;
  githubClientSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  allowedRedirectOrigins: string[];
  allowedRedirectUris: string[];
}

export interface GithubConfig {
  appId: string;
  appSlug: string;
  allowedRedirectUris: string[];
  clientId: string;
  clientSecret: string;
  privateKey: string;
}

export interface RabbitMqConfig {
  url: string;
  exchange: string;
}

export interface OutboxConfig {
  pollIntervalMs: number;
  batchSize: number;
  maxAttempts: number;
}

export interface CryptoConfig {
  mfaSecretEncryptionKey: string;
}

export interface PythonWorkerConfig {
  baseUrl: string;
}

export interface WorkerConfig {
  apiKey: string;
}

export interface InternalConfig {
  apiToken: string;
}

export type NodeEnv = "development" | "production" | "test";

export interface AppConfig {
  nodeEnv: NodeEnv;
  database: DatabaseConfig;
  auth: AuthConfig;
  oauth: OAuthConfig;
  github: GithubConfig;
  rabbitmq: RabbitMqConfig;
  outbox: OutboxConfig;
  crypto: CryptoConfig;
  pythonWorker: PythonWorkerConfig;
  worker: WorkerConfig;
  internal: InternalConfig;
}
