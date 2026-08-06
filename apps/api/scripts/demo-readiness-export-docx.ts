import * as assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANSWER_STATES,
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
  WIZARD_EXPORT_SECTIONS,
  WIZARD_FIELD_CONTROLS,
} from "@lcsp/contracts/wizard";
import { enPages, viPages } from "@lcsp/i18n";

import type {
  ReadinessExportContent,
  ReadinessExportWizardAnswer,
} from "../src/modules/wizard/application/contracts/wizard/readiness-export.contract.js";
import { renderReadinessExportDocx } from "../src/modules/wizard/application/services/wizard/readiness-export-docx-template.js";
import {
  resolveWizardSections,
  type WizardCatalogLocale,
} from "../src/modules/wizard/application/services/wizard/readiness-export-wizard-catalog.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../../..");
const outputDirectory = resolve(projectRoot, "output");

const EXPECTED_PACKAGE_ENTRIES = [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/_rels/document.xml.rels",
  "word/document.xml",
  "word/styles.xml",
  "word/header1.xml",
  "word/footer1.xml",
] as const;

const LEGACY_SELECT_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
  UNKNOWN: "Unknown",
  UNCLEAR: "Unclear",
  GENERAL_BUSINESS: "General business",
  EMPLOYMENT_HR: "Employment and HR",
  FINANCE_CREDIT: "Finance and credit",
  EDUCATION: "Education",
  HEALTHCARE: "Healthcare",
  PUBLIC_SERVICES: "Public services",
  LOW: "Limited impact",
  MODERATE: "Moderate impact",
  SIGNIFICANT: "Significant impact",
  NO_DECISION_SUPPORT: "No decision support",
  ASSISTS_DECISION: "Assists a decision",
  INFORMS_DECISION: "Informs a decision",
  RECOMMENDS_OUTCOME: "Recommends an outcome",
  DIRECTLY_DRIVES_OUTCOME: "Directly drives an outcome",
  PRESENT: "Present",
  LIMITED: "Limited",
  ABSENT: "Absent",
  NOT_APPLICABLE: "Not applicable",
  NONE: "None",
  POSSIBLE: "Possible",
  CONFIRMED: "Confirmed",
};

async function main(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const content = buildPersistedExportFixture();

  for (const locale of ["vi", "en"] as const) {
    const docx = renderReadinessExportDocx(content, locale);
    assert.equal(docx.subarray(0, 2).toString("ascii"), "PK");
    assertDocxMatchesFrontendDatabaseAndTemplate(docx, locale, content);

    const outputPath = resolve(
      outputDirectory,
      `readiness-export-template-${locale}.docx`,
    );
    await writeFile(outputPath, docx);
    console.log(
      `Generated ${locale.toUpperCase()} DOCX: ${outputPath} (${docx.length} bytes)`,
    );
  }
}

