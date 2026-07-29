import { Controller, Get } from "@nestjs/common";

import { GetAppGreetingUseCase } from "../../application/use-cases/get-app-greeting.use-case.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";

@Controller()
export class AppController {
  constructor(private readonly getAppGreetingUseCase: GetAppGreetingUseCase) {}

  @Get()
  async getHello() {
    return resultEnvelope(await this.getAppGreetingUseCase.execute());
  }
}
