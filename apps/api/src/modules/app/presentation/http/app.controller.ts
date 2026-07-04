import { Controller, Get } from "@nestjs/common";

import { GetAppGreetingUseCase } from "../../application/use-cases/get-app-greeting.use-case.js";

@Controller()
export class AppController {
  constructor(private readonly getAppGreetingUseCase: GetAppGreetingUseCase) {}

  @Get()
  async getHello(): Promise<string> {
    return this.getAppGreetingUseCase.execute();
  }
}
