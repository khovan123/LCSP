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
  allowedRedirectUris: string[];
}

export interface RabbitMqConfig {
  url: string;
  exchange: string;
}

export interface CryptoConfig {
  mfaSecretEncryptionKey: string;
}

export interface PythonWorkerConfig {
  baseUrl: string;
}

export type NodeEnv = "development" | "production" | "test";

export interface AppConfig {
  nodeEnv: NodeEnv;
  database: DatabaseConfig;
  auth: AuthConfig;
  oauth: OAuthConfig;
  rabbitmq: RabbitMqConfig;
  crypto: CryptoConfig;
  pythonWorker: PythonWorkerConfig;
}
