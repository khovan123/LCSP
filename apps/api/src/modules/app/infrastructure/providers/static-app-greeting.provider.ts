import { Injectable } from "@nestjs/common";

import type { AppGreetingProvider } from "../../application/ports/app-greeting.provider.js";

@Injectable()
export class StaticAppGreetingProvider implements AppGreetingProvider {
  getGreeting(): Promise<string> {
    return Promise.resolve("Hello World!");
  }
}
