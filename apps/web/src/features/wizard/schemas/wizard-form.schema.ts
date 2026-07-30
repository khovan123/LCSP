import { z } from "zod";

const textField = z.string().optional();
const arrayField = z.array(z.string()).optional();
const booleanField = z.boolean().optional();

const requiredText = (message: string) => z.string().trim().min(1, { message });

const requiredArray = (message: string) =>
  z.array(z.string()).min(1, { message });

export const wizardDraftSchema = z.object({
  ps_001_ai_scope: textField,
  ps_002_affected_people: arrayField,
  ps_003_personal_or_sensitive_data: textField,
  ps_004_decision_importance: textField,
  purpose: textField,
  sector: textField,
  data_type: arrayField,
  user_group: textField,
  user_impact: textField,
  decision_role: textField,
  human_oversight: textField,
  external_llm_usage: booleanField,
  biometric_indicator: textField,
  high_impact_indicator: textField,
});

export const wizardPreScreenSchema = z.object({
  ps_001_ai_scope: requiredText("pages.wizard.errors.preAiScopeRequired"),
  ps_002_affected_people: requiredArray(
    "pages.wizard.errors.preAffectedPeopleRequired",
  ),
  ps_003_personal_or_sensitive_data: requiredText(
    "pages.wizard.errors.prePersonalDataRequired",
  ),
  ps_004_decision_importance: requiredText(
    "pages.wizard.errors.preDecisionImportanceRequired",
  ),
});

export const wizardStepSchemas = [
  z.object({
    purpose: requiredText("pages.wizard.errors.purposeRequired"),
    sector: requiredText("pages.wizard.errors.sectorRequired"),
  }),
  z.object({
    data_type: requiredArray("pages.wizard.errors.dataTypeRequired"),
    user_group: requiredText("pages.wizard.errors.userGroupRequired"),
    user_impact: requiredText("pages.wizard.errors.userImpactRequired"),
  }),
  z
    .object({
      decision_role: requiredText("pages.wizard.errors.decisionRoleRequired"),
      human_oversight: textField,
    })
    .superRefine((value, ctx) => {
      if (
        value.decision_role !== "NO_AUTONOMOUS_DECISION" &&
        (!value.human_oversight || value.human_oversight.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["human_oversight"],
          message: "pages.wizard.errors.humanOversightRequired",
        });
      }
    }),
  z.object({
    external_llm_usage: z.boolean({
      message: "pages.wizard.errors.externalProviderRequired",
    }),
  }),
  z.object({
    biometric_indicator: requiredText("pages.wizard.errors.biometricRequired"),
    high_impact_indicator: requiredText(
      "pages.wizard.errors.highImpactRequired",
    ),
  }),
] as const;

export const wizardSubmitSchema = wizardPreScreenSchema
  .merge(wizardStepSchemas[0])
  .merge(wizardStepSchemas[1])
  .merge(
    z.object({
      decision_role: requiredText("pages.wizard.errors.decisionRoleRequired"),
      human_oversight: textField,
    }),
  )
  .merge(wizardStepSchemas[3])
  .merge(wizardStepSchemas[4])
  .superRefine((value, ctx) => {
    if (
      value.decision_role !== "NO_AUTONOMOUS_DECISION" &&
      (!value.human_oversight || value.human_oversight.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["human_oversight"],
        message: "pages.wizard.errors.humanOversightRequired",
      });
    }
  });

export type WizardFormValues = z.infer<typeof wizardDraftSchema>;
