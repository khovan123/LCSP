import { Inject, Injectable } from "@nestjs/common";

import { AppGreeting } from "../../domain/value-objects/app-greeting.value-object.js";
import {
  APP_GREETING_PROVIDER,
  type AppGreetingProvider,
} from "../ports/app-greeting.provider.js";

@Injectable()
export class GetAppGreetingUseCase {
  constructor(
    @Inject(APP_GREETING_PROVIDER)
    private readonly appGreetingProvider: AppGreetingProvider,
  ) {}

  async execute(): Promise<string> {
    const greeting = await this.appGreetingProvider.getGreeting();

    return AppGreeting.create(greeting).toString();
  }
}
