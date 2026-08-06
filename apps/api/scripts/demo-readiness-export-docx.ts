import * as assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANSWER_STATES,
  READINESS_CLASSIFICATION_STATUSES,
  READINESS_EXPORT_ARTIFACT_TYPES,
} from "@lcsp/contracts/wizard";

import type { ReadinessExportContent } from "../src/modules/wizard/application/contracts/wizard/readiness-export.contract.js";
import {
  ReadinessExportDocumentService,
  type ReadinessExportLocale,
} from "../src/modules/wizard/application/services/wizard/readiness-export-document.service.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../../..");
const outputDirectory = resolve(projectRoot, "output");
const DOCX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const EXPECTED_PACKAGE_ENTRIES = [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/_rels/document.xml.rels",
  "word/document.xml",
  "word/styles.xml",
  "word/footer1.xml",
] as const;

async function main(): Promise<void> {
  const service = new ReadinessExportDocumentService();
  await mkdir(outputDirectory, { recursive: true });

  for (const locale of ["vi", "en"] as const) {
    const content = buildFixture(locale);
    const rendered = service.render(content, "docx", locale);

    assert.equal(rendered.extension, "docx");
    assert.equal(rendered.mediaType, DOCX_MEDIA_TYPE);
    assert.equal(rendered.buffer.subarray(0, 2).toString("ascii"), "PK");

    assertDocxMatchesTemplate(rendered.buffer, locale, content);

    const outputPath = resolve(
      outputDirectory,
      `readiness-export-template-${locale}.docx`,
    );
    await writeFile(outputPath, rendered.buffer);
    console.log(
      `Generated ${locale.toUpperCase()} DOCX template: ${outputPath} (${rendered.buffer.length} bytes)`,
    );
  }
}

