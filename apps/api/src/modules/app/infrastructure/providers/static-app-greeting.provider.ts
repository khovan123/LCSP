import { Injectable } from "@nestjs/common";

import type { AppGreetingProvider } from "../../application/ports/app-greeting.provider.js";

@Injectable()
export class StaticAppGreetingProvider implements AppGreetingProvider {
  async getGreeting(): Promise<string> {
    return "Hello World!";
  }
}
