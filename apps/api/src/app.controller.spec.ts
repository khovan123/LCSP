import { Test, TestingModule } from "@nestjs/testing";

import { AppController } from "./modules/app/presentation/http/app.controller.js";
import { GetAppGreetingUseCase } from "./modules/app/application/use-cases/get-app-greeting.use-case.js";
import { APP_GREETING_PROVIDER } from "./modules/app/application/ports/app-greeting.provider.js";
import { StaticAppGreetingProvider } from "./modules/app/infrastructure/providers/static-app-greeting.provider.js";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        GetAppGreetingUseCase,
        StaticAppGreetingProvider,
        {
          provide: APP_GREETING_PROVIDER,
          useExisting: StaticAppGreetingProvider,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("should return Hello World!", async () => {
      await expect(appController.getHello()).resolves.toBe("Hello World!");
    });
  });
});