function assertDocxMatchesFrontendDatabaseAndTemplate(
  archive: Buffer,
  locale: WizardCatalogLocale,
  content: ReadinessExportContent,
): void {
  const entries = readStoredZipEntries(archive);
  for (const path of EXPECTED_PACKAGE_ENTRIES) {
    assert.ok(entries.has(path), `DOCX package is missing ${path}`);
  }

  const documentXml = requiredEntry(entries, "word/document.xml");
  const stylesXml = requiredEntry(entries, "word/styles.xml");
  const headerXml = requiredEntry(entries, "word/header1.xml");
  const footerXml = requiredEntry(entries, "word/footer1.xml");
  const relationshipsXml = requiredEntry(
    entries,
    "word/_rels/document.xml.rels",
  );

  assert.match(documentXml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(
    documentXml,
    /<w:pgMar w:top="992" w:right="1134" w:bottom="964" w:left="1701"/,
  );
  assert.equal(
    countOccurrences(documentXml, '<w:br w:type="page"/>'),
    3,
    "The reference layout must contain four pages",
  );
  assert.match(stylesXml, /Times New Roman/);
  assert.match(relationshipsXml, /relationships\/header/);
  assert.match(relationshipsXml, /relationships\/footer/);
  assert.match(footerXml, /w:instr=" PAGE "/);
  assert.match(footerXml, /w:instr=" NUMPAGES "/);
  assert.ok(headerXml.includes(content.metadata.assessment_id));
  assert.ok(
    headerXml.includes(content.metadata.organization_name ?? ""),
    "Organization from the database metadata must appear in the header",
  );

  const pages = locale === "vi" ? viPages : enPages;
  const resolvedSections = resolveWizardSections(locale);
  const resolvedFields = resolvedSections.flatMap((section) => section.fields);
  const optionFields = resolvedFields.filter(
    (field) => field.control !== WIZARD_FIELD_CONTROLS.textarea,
  );

  assert.equal(
    resolvedFields.length,
    19,
    "Frontend Wizard must expose 19 fields",
  );
  assert.equal(
    new Set(resolvedFields.map((field) => field.questionId)).size,
    19,
    "Wizard database question IDs must be unique",
  );

  for (const section of resolvedSections) {
    assert.ok(
      documentXml.includes(section.title),
      `Missing frontend section title: ${section.title}`,
    );
    for (const field of section.fields) {
      assert.ok(
        documentXml.includes(field.label),
        `Missing frontend field label: ${field.label}`,
      );
      for (const option of field.options) {
        assert.ok(
          documentXml.includes(option.label),
          `Missing frontend option label: ${option.label}`,
        );
      }
    }
  }

  const otherLabel = locale === "vi" ? "Khác:" : "Other:";
  assert.equal(
    countOccurrences(documentXml, otherLabel),
    optionFields.length + 1,
    "Every frontend option field and the generated status group must include Other/Khác",
  );

  assert.ok(documentXml.includes("☒"), "Selected checkbox is missing");
  assert.ok(documentXml.includes("☐"), "Unselected checkbox is missing");

  const translatedEmployee = pages.wizard.options.userGroupEmployees;
  const translatedApplicant = pages.wizard.options.userGroupApplicants;
  const translatedSector = pages.wizard.options.sectorHr;
  const translatedInternal = pages.wizard.options.deploymentInternal;
  assert.ok(documentXml.includes(`☒ ${translatedEmployee}`));
  assert.ok(documentXml.includes(`☒ ${translatedApplicant}`));
  assert.ok(documentXml.includes(`☒ ${translatedSector}`));
  assert.ok(documentXml.includes(`☒ ${translatedInternal}`));
  assert.ok(
    documentXml.includes(`☐ ${pages.wizard.options.userGroupCustomers}`),
  );

  if (locale === "vi") {
    assert.ok(
      documentXml.includes(
        "PHIẾU KHAI BÁO VÀ GHI NHẬN THÔNG TIN ĐÁNH GIÁ HỆ THỐNG TRÍ TUỆ NHÂN TẠO",
      ),
    );
    assert.ok(documentXml.includes("THÔNG TIN NHẬN DIỆN HỒ SƠ"));
    assert.ok(documentXml.includes("TÌNH TRẠNG HỒ SƠ VÀ HÀNH ĐỘNG TIẾP THEO"));
    assert.ok(documentXml.includes("XÁC NHẬN VÀ PHÊ DUYỆT"));
    assert.ok(footerXml.includes("Mã biểu mẫu: LCSP-WIZ-01"));
    assert.doesNotMatch(documentXml, /Giai đoạn triển khai hiện tại/);
    assert.doesNotMatch(documentXml, /Tên nhà cung cấp\/dịch vụ/);
    assert.doesNotMatch(documentXml, /Khu vực lưu trữ\/xử lý dữ liệu/);
    assert.doesNotMatch(documentXml, /Cơ chế kiểm soát/);
  } else {
    assert.ok(
      documentXml.includes("AI SYSTEM DECLARATION AND INFORMATION RECORD"),
    );
    assert.ok(documentXml.includes("PROFILE IDENTIFICATION INFORMATION"));
    assert.ok(documentXml.includes("RECORD STATUS AND NEXT ACTIONS"));
    assert.ok(documentXml.includes("DECLARATION AND APPROVAL"));
    assert.ok(footerXml.includes("Form code: LCSP-WIZ-01"));
  }

  assert.doesNotMatch(documentXml, /\bnon-compliant\b/i);
}

function buildPersistedExportFixture(): ReadinessExportContent {
  const updatedAt = "2026-08-05T08:30:00.000Z";
  const persistedValues: Record<string, string | string[]> = {
    ps_001_ai_scope: "yes",
    ps_002_affected_people: [
      viPages.wizard.options.userGroupEmployees,
      viPages.wizard.options.userGroupApplicants,
    ],
    ps_003_personal_or_sensitive_data: "yes",
    ps_004_decision_importance: "yes",
    businessProcess:
      "Tiếp nhận hồ sơ ứng viên, trích xuất dữ liệu, so khớp tiêu chí và chuyển chuyên viên nhân sự rà soát.",
    aiPurpose:
      "Hỗ trợ phân tích và đề xuất danh sách ứng viên ưu tiên; không tự động đưa ra quyết định cuối cùng.",
    sector: "EMPLOYMENT_HR",
    dataTypes: [
      viPages.wizard.options.dataTypePersonal,
      viPages.wizard.options.dataTypeSensitive,
      viPages.wizard.options.dataTypeBehavioral,
    ],
    affectedSubjects: [viPages.wizard.options.userGroupApplicants],
    userImpact: "SIGNIFICANT",
    decisionRole: "RECOMMENDS_OUTCOME",
    humanReview: "PRESENT",
    externalLlmUsage: "CONFIRMED",
    deploymentContext: [viPages.wizard.options.deploymentInternal],
    specialCategoryData: "yes",
    biometricData: "no",
    highImpactIndicators: [viPages.wizard.options.highImpactRecruiting],
    transparencyIndicators: [
      viPages.wizard.options.transparencyContentGeneration,
    ],
    prohibitedRiskSignals: [
      viPages.wizard.options.prohibitedSensitiveInference,
    ],
  };

  const sections = WIZARD_EXPORT_SECTIONS.map((section) => ({
    title: section.id,
    answers: section.fields.map((field) =>
      persistedAnswer(
        field.questionId,
        field.labelKey,
        field.control,
        persistedValues[field.questionId],
        updatedAt,
      ),
    ),
  }));

  return {
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
      assessment_id: "LCSP-ASM-2026-0001",
      assessment_name: "Hệ thống hỗ trợ sàng lọc và xếp hạng hồ sơ ứng viên",
      assessment_description:
        "Hệ thống sử dụng AI để trích xuất thông tin từ hồ sơ, đối chiếu tiêu chí tuyển dụng và đề xuất danh sách ưu tiên cho chuyên viên nhân sự.",
      organization_name: "CÔNG TY TNHH LCSP",
      owner_display_name: "Nguyễn Văn A",
      wizard_profile_version: 1,
      owner_id: "manager-1",
      generated_by: "manager-1",
      version: 1,
      generated_at: updatedAt,
    },
    missing_evidence: [
      {
        type: "technical_evidence",
        label: "Technical evidence",
        description: "Configuration evidence and control logs are required.",
      },
    ],
    unresolved_unknowns: ["Provider data-processing terms require review."],
    wizard_profile: { sections },
    preparation_guidance: [
      "Reconcile the declaration with technical evidence and actual operations.",
    ],
    next_steps: [
      "Collect technical evidence and submit the record for legal/compliance review.",
    ],
  };
}

