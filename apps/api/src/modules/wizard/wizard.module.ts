import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { OutboxModule } from "../../platform/outbox/outbox.module.js";
import { WIZARD_PROFILE_REPOSITORY } from "./application/ports/persistence/wizard-profile.repository.js";
import { PrismaWizardRepository } from "./infrastructure/persistence/prisma-wizard.repository.js";
import { SaveWizardDraftHandler } from "./application/commands/save-wizard-draft/save-wizard-draft.handler.js";
import { SubmitWizardHandler } from "./application/commands/submit-wizard/submit-wizard.handler.js";
import { GenerateReadinessExportHandler } from "./application/commands/generate-readiness-export/generate-readiness-export.handler.js";
import { GetReadinessHandler } from "./application/queries/get-readiness/get-readiness.handler.js";
import { GetReadinessExportHandler } from "./application/queries/get-readiness-export/get-readiness-export.handler.js";
import { ListReadinessExportsHandler } from "./application/queries/list-readiness-exports/list-readiness-exports.handler.js";
import { WizardValidatorService } from "./application/services/wizard/wizard-validator.service.js";
import { ReadinessEvaluatorService } from "./application/services/wizard/readiness-evaluator.service.js";
import { ReadinessExportGuardrailService } from "./application/services/wizard/readiness-export-guardrail.service.js";
import { WizardController } from "./presentation/http/wizard.controller.js";
import { ReadinessExportPdfService } from "./infrastructure/pdf/readiness-export-pdf.service.js";

@Module({
  imports: [CqrsModule, PbacModule, OutboxModule],
  controllers: [WizardController],
  providers: [
    SaveWizardDraftHandler,
    SubmitWizardHandler,
    GenerateReadinessExportHandler,
    GetReadinessHandler,
    GetReadinessExportHandler,
    ListReadinessExportsHandler,
    WizardValidatorService,
    ReadinessEvaluatorService,
    ReadinessExportGuardrailService,
    ReadinessExportPdfService,
    PrismaWizardRepository,
    {
      provide: WIZARD_PROFILE_REPOSITORY,
      useExisting: PrismaWizardRepository,
    },
  ],
})
export class WizardModule {}
