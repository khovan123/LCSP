import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { ProblemExceptionFilter } from "./platform/problems/problem-exception.filter.js";
import { ProblemStatusInterceptor } from "./platform/problems/problem-status.interceptor.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new ProblemExceptionFilter());
  app.useGlobalInterceptors(new ProblemStatusInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