function assertDocxMatchesTemplate(
  archive: Buffer,
  locale: ReadinessExportLocale,
  content: ReadinessExportContent,
): void {
  const entries = readStoredZipEntries(archive);
  for (const path of EXPECTED_PACKAGE_ENTRIES) {
    assert.ok(entries.has(path), `DOCX package is missing ${path}`);
  }

  const documentXml = requiredEntry(entries, "word/document.xml");
  const stylesXml = requiredEntry(entries, "word/styles.xml");
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
  assert.match(stylesXml, /Times New Roman/);
  assert.match(stylesXml, /<w:sz w:val="22"\/>/);
  assert.match(relationshipsXml, /relationships\/footer/);
  assert.match(relationshipsXml, /relationships\/styles/);

  assert.ok(documentXml.includes(content.metadata.assessment_id));
  assert.ok(documentXml.includes(content.metadata.assessment_name ?? ""));
  assert.ok(documentXml.includes(content.metadata.organization_name ?? ""));
  assert.ok(documentXml.includes(content.metadata.owner_display_name ?? ""));
  assert.ok(documentXml.includes("☒"), "Selected checkbox is missing");
  assert.ok(documentXml.includes("☐"), "Unselected checkbox is missing");

  const questionCount = content.wizard_profile.sections.reduce(
    (total, section) => total + section.answers.length,
    0,
  );
  const otherLabel = locale === "vi" ? "☐ Khác:" : "☐ Other:";
  assert.equal(
    countOccurrences(documentXml, otherLabel),
    questionCount,
    "Every Wizard question must include an Other/Khác line",
  );

  if (locale === "vi") {
    assert.ok(
      documentXml.includes(
        "PHIẾU KHAI BÁO VÀ GHI NHẬN THÔNG TIN ĐÁNH GIÁ HỆ THỐNG TRÍ TUỆ NHÂN TẠO",
      ),
    );
    assert.ok(documentXml.includes("THÔNG TIN NHẬN DIỆN HỒ SƠ"));
    assert.ok(documentXml.includes("Quy ước hiển thị"));
    assert.ok(documentXml.includes("TÌNH TRẠNG HỒ SƠ VÀ HÀNH ĐỘNG TIẾP THEO"));
    assert.ok(documentXml.includes("XÁC NHẬN VÀ PHÊ DUYỆT"));
    assert.ok(documentXml.includes("NGƯỜI KHAI BÁO"));
    assert.ok(documentXml.includes("PHÁP CHẾ/TUÂN THỦ RÀ SOÁT"));
    assert.ok(documentXml.includes("ĐẠI DIỆN PHÊ DUYỆT"));
    assert.ok(footerXml.includes("Mã biểu mẫu: LCSP-WIZ-01"));
    assert.ok(footerXml.includes("Mức độ: Nội bộ"));
  } else {
    assert.ok(
      documentXml.includes("AI SYSTEM DECLARATION AND INFORMATION RECORD"),
    );
    assert.ok(documentXml.includes("PROFILE IDENTIFICATION INFORMATION"));
    assert.ok(documentXml.includes("Display convention"));
    assert.ok(documentXml.includes("RECORD STATUS AND NEXT ACTIONS"));
    assert.ok(documentXml.includes("DECLARATION AND APPROVAL"));
    assert.ok(documentXml.includes("DECLARED BY"));
    assert.ok(documentXml.includes("COMPLIANCE REVIEW"));
    assert.ok(documentXml.includes("APPROVAL REPRESENTATIVE"));
    assert.ok(footerXml.includes("Form code: LCSP-WIZ-01"));
    assert.ok(footerXml.includes("Classification: Internal"));
  }

  assert.doesNotMatch(documentXml, /\b(HIGH|MEDIUM|LOW)\b/);
  assert.doesNotMatch(documentXml, /\bnon-compliant\b/i);
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

function buildFixture(locale: ReadinessExportLocale): ReadinessExportContent {
  const updatedAt = "2026-08-05T08:30:00.000Z";
  const vi = locale === "vi";
  const answer = (
    questionId: string,
    label: string,
    value: string,
    selectedValues: string[] = [value],
  ) => ({
    question_id: questionId,
    label,
    value,
    selected_values: selectedValues,
    answer_state: ANSWER_STATES.answered,
    updated_at: updatedAt,
  });

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
      assessment_name: vi
        ? "Đánh giá hệ thống sàng lọc hồ sơ ứng viên"
        : "Applicant screening system assessment",
      assessment_description: vi
        ? "Hồ sơ minh họa dùng để kiểm tra mẫu xuất DOCX."
        : "Fixture used to verify the generated DOCX template.",
      organization_name: vi ? "CÔNG TY TNHH LCSP" : "LCSP COMPANY LIMITED",
      owner_display_name: vi ? "Nguyễn Văn A" : "Alex Nguyen",
      wizard_profile_version: 1,
      owner_id: "manager-1",
      generated_by: "manager-1",
      version: 1,
      generated_at: updatedAt,
    },
    missing_evidence: [
      {
        type: "technical_evidence",
        label: vi ? "Bằng chứng kỹ thuật" : "Technical evidence",
        description: vi
          ? "Cần bổ sung tài liệu cấu hình và nhật ký kiểm soát."
          : "Configuration evidence and control logs are still required.",
      },
    ],
    unresolved_unknowns: [
      vi
        ? "Cần xác minh khu vực lưu trữ dữ liệu."
        : "The data hosting region must be verified.",
    ],
    wizard_profile: {
      sections: vi
        ? [
            {
              title: "Thông tin chung về hệ thống",
              answers: [
                answer(
                  "systemName",
                  "Tên hệ thống/giải pháp",
                  "Hệ thống hỗ trợ sàng lọc và xếp hạng hồ sơ ứng viên",
                ),
                answer(
                  "deploymentStage",
                  "Giai đoạn triển khai hiện tại",
                  "Thử nghiệm/Pilot",
                ),
              ],
            },
            {
              title: "Sàng lọc sơ bộ",
              answers: [
                answer("aiUsage", "Có sử dụng AI không?", "Có"),
                answer(
                  "affectedPeople",
                  "Nhóm cá nhân có thể bị ảnh hưởng",
                  "Nhân viên/nội bộ, Ứng viên",
                  ["Nhân viên/nội bộ", "Ứng viên"],
                ),
                answer(
                  "personalData",
                  "Có xử lý dữ liệu cá nhân hoặc dữ liệu nhạy cảm không?",
                  "Có",
                ),
                answer(
                  "importantDecision",
                  "Có ảnh hưởng đến quyết định quan trọng không?",
                  "Có",
                ),
              ],
            },
            {
              title: "Bối cảnh nghiệp vụ và mục đích",
              answers: [
                answer(
                  "businessProcess",
                  "Quy trình nghiệp vụ",
                  "Tiếp nhận hồ sơ, trích xuất dữ liệu, xếp hạng sơ bộ và rà soát bởi chuyên viên.",
                ),
                answer("sector", "Lĩnh vực áp dụng", "Nhân sự hoặc tuyển dụng"),
              ],
            },
            {
              title: "Dữ liệu và đối tượng bị ảnh hưởng",
              answers: [
                answer(
                  "dataTypes",
                  "Loại dữ liệu được sử dụng hoặc tạo ra",
                  "Dữ liệu hồ sơ cá nhân, Dữ liệu nhạy cảm hoặc đặc biệt",
                  ["Dữ liệu hồ sơ cá nhân", "Dữ liệu nhạy cảm hoặc đặc biệt"],
                ),
                answer(
                  "affectedSubjects",
                  "Đối tượng chịu tác động trực tiếp",
                  "Ứng viên",
                ),
                answer(
                  "userImpact",
                  "Mức độ ảnh hưởng dự kiến",
                  "Ảnh hưởng đáng kể",
                ),
              ],
            },
            {
              title: "Vai trò ra quyết định và giám sát của con người",
              answers: [
                answer(
                  "decisionRole",
                  "Vai trò của hệ thống AI",
                  "Đề xuất kết quả mà người dùng có thể cân nhắc",
                ),
                answer(
                  "humanReview",
                  "Mức độ giám sát của con người",
                  "Có giám sát đầy đủ",
                ),
              ],
            },
            {
              title: "Nhà cung cấp, mô hình bên ngoài và phạm vi triển khai",
              answers: [
                answer(
                  "externalProvider",
                  "Mức độ sử dụng dịch vụ AI của bên thứ ba",
                  "Đã xác nhận sử dụng",
                ),
                answer(
                  "deploymentScope",
                  "Phạm vi triển khai",
                  "Chỉ sử dụng nội bộ",
                ),
              ],
            },
            {
              title: "Chỉ báo rủi ro và nghĩa vụ tuân thủ",
              answers: [
                answer(
                  "highImpactIndicators",
                  "Chỉ báo tác động cao",
                  "Tuyển dụng/nhân sự",
                ),
                answer(
                  "transparencyIndicators",
                  "Chỉ báo nghĩa vụ minh bạch",
                  "Tạo hoặc biến đổi nội dung bằng AI",
                ),
              ],
            },
          ]
        : [
            {
              title: "General system information",
              answers: [
                answer(
                  "systemName",
                  "System / solution name",
                  "Applicant screening and ranking support system",
                ),
                answer("deploymentStage", "Current deployment stage", "Pilot"),
              ],
            },
            {
              title: "Preliminary screening",
              answers: [
                answer("aiUsage", "Does the system use AI?", "Yes"),
                answer(
                  "affectedPeople",
                  "Potentially affected people",
                  "Employees, Applicants",
                  ["Employees", "Applicants"],
                ),
                answer(
                  "personalData",
                  "Does it process personal or sensitive data?",
                  "Yes",
                ),
                answer(
                  "importantDecision",
                  "Can it affect an important decision?",
                  "Yes",
                ),
              ],
            },
            {
              title: "Business context and purpose",
              answers: [
                answer(
                  "businessProcess",
                  "Business process",
                  "Receive applications, extract data, rank candidates and perform human review.",
                ),
                answer(
                  "sector",
                  "Applicable sector",
                  "Employment and recruitment",
                ),
              ],
            },
            {
              title: "Data and affected subjects",
              answers: [
                answer(
                  "dataTypes",
                  "Data used or generated",
                  "Applicant profile data, Sensitive or special-category data",
                  [
                    "Applicant profile data",
                    "Sensitive or special-category data",
                  ],
                ),
                answer(
                  "affectedSubjects",
                  "Directly affected subjects",
                  "Applicants",
                ),
                answer(
                  "userImpact",
                  "Expected individual impact",
                  "Significant impact",
                ),
              ],
            },
            {
              title: "Decision role and human oversight",
              answers: [
                answer(
                  "decisionRole",
                  "AI role in the final decision",
                  "Recommends an outcome for user consideration",
                ),
                answer(
                  "humanReview",
                  "Human oversight level",
                  "Full human oversight",
                ),
              ],
            },
            {
              title: "Provider, external model and deployment scope",
              answers: [
                answer(
                  "externalProvider",
                  "Third-party AI service usage",
                  "Confirmed",
                ),
                answer(
                  "deploymentScope",
                  "Deployment scope",
                  "Internal use only",
                ),
              ],
            },
            {
              title: "Risk indicators and compliance obligations",
              answers: [
                answer(
                  "highImpactIndicators",
                  "High-impact indicators",
                  "Employment and recruitment",
                ),
                answer(
                  "transparencyIndicators",
                  "Transparency indicators",
                  "AI-generated or transformed content",
                ),
              ],
            },
          ],
    },
    preparation_guidance: [
      vi
        ? "Đối chiếu dữ liệu khai báo với bằng chứng kỹ thuật và quy trình thực tế."
        : "Reconcile declared information with technical evidence and actual processes.",
    ],
    next_steps: [
      vi
        ? "Bổ sung bằng chứng kỹ thuật và gửi pháp chế/tuân thủ rà soát."
        : "Collect technical evidence and submit the record for compliance review.",
    ],
  };
}

void main().catch((error: unknown) => {
  console.error("Readiness export DOCX demo failed:", error);
  process.exitCode = 1;
});
