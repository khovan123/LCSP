import { Injectable } from "@nestjs/common";

export interface ValidationError {
  field: string;
  message: string;
}

@Injectable()
export class WizardValidatorService {
  validate(answers: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!this.isValidString(answers.purpose)) {
      errors.push({
        field: "purpose",
        message:
          "Please describe the primary business purpose of your AI system.",
      });
    }

    if (!this.isValidString(answers.sector)) {
      errors.push({
        field: "sector",
        message:
          "Please select the regulated sector your AI system operates in.",
      });
    }

    if (!this.isValidArray(answers.data_type)) {
      errors.push({
        field: "data_type",
        message:
          "Please specify at least one type of data your AI system processes.",
      });
    }

    if (!this.isValidString(answers.user_group)) {
      errors.push({
        field: "user_group",
        message:
          "Please describe the group of users affected by your AI system.",
      });
    }

    if (!this.isValidString(answers.user_impact)) {
      errors.push({
        field: "user_impact",
        message: "Please describe how your AI system impacts those users.",
      });
    }

    if (!this.isValidString(answers.decision_role)) {
      errors.push({
        field: "decision_role",
        message:
          "Please indicate whether your AI system makes autonomous decisions.",
      });
    }

    if (!this.isValidString(answers.human_oversight)) {
      errors.push({
        field: "human_oversight",
        message: "Please describe the human oversight mechanism in place.",
      });
    }

    if (!this.isValidBoolean(answers.external_llm_usage)) {
      errors.push({
        field: "external_llm_usage",
        message:
          "Please indicate whether your AI system uses an external AI provider.",
      });
    }

    return errors;
  }

  private isValidString(value: any): boolean {
    return typeof value === "string" && value.trim().length > 0;
  }

  private isValidArray(value: any): boolean {
    return Array.isArray(value) && value.length > 0;
  }

  private isValidBoolean(value: any): boolean {
    return typeof value === "boolean";
  }
}
