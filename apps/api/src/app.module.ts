import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import { config, configValidationSchema } from "./config/config.js";
import { AppFeatureModule } from "./modules/app/app.module.js";
import { AIUsageFlowModule } from "./modules/ai-usage-flow/ai-usage-flow.module.js";
import { AssessmentModule } from "./modules/assessment/assessment.module.js";
import { AuditModule as AuditFeatureModule } from "./modules/audit/audit.module.js";
import { AuthWorkspaceModule } from "./modules/auth-workspace/auth-workspace.module.js";
import { ClassificationModule } from "./modules/classification/classification.module.js";
import { EvidenceModule } from "./modules/evidence/evidence.module.js";

import { DocumentModule } from "./modules/document/document.module.js";
import { GitHubIntegrationModule } from "./modules/github-integration/github-integration.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { ReconciliationModule } from "./modules/reconciliation/reconciliation.module.js";
import { ScanModule } from "./modules/scan/scan.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { WizardModule } from "./modules/wizard/wizard.module.js";
import { LegalRuleCatalogModule } from "./modules/legal-rule-catalog/legal-rule-catalog.module.js";
import { OutboxModule } from "./platform/outbox/outbox.module.js";
import { PbacModule } from "./platform/pbac/pbac.module.js";
import { AuditModule as AuditPlatformModule } from "./platform/audit/audit.module.js";
import { ProblemExceptionFilter } from "./platform/problems/problem-exception.filter.js";
import { ProblemStatusInterceptor } from "./platform/problems/problem-status.interceptor.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "test" ? [".env.test", ".env"] : [".env"],
      load: [config],
      validationSchema: configValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    AuditPlatformModule,
    OutboxModule,
    PbacModule,
    AIUsageFlowModule,
    AppFeatureModule,
    AuthWorkspaceModule,
    UsersModule,
    AssessmentModule,
    EvidenceModule,
    DocumentModule,
    GitHubIntegrationModule,
    ReconciliationModule,
    ScanModule,
    ClassificationModule,
    AuditFeatureModule,
    WizardModule,
    LegalRuleCatalogModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ProblemStatusInterceptor,
    },
  ],
})
export class AppModule {}
