import { describe, expect, it } from "@jest/globals";
import {
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
} from "@lcsp/contracts/wizard";

import { ReadinessExportPdfService } from "./readiness-export-pdf.service.js";

describe("ReadinessExportPdfService", () => {
  it("renders a valid readiness-only PDF from the persisted snapshot", () => {
    const pdf = new ReadinessExportPdfService().render({
      label: "Wizard Readiness Export",
      badge: "READINESS_ONLY",
      title: "Wizard Readiness Export",
      preview: "Readiness-only preparation summary.",
      metadata: {
        artifact_type: READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
        label: "Wizard Readiness Export",
        readiness_only: true,
        classification_status:
          READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
        assessment_id: "assessment-1",
        assessment_name: "Vietnamese readiness assessment",
        assessment_description: "Assessment description",
        organization_name: "LCSP Organization",
        owner_display_name: "Nguyen Anh",
        wizard_profile_version: 3,
        owner_id: "manager-1",
        generated_by: "manager-1",
        version: 1,
        generated_at: "2026-08-05T00:00:00.000Z",
      },
      missing_evidence: [
        {
          type: "technical_evidence",
          label: "Technical evidence",
          description: "Technical evidence is not available yet.",
        },
      ],
      unresolved_unknowns: ["Data types need clarification"],
      wizard_profile: {
        sections: [
          {
            title: "Pre-screen",
            answers: [],
          },
          {
            title: "Purpose and context",
            answers: [
              {
                question_id: "businessProcess",
                label: "Business process",
                value: "Quy trình xử lý hồ sơ tiếng Việt.",
                selected_values: ["Quy trình xử lý hồ sơ tiếng Việt."],
                answer_state: "ANSWERED",
                updated_at: "2026-08-04T14:30:00.000Z",
              },
            ],
          },
          {
            title: "Data and affected groups",
            answers: [
              {
                question_id: "dataTypes",
                label: "Data types",
                value: "Contact details, Ticket messages, Operational metadata",
                selected_values: [
                  "Contact details",
                  "Ticket messages",
                  "Operational metadata",
                ],
                answer_state: "ANSWERED",
                updated_at: "2026-08-04T14:31:00.000Z",
              },
              {
                question_id: "affectedSubjects",
                label: "Affected subjects",
                value: "Customers, Employees",
                selected_values: ["Customers", "Employees"],
                answer_state: "ANSWERED",
                updated_at: "2026-08-04T14:31:30.000Z",
              },
            ],
          },
          {
            title: "Decision support and oversight",
            answers: [],
          },
          {
            title: "Provider and deployment",
            answers: [],
          },
          {
            title: "Signal review",
            answers: [
              {
                question_id: "specialCategoryData",
                label: "Special-category data",
                value: "Unknown",
                selected_values: [],
                answer_state: "EXPLICIT_UNKNOWN",
                updated_at: "2026-08-04T14:31:45.000Z",
              },
            ],
          },
          {
            title: "Additional wizard answers",
            answers: [
              {
                question_id: "futureField",
                label: "Future field",
                value: "A".repeat(4_000),
                selected_values: ["A".repeat(4_000)],
                answer_state: "ANSWERED",
                updated_at: "2026-08-04T14:32:00.000Z",
              },
            ],
          },
        ],
      },
      preparation_guidance: ["Keep the Wizard answers current."],
      next_steps: ["Collect technical evidence."],
    });

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const text = pdf.toString("latin1");
    expect(text).toContain("AI SYSTEM DECLARATION AND INFORMATION RECORD");
    expect(text).toContain(
      READINESS_EXPORT_ARTIFACT_TYPES.wizardReadinessExport,
    );
    expect(text).toContain(
      READINESS_CLASSIFICATION_STATUSES.lockedEvidenceRequired,
    );
    expect(text).toContain("SOCIALIST REPUBLIC OF VIET NAM");
    expect(text).toContain("Independence - Freedom - Happiness");
    expect(text).toContain("REFERENCE FORM");
    expect(text).toContain("AUTO-GENERATED AFTER WIZARD COMPLETION");
    expect(text).toContain("READINESS-ONLY RECORD");
    expect(text).toContain("PROFILE IDENTIFICATION INFORMATION");
    expect(text).toContain("Vietnamese readiness");
    expect(text).toContain("assessment");
    expect(text).toContain("LCSP Organization");
    expect(text).toContain("Nguyen Anh");
    expect(text).toContain("DISPLAY CONVENTION");
    expect(text).toContain("1. GENERAL SYSTEM INFORMATION");
    expect(text).toContain("2. PRELIMINARY SCREENING");
    expect(text).toContain("3. BUSINESS CONTEXT AND PURPOSE");
    expect(text).toContain("4. DATA AND AFFECTED SUBJECTS");
    expect(text).toContain("5. DECISION ROLE AND HUMAN OVERSIGHT");
    expect(text).toContain("6. PROVIDER AND DEPLOYMENT SCOPE");
    expect(text).toContain("7. INDICATORS REQUIRING REVIEW");
    expect(text).toContain("FIELD");
    expect(text).toContain("RESPONSE");
    expect(text).toContain("BUSINESS PROCESS");
    expect(text).toContain("ADDITIONAL WIZARD INFORMATION");
    expect(text).toContain("FUTURE FIELD");
    expect(text).toContain("DATA TYPES");
    expect(text).toContain("Unknown");
    expect(text).toMatch(
      /\(DATA TYPES\) Tj[\s\S]{0,400}% CHECKBOX_CHECKED[\s\S]{0,300}\(Contact details\) Tj[\s\S]{0,300}% CHECKBOX_CHECKED[\s\S]{0,300}\(Ticket messages\) Tj[\s\S]{0,300}% CHECKBOX_CHECKED[\s\S]{0,300}\(Operational metadata\) Tj/,
    );
    expect(text).toMatch(
      /\(AFFECTED SUBJECTS\) Tj[\s\S]{0,400}% CHECKBOX_CHECKED[\s\S]{0,300}\(Customers\) Tj[\s\S]{0,300}% CHECKBOX_CHECKED[\s\S]{0,300}\(Employees\) Tj/,
    );
    expect(text).toMatch(
      /\(SPECIAL-CATEGORY DATA\) Tj[\s\S]{0,400}% CHECKBOX_UNCHECKED[\s\S]{0,300}\(Unknown\) Tj/,
    );
    expect(text).toContain("8. RECORD STATUS AND NEXT ACTIONS");
    expect(text).toContain("MISSING TECHNICAL EVIDENCE");
    expect(text).toContain("INFORMATION REQUIRING VERIFICATION");
    expect(text).toContain("PREPARATION GUIDANCE");
    expect(text).toContain("RECOMMENDED ACTIONS");
    expect(text).toContain("9. DECLARATION AND APPROVAL");
    expect(text).toContain("DECLARED BY");
    expect(text).toContain("COMPLIANCE REVIEW");
    expect(text).toContain("APPROVAL REPRESENTATIVE");
    expect(text).toContain("Form code: LCSP-WIZ-01");
    expect(text).toContain("Classification: Internal");
    expect(text).toContain("Page 1 /");
    expect(text).toContain("Page 2 /");
    expect(text).toContain("CHECKBOX_CHECKED");
    expect(text).toContain("CHECKBOX_UNCHECKED");
    expect(text).toContain("feff");
    expect(text).not.toContain("ti?ng Vi?t");
    expect(text).toContain("/BaseFont /Times-Roman");
    expect(text).toContain("/BaseFont /Times-Bold");
    expect(text).not.toContain("0.035 0.105 0.180 rg");
    expect(text).not.toContain("0.000 0.620 0.575 rg");
    expect(text).not.toMatch(/\b(HIGH|MEDIUM|LOW)\b/);
    expect(text).not.toMatch(/\bnon-compliant\b/i);
  });
});
