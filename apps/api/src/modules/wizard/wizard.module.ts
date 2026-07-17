import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";

import { PbacModule } from "../../platform/pbac/pbac.module.js";
import { WIZARD_PROFILE_REPOSITORY } from "./application/ports/persistence/wizard-profile.repository.js";
import { PrismaWizardRepository } from "./infrastructure/persistence/prisma-wizard.repository.js";
import { SaveWizardDraftHandler } from "./application/commands/save-wizard-draft/save-wizard-draft.handler.js";
import { WizardController } from "./presentation/http/wizard.controller.js";

@Module({
  imports: [CqrsModule, PbacModule],
  controllers: [WizardController],
  providers: [
    SaveWizardDraftHandler,
    PrismaWizardRepository,
    {
      provide: WIZARD_PROFILE_REPOSITORY,
      useExisting: PrismaWizardRepository,
    },
  ],
})
export class WizardModule {}
