import { describe, expect, it } from "@jest/globals";

import { assertReadinessExportPdf } from "../scripts/readiness-export-pdf-demo.helpers.js";

describe("readiness export PDF demo assertions", () => {
  it("accepts a readiness-only PDF payload", () => {
    const pdf = buildReadinessPdf();

    expect(() => assertReadinessExportPdf(pdf)).not.toThrow();
  });

  it("rejects a flattened multi-select response", () => {
    const pdf = buildReadinessPdf([
      "% CHECKBOX_CHECKED",
      "(Contact details, Ticket messages, Operational metadata) Tj",
    ]);

    expect(() => assertReadinessExportPdf(pdf)).toThrow(
      /DATA TYPES must render each selected value/,
    );
  });

  it("rejects an unchecked selected value", () => {
    const pdf = buildReadinessPdf([
      "% CHECKBOX_CHECKED",
      "(Contact details) Tj",
      "% CHECKBOX_UNCHECKED",
      "(Ticket messages) Tj",
      "% CHECKBOX_CHECKED",
      "(Operational metadata) Tj",
    ]);

    expect(() => assertReadinessExportPdf(pdf)).toThrow(
      /DATA TYPES must render each selected value/,
    );
  });

  it("rejects overclaiming PDF content", () => {
    const pdf = Buffer.from(
      "%PDF-1.4\nWizard Readiness Export\nREADINESS ONLY\nMISSING EVIDENCE CHECKLIST\nUNRESOLVED UNKNOWN ITEMS\nHIGH risk\n%%EOF",
      "latin1",
    );

    expect(() => assertReadinessExportPdf(pdf)).toThrow();
  });
});

function buildReadinessPdf(
  dataTypesLines: string[] = [
    "% CHECKBOX_CHECKED",
    "(Contact details) Tj",
    "% CHECKBOX_CHECKED",
    "(Ticket messages) Tj",
    "% CHECKBOX_CHECKED",
    "(Operational metadata) Tj",
  ],
): Buffer {
  return buildMinimalPdf(
    [
      "AI SYSTEM DECLARATION AND INFORMATION RECORD",
      "READINESS-ONLY RECORD",
      "PROFILE IDENTIFICATION INFORMATION",
      "DISPLAY CONVENTION",
      "SOCIALIST REPUBLIC OF VIET NAM",
      "Independence - Freedom - Happiness",
      "1. GENERAL SYSTEM INFORMATION",
      "2. PRELIMINARY SCREENING",
      "3. BUSINESS CONTEXT AND PURPOSE",
      "4. DATA AND AFFECTED SUBJECTS",
      "5. DECISION ROLE AND HUMAN OVERSIGHT",
      "6. PROVIDER AND DEPLOYMENT SCOPE",
      "7. INDICATORS REQUIRING REVIEW",
      "FIELD",
      "RESPONSE",
      "AI SYSTEM SCOPE",
      "The product uses AI to triage incoming customer",
      "BUSINESS PROCESS",
      "Customer support intake and operations routing.",
      "AI PURPOSE",
      "Summarize ticket context",
      "PURPOSE",
      "Route support requests",
      "SECTOR",
      "General business",
      "(DATA TYPES) Tj",
      ...dataTypesLines,
      "(AFFECTED SUBJECTS) Tj",
      "% CHECKBOX_CHECKED",
      "(Customers) Tj",
      "% CHECKBOX_CHECKED",
      "(Employees) Tj",
      "USER IMPACT",
      "Limited impact",
      "DECISION SUPPORT ROLE",
      "Assists a decision",
      "HUMAN REVIEW",
      "Present",
      "EXTERNAL PROVIDER USAGE",
      "Possible",
      "(DEPLOYMENT CONTEXT) Tj",
      "% CHECKBOX_CHECKED",
      "(Internal staff workflow) Tj",
      "% CHECKBOX_CHECKED",
      "(Customer-facing support portal) Tj",
      "SPECIAL-CATEGORY DATA",
      "Unknown",
      "BIOMETRIC DATA",
      "No",
      "IMPACT INDICATORS",
      "Employment and HR support escalation",
      "TRANSPARENCY INDICATORS",
      "Direct interaction notice planned",
      "PROHIBITED SIGNALS",
      "None identified during Wizard intake",
      "8. RECORD STATUS AND NEXT ACTIONS",
      "MISSING TECHNICAL EVIDENCE",
      "INFORMATION REQUIRING VERIFICATION",
      "PREPARATION GUIDANCE",
      "RECOMMENDED ACTIONS",
      "9. DECLARATION AND APPROVAL",
      "DECLARED BY",
      "COMPLIANCE REVIEW",
      "APPROVAL REPRESENTATIVE",
      "Form code: LCSP-WIZ-01",
      "Page 1 / 1",
    ].join("\n"),
  );
}

function buildMinimalPdf(content: string): Buffer {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
