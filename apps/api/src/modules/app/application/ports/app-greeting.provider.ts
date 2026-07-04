export const APP_GREETING_PROVIDER = Symbol("APP_GREETING_PROVIDER");

export interface AppGreetingProvider {
  getGreeting(): Promise<string>;
}
