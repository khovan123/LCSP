import * as assert from "node:assert/strict";

export const READINESS_EXPORT_PDF_FILE_NAME = "wizard-readiness-export-v1.pdf";

const REQUIRED_PDF_TEXT = [
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
  "DATA TYPES",
  "Contact details",
  "Ticket messages",
  "Operational metadata",
  "AFFECTED SUBJECTS",
  "Customers",
  "Employees",
  "USER IMPACT",
  "Limited impact",
  "DECISION SUPPORT ROLE",
  "Assists a decision",
  "HUMAN REVIEW",
  "Present",
  "EXTERNAL PROVIDER USAGE",
  "Possible",
  "DEPLOYMENT CONTEXT",
  "Internal staff workflow",
  "Customer-facing support portal",
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
] as const;
const PROHIBITED_PDF_PATTERN =
  /\b(HIGH|MEDIUM|LOW|risk|severity|violation|non-compliant|certified|certification|approved|legal conclusion|final classification|classification result)\b/i;

export function assertReadinessExportPdf(pdf: Buffer): void {
  assert.ok(pdf.length > 0, "PDF response was empty");
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");

  const text = pdf.toString("latin1");
  assert.ok(text.endsWith("%%EOF"), "PDF is missing its EOF marker");
  const startXref = /startxref\n(\d+)\n%%EOF$/.exec(text);
  assert.ok(startXref, "PDF is missing a valid startxref pointer");
  assert.equal(
    text.slice(Number(startXref[1]), Number(startXref[1]) + 4),
    "xref",
    "PDF startxref does not point to the xref table",
  );
  const pageCount = /\/Type \/Pages .*\/Count (\d+)/.exec(text);
  assert.ok(pageCount, "PDF page tree is missing its page count");
  const count = Number(pageCount[1]);
  assert.equal(
    [...text.matchAll(/\/Type \/Page\b/g)].length,
    count,
    "PDF page count does not match its page objects",
  );
  for (let page = 1; page <= count; page++) {
    assert.ok(
      text.includes(`Page ${page} / ${count}`),
      `PDF is missing footer pagination for page ${page}`,
    );
  }
  for (const requiredText of REQUIRED_PDF_TEXT) {
    assert.ok(
      text.includes(requiredText),
      `PDF is missing required readiness content: ${requiredText}`,
    );
  }
  assertCheckedChoices(text, "DATA TYPES", [
    "Contact details",
    "Ticket messages",
    "Operational metadata",
  ]);
  assertCheckedChoices(text, "AFFECTED SUBJECTS", ["Customers", "Employees"]);
  assertCheckedChoices(text, "DEPLOYMENT CONTEXT", [
    "Internal staff workflow",
    "Customer-facing support portal",
  ]);
  assert.doesNotMatch(text, PROHIBITED_PDF_PATTERN);
}

function assertCheckedChoices(
  text: string,
  label: string,
  values: string[],
): void {
  const rowPattern = values.reduce(
    (pattern, value) =>
      `${pattern}[\\s\\S]{0,400}% CHECKBOX_CHECKED[\\s\\S]{0,300}\\(${escapeRegExp(value)}\\) Tj`,
    `\\(${escapeRegExp(label)}\\) Tj`,
  );
  assert.match(
    text,
    new RegExp(rowPattern),
    `${label} must render each selected value with its own checked checkbox`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
