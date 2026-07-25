import { WizardValidatorService } from "./wizard-validator.service.js";

describe("WizardValidatorService", () => {
  let service: WizardValidatorService;

  beforeEach(() => {
    service = new WizardValidatorService();
  });

  it("T01: should return no errors when all critical fields are valid", () => {
    const answers = {
      purpose: "Customer support chatbot",
      sector: "technology",
      data_type: ["customer_messages"],
      user_group: "Internal employees",
      user_impact: "Faster response times",
      decision_role: "advisory",
      human_oversight: "Human in the loop",
      external_llm_usage: true,
      biometric_indicator: false, // Optional field
    };

    const errors = service.validate(answers);
    expect(errors).toHaveLength(0);
  });

  it("T02: should return error for missing purpose", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "purpose",
      message:
        "Please describe the primary business purpose of your AI system.",
    });
  });

  it("T09: should return error for missing sector", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "sector",
      message: "Please select the regulated sector your AI system operates in.",
    });
  });

  it("T09: should return error for missing or empty data_type", () => {
    const errorsMissing = service.validate({});
    expect(errorsMissing).toContainEqual({
      field: "data_type",
      message:
        "Please specify at least one type of data your AI system processes.",
    });

    const errorsEmpty = service.validate({ data_type: [] });
    expect(errorsEmpty).toContainEqual({
      field: "data_type",
      message:
        "Please specify at least one type of data your AI system processes.",
    });
  });

  it("T09: should return error for missing user_group", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "user_group",
      message: "Please describe the group of users affected by your AI system.",
    });
  });

  it("T09: should return error for missing user_impact", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "user_impact",
      message: "Please describe how your AI system impacts those users.",
    });
  });

  it("T09: should return error for missing decision_role", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "decision_role",
      message:
        "Please indicate whether your AI system makes autonomous decisions.",
    });
  });

  it("T03: should return error for missing human_oversight", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "human_oversight",
      message: "Please describe the human oversight mechanism in place.",
    });
  });

  it("T09: should return error for missing external_llm_usage", () => {
    const errors = service.validate({});
    expect(errors).toContainEqual({
      field: "external_llm_usage",
      message:
        "Please indicate whether your AI system uses an external AI provider.",
    });
  });

  it("T09: should return all errors when everything is missing", () => {
    const errors = service.validate({});
    expect(errors).toHaveLength(8);
  });
});