function persistedAnswer(
  questionId: string,
  label: string,
  control: string,
  rawValue: string | string[] | undefined,
  updatedAt: string,
): ReadinessExportWizardAnswer {
  const values = Array.isArray(rawValue)
    ? rawValue
    : rawValue
      ? [
          control === WIZARD_FIELD_CONTROLS.select
            ? (LEGACY_SELECT_LABELS[rawValue] ?? rawValue)
            : rawValue,
        ]
      : [];
  return {
    question_id: questionId,
    label,
    value: values.join(", ") || "Not answered",
    selected_values: values,
    answer_state: rawValue ? ANSWER_STATES.answered : "NOT_ANSWERED",
    updated_at: rawValue ? updatedAt : "",
  };
}

function readStoredZipEntries(archive: Buffer): Map<string, string> {
  const entries = new Map<string, string>();
  let offset = 0;

  while (offset + 4 <= archive.length) {
    const signature = archive.readUInt32LE(offset);
    if (signature === 0x02014b50 || signature === 0x06054b50) break;
    assert.equal(
      signature,
      0x04034b50,
      `Unexpected ZIP signature at ${offset}`,
    );

    const compressionMethod = archive.readUInt16LE(offset + 8);
    assert.equal(compressionMethod, 0, "DOCX demo expects stored ZIP entries");
    const compressedSize = archive.readUInt32LE(offset + 18);
    const fileNameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const fileNameStart = offset + 30;
    const dataStart = fileNameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    assert.ok(dataEnd <= archive.length, "ZIP entry exceeds archive length");

    const fileName = archive
      .subarray(fileNameStart, fileNameStart + fileNameLength)
      .toString("utf8");
    entries.set(
      fileName,
      archive.subarray(dataStart, dataEnd).toString("utf8"),
    );
    offset = dataEnd;
  }

  return entries;
}

function requiredEntry(entries: Map<string, string>, path: string): string {
  const value = entries.get(path);
  assert.ok(value, `DOCX package is missing ${path}`);
  return value;
}

function countOccurrences(value: string, search: string): number {
  let count = 0;
  let index = 0;
  while ((index = value.indexOf(search, index)) >= 0) {
    count += 1;
    index += search.length;
  }
  return count;
}

void main().catch((error: unknown) => {
  console.error("Readiness export DOCX demo failed:", error);
  process.exitCode = 1;
});
