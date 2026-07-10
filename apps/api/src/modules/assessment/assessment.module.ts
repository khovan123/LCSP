import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { CreateAssessmentHandler } from "./application/commands/create-assessment/create-assessment.handler.js";
import { ASSESSMENT_REPOSITORY } from "./application/ports/persistence/assessment.repository.js";
import { PrismaAssessmentRepository } from "./infrastructure/persistence/prisma-assessment.repository.js";
import { AssessmentController } from "./presentation/http/assessment.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [AssessmentController],
  providers: [
    CreateAssessmentHandler,
    PrismaAssessmentRepository,
    {
      provide: ASSESSMENT_REPOSITORY,
      useExisting: PrismaAssessmentRepository,
    },
  ],
})
export class AssessmentModule {}
