import { WIZARD_FIELD_CONTROLS } from "@lcsp/contracts/wizard";

import type { ReadinessExportContent } from "../../contracts/wizard/readiness-export.contract.js";
import type { ReadinessExportLocale } from "./readiness-export-document.service.js";
import {
  findWizardAnswer,
  isWizardOptionSelected,
  resolveWizardSections,
  unmatchedWizardAnswerValues,
  type ResolvedWizardField,
  type ResolvedWizardSection,
} from "./readiness-export-wizard-catalog.js";

const CONTENT_WIDTH = 9070;
const LABEL_SHADE = "E7E6E6";
const BORDER_COLOR = "808080";
const OTHER_LINE =
  "........................................................................................................";

const COPY = {
  vi: {
    reference: "MẪU THAM KHẢO",
    title:
      "PHIẾU KHAI BÁO VÀ GHI NHẬN THÔNG TIN ĐÁNH GIÁ HỆ THỐNG TRÍ TUỆ NHÂN TẠO",
    subtitle: "Kết quả xuất tự động sau khi hoàn thành Wizard Form",
    notice:
      "Tài liệu này ghi nhận thông tin do người dùng khai báo tại thời điểm hoàn thành Wizard. Tài liệu không thay thế ý kiến tư vấn pháp lý, kết luận kiểm toán hoặc quyết định phân loại chính thức. Các trường, lựa chọn và tiêu đề trong phần Wizard được lấy theo cấu hình đang sử dụng trên giao diện và dữ liệu đã lưu.",
    identification: "THÔNG TIN NHẬN DIỆN HỒ SƠ",
    recordId: "Mã hồ sơ",
    status: "Trạng thái",
    completed: "Đã hoàn thành",
    assessment: "Tên assessment",
    completedAt: "Ngày hoàn thành",
    systemName: "Tên hệ thống AI",
    wizardVersion: "Phiên bản Wizard",
    declaredBy: "Người khai báo",
    organization: "Tổ chức",
    source: "Nguồn dữ liệu",
    exportVersion: "Phiên bản xuất",
    sourceValue: "Wizard Form LCSP",
    convention: "Quy ước hiển thị",
    selected: "Lựa chọn đã chọn",
    unselected: "Lựa chọn không chọn",
    generalTitle: "THÔNG TIN CHUNG VỀ HỆ THỐNG",
    shortDescription: "Mô tả ngắn",
    purpose: "Mục đích sử dụng",
    multiple: "Có thể chọn nhiều",
    other: "Khác",
    notProvided: "Chưa cung cấp",
    statusTitle: "TÌNH TRẠNG HỒ SƠ VÀ HÀNH ĐỘNG TIẾP THEO",
    statusQuestion: "Tình trạng thông tin tại thời điểm xuất tài liệu",
    statusComplete: "Đã khai báo đầy đủ theo Wizard",
    statusUnknown: "Còn nội dung chưa xác định",
    statusEvidence: "Cần bổ sung bằng chứng kỹ thuật",
    statusReview: "Cần bộ phận pháp chế/tuân thủ rà soát",
    verification: "Danh sách nội dung cần xác minh",
    actions: "Hành động đề xuất",
    approvalTitle: "XÁC NHẬN VÀ PHÊ DUYỆT",
    declaration:
      "Tôi xác nhận các thông tin trong phiếu này phản ánh đúng nội dung đã được khai báo tại thời điểm hoàn thành Wizard. Tôi hiểu rằng thông tin có thể cần được cập nhật khi phạm vi sử dụng, dữ liệu, mô hình, nhà cung cấp hoặc quy trình nghiệp vụ thay đổi.",
    signatures: [
      "NGƯỜI KHAI BÁO",
      "PHÁP CHẾ/TUÂN THỦ RÀ SOÁT",
      "ĐẠI DIỆN PHÊ DUYỆT",
    ],
    name: "Họ và tên",
    role: "Chức vụ",
    date: "Ngày",
    signature: "Ký, ghi rõ họ tên",
    end: "--- HẾT ---",
    formCode: "Mã biểu mẫu: LCSP-WIZ-01",
    version: "Phiên bản: 1.0",
    classification: "Mức độ: Nội bộ",
    page: "Trang",
  },
  en: {
    reference: "REFERENCE FORM",
    title: "AI SYSTEM DECLARATION AND INFORMATION RECORD",
    subtitle: "Auto-generated after Wizard Form completion",
    notice:
      "This document records information declared by the user when the Wizard was completed. It does not replace legal advice, audit conclusions, or a formal classification decision. Wizard fields, options, and titles are resolved from the active frontend configuration and persisted answers.",
    identification: "PROFILE IDENTIFICATION INFORMATION",
    recordId: "Record ID",
    status: "Status",
    completed: "Completed",
    assessment: "Assessment name",
    completedAt: "Completion date",
    systemName: "AI system name",
    wizardVersion: "Wizard version",
    declaredBy: "Declared by",
    organization: "Organization",
    source: "Data source",
    exportVersion: "Export version",
    sourceValue: "LCSP Wizard Form",
    convention: "Display convention",
    selected: "Selected option",
    unselected: "Unselected option",
    generalTitle: "GENERAL SYSTEM INFORMATION",
    shortDescription: "Short description",
    purpose: "Intended purpose",
    multiple: "Multiple selections allowed",
    other: "Other",
    notProvided: "Not provided",
    statusTitle: "RECORD STATUS AND NEXT ACTIONS",
    statusQuestion: "Information status at the time of export",
    statusComplete: "Wizard declaration is complete",
    statusUnknown: "Some information remains unknown",
    statusEvidence: "Technical evidence is still required",
    statusReview: "Legal/compliance review is required",
    verification: "Information requiring verification",
    actions: "Recommended actions",
    approvalTitle: "DECLARATION AND APPROVAL",
    declaration:
      "I confirm that this record reflects the information declared in the Wizard at the time of export. I understand that the information may need to be updated when the system scope, data, model, provider, deployment, or business process changes.",
    signatures: ["DECLARED BY", "COMPLIANCE REVIEW", "APPROVAL REPRESENTATIVE"],
    name: "Name",
    role: "Role",
    date: "Date",
    signature: "Signature / full name",
    end: "--- END OF FORM ---",
    formCode: "Form code: LCSP-WIZ-01",
    version: "Version: 1.0",
    classification: "Classification: Internal",
    page: "Page",
  },
} as const;

export function renderReadinessExportDocx(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): Buffer {
  const copy = COPY[locale];
  const sections = resolveWizardSections(locale);
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const body: string[] = [];

  body.push(
    paragraph(copy.reference, { bold: true, align: "right", size: 20 }),
  );
  body.push(paragraph(copy.title, { bold: true, align: "center", size: 30 }));
  body.push(
    paragraph(`(${copy.subtitle})`, {
      italic: true,
      align: "center",
      size: 20,
      after: 180,
    }),
  );
  body.push(noticeBox(copy.notice));
  body.push(sectionHeading(copy.identification));
  body.push(identificationTable(content, locale));
  body.push(
    paragraphRuns(
      [
        { text: `${copy.convention}: `, bold: true },
        { text: `☒ ${copy.selected}    ` },
        { text: `☐ ${copy.unselected}` },
      ],
      { after: 120 },
    ),
  );

  body.push(sectionHeading(`1. ${copy.generalTitle}`));
  body.push(generalInformationBox(content, locale));

  const preScreen = requiredSection(sectionById, "pre-screen");
  body.push(sectionHeading(`2. ${preScreen.title.toUpperCase()}`));
  body.push(...renderFields(content, preScreen, 2, locale));
  body.push(pageBreak());

  const purpose = requiredSection(sectionById, "purpose");
  body.push(sectionHeading(`3. ${purpose.title.toUpperCase()}`));
  body.push(...renderFields(content, purpose, 3, locale));

  const dataUsers = requiredSection(sectionById, "data-users");
  body.push(sectionHeading(`4. ${dataUsers.title.toUpperCase()}`));
  body.push(...renderFields(content, dataUsers, 4, locale));
  body.push(pageBreak());

  const decision = requiredSection(sectionById, "decision");
  body.push(sectionHeading(`5. ${decision.title.toUpperCase()}`));
  body.push(...renderFields(content, decision, 5, locale));

  const provider = requiredSection(sectionById, "provider");
  const deployment = requiredSection(sectionById, "deployment");
  body.push(
    sectionHeading(
      `6. ${provider.title.toUpperCase()} / ${deployment.title.toUpperCase()}`,
    ),
  );
  body.push(...renderFields(content, provider, 6, locale, 0));
  body.push(
    ...renderFields(content, deployment, 6, locale, provider.fields.length),
  );

  const risk = requiredSection(sectionById, "risk");
  body.push(sectionHeading(`7. ${risk.title.toUpperCase()}`));
  body.push(
    ...renderFields(
      content,
      { ...risk, fields: risk.fields.slice(0, 2) },
      7,
      locale,
    ),
  );
  body.push(pageBreak());
  body.push(
    ...renderFields(
      content,
      { ...risk, fields: risk.fields.slice(2) },
      7,
      locale,
      2,
    ),
  );

  body.push(sectionHeading(`8. ${copy.statusTitle}`));
  body.push(statusSection(content, locale));

  body.push(sectionHeading(`9. ${copy.approvalTitle}`));
  body.push(paragraph(copy.declaration, { after: 160 }));
  body.push(signatureTable(locale));
  body.push(paragraph(copy.end, { bold: true, align: "center", size: 18 }));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("")}<w:sectPr><w:headerReference w:type="default" r:id="rId1"/><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="992" w:right="1134" w:bottom="964" w:left="1701" w:header="540" w:footer="540"/></w:sectPr></w:body></w:document>`;

  const files: Record<string, Buffer> = {
    "[Content_Types].xml": Buffer.from(contentTypesXml()),
    "_rels/.rels": Buffer.from(rootRelationshipsXml()),
    "word/_rels/document.xml.rels": Buffer.from(documentRelationshipsXml()),
    "word/document.xml": Buffer.from(documentXml),
    "word/styles.xml": Buffer.from(stylesXml()),
    "word/header1.xml": Buffer.from(headerXml(content, locale)),
    "word/footer1.xml": Buffer.from(footerXml(locale)),
  };

  return zipStore(files);
}

function renderFields(
  content: ReadinessExportContent,
  section: ResolvedWizardSection,
  sectionNumber: number,
  locale: ReadinessExportLocale,
  offset = 0,
): string[] {
  return section.fields.flatMap((field, index) => {
    const fieldNumber = `${sectionNumber}.${offset + index + 1}.`;
    const multiple =
      field.control === WIZARD_FIELD_CONTROLS.checkbox
        ? ` (${COPY[locale].multiple})`
        : "";
    const output = [
      paragraphRuns(
        [
          { text: `${fieldNumber} ${field.label}`, bold: true },
          ...(multiple ? [{ text: multiple, italic: true }] : []),
        ],
        { before: 80, after: 50 },
      ),
    ];

    const answer = findWizardAnswer(content, field.questionId);
    if (field.control === WIZARD_FIELD_CONTROLS.textarea) {
      output.push(valueBox(answer?.value || COPY[locale].notProvided));
    } else {
      output.push(optionTable(field, answer, locale));
    }
    return output;
  });
}

function optionTable(
  field: ResolvedWizardField,
  answer: ReturnType<typeof findWizardAnswer>,
  locale: ReadinessExportLocale,
): string {
  const options = field.options.map((option) => ({
    label: option.label,
    selected: isWizardOptionSelected(answer, option),
  }));
  const unmatched = unmatchedWizardAnswerValues(answer, field.options);
  return checkboxTable(
    options,
    COPY[locale].other,
    unmatched.length > 0,
    unmatched.join("; "),
  );
}

function checkboxTable(
  options: Array<{ label: string; selected: boolean }>,
  otherLabel: string,
  otherSelected = false,
  otherValue = "",
): string {
  const columns = options.length === 3 ? 3 : 2;
  const width = Math.floor(CONTENT_WIDTH / columns);
  const rows: string[] = [];

  for (let index = 0; index < options.length; index += columns) {
    const cells: string[] = [];
    for (let column = 0; column < columns; column += 1) {
      const option = options[index + column];
      cells.push(
        tableCell(
          option
            ? paragraph(`${option.selected ? "☒" : "☐"} ${option.label}`, {
                after: 0,
              })
            : paragraph("", { after: 0 }),
          width,
        ),
      );
    }
    rows.push(tableRow(cells));
  }

  const otherText = `${otherSelected ? "☒" : "☐"} ${otherLabel}: ${
    otherValue || OTHER_LINE
  }`;
  rows.push(
    tableRow([
      tableCell(paragraph(otherText, { after: 0 }), CONTENT_WIDTH, {
        gridSpan: columns,
      }),
    ]),
  );

  return tableXml(
    rows,
    Array.from({ length: columns }, () => width),
  );
}

function generalInformationBox(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): string {
  const copy = COPY[locale];
  const aiPurpose = findWizardAnswer(content, "aiPurpose")?.value;
  return tableXml(
    [
      tableRow([
        tableCell(
          [
            labelValueParagraph(
              copy.systemName,
              content.metadata.assessment_name ?? copy.notProvided,
            ),
            labelValueParagraph(
              copy.shortDescription,
              content.metadata.assessment_description ?? copy.notProvided,
            ),
            labelValueParagraph(copy.purpose, aiPurpose || copy.notProvided),
          ].join(""),
          CONTENT_WIDTH,
        ),
      ]),
    ],
    [CONTENT_WIDTH],
  );
}

function identificationTable(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): string {
  const copy = COPY[locale];
  const widths = [1700, 2835, 1700, 2835];
  const rows = [
    [
      copy.recordId,
      content.metadata.assessment_id,
      copy.status,
      copy.completed,
    ],
    [
      copy.assessment,
      content.metadata.assessment_name ?? copy.notProvided,
      copy.completedAt,
      formatDate(content.metadata.generated_at, locale),
    ],
    [
      copy.systemName,
      content.metadata.assessment_name ?? copy.notProvided,
      copy.wizardVersion,
      String(content.metadata.wizard_profile_version),
    ],
    [
      copy.declaredBy,
      content.metadata.owner_display_name ?? copy.notProvided,
      copy.organization,
      content.metadata.organization_name ?? copy.notProvided,
    ],
    [
      copy.source,
      copy.sourceValue,
      copy.exportVersion,
      String(content.metadata.version),
    ],
  ];

  return tableXml(
    rows.map((row) =>
      tableRow(
        row.map((value, column) =>
          tableCell(
            paragraph(value, { bold: column % 2 === 0, after: 0 }),
            widths[column],
            {
              shade: column % 2 === 0 ? LABEL_SHADE : undefined,
            },
          ),
        ),
      ),
    ),
    widths,
  );
}

function statusSection(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): string {
  const copy = COPY[locale];
  const hasUnknowns = content.unresolved_unknowns.length > 0;
  const needsEvidence = content.missing_evidence.length > 0;
  const options = [
    { label: copy.statusComplete, selected: !hasUnknowns },
    { label: copy.statusUnknown, selected: hasUnknowns },
    { label: copy.statusEvidence, selected: needsEvidence },
    { label: copy.statusReview, selected: hasUnknowns || needsEvidence },
  ];
  const verification = [
    ...content.unresolved_unknowns,
    ...content.missing_evidence.map(
      (item) => `${item.label}: ${item.description}`,
    ),
  ];

  return [
    paragraphRuns(
      [
        { text: `8.1. ${copy.statusQuestion}`, bold: true },
        { text: ` (${copy.multiple})`, italic: true },
      ],
      { after: 50 },
    ),
    checkboxTable(options, copy.other),
    labelValueParagraph(
      copy.verification,
      verification.join("; ") || copy.notProvided,
    ),
    labelValueParagraph(
      copy.actions,
      [...content.preparation_guidance, ...content.next_steps].join("; ") ||
        copy.notProvided,
    ),
  ].join("");
}

function signatureTable(locale: ReadinessExportLocale): string {
  const copy = COPY[locale];
  const width = Math.floor(CONTENT_WIDTH / 3);
  const signatures: readonly string[] = copy.signatures;
  const cells = signatures.map((signature: string) =>
    tableCell(
      [
        paragraph(signature, { bold: true, align: "center", after: 140 }),
        labelValueParagraph(copy.name, "[....................]"),
        labelValueParagraph(copy.role, "[.......................]"),
        paragraph(`${copy.date}: ....../....../........`, {
          align: "center",
          before: 420,
          after: 40,
        }),
        paragraph(`(${copy.signature})`, {
          italic: true,
          align: "center",
          size: 18,
          after: 0,
        }),
      ].join(""),
      width,
      { verticalAlign: "top" },
    ),
  );
  return tableXml([tableRow(cells, 2100)], [width, width, width]);
}

function headerXml(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): string {
  const organization =
    content.metadata.organization_name ??
    (locale === "vi" ? "[TÊN DOANH NGHIỆP / TỔ CHỨC]" : "[ORGANIZATION NAME]");
  const left = [
    paragraph(organization.toUpperCase(), {
      bold: true,
      align: "center",
      size: 20,
      after: 20,
    }),
    paragraph(
      `${locale === "vi" ? "Số" : "No."}: ${content.metadata.assessment_id}`,
      { align: "center", size: 18, after: 0 },
    ),
  ].join("");
  const right = [
    paragraph("SOCIALIST REPUBLIC OF VIET NAM", {
      bold: true,
      align: "center",
      size: 20,
      after: 20,
    }),
    paragraph("Independence - Freedom - Happiness", {
      bold: true,
      underline: true,
      align: "center",
      size: 18,
      after: 0,
    }),
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${tableXml(
    [
      tableRow([
        tableCell(left, Math.floor(CONTENT_WIDTH / 2), { border: false }),
        tableCell(right, Math.floor(CONTENT_WIDTH / 2), { border: false }),
      ]),
    ],
    [Math.floor(CONTENT_WIDTH / 2), Math.floor(CONTENT_WIDTH / 2)],
    false,
  )}</w:hdr>`;
}

function footerXml(locale: ReadinessExportLocale): string {
  const copy = COPY[locale];
  const width = Math.floor(CONTENT_WIDTH / 3);
  const footerRow = tableRow([
    tableCell(paragraph(copy.formCode, { size: 16, after: 0 }), width, {
      border: false,
    }),
    tableCell(
      paragraph(copy.version, { size: 16, align: "center", after: 0 }),
      width,
      { border: false },
    ),
    tableCell(
      paragraph(copy.classification, {
        size: 16,
        align: "right",
        after: 0,
      }),
      width,
      { border: false },
    ),
  ]);
  const pageParagraph = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="16"/></w:rPr><w:t>${xml(
    `${copy.page} `,
  )}</w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t> / </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${tableXml(
    [footerRow],
    [width, width, width],
    false,
  )}${pageParagraph}</w:ftr>`;
}

function noticeBox(value: string): string {
  return tableXml(
    [
      tableRow([
        tableCell(
          paragraphRuns(
            [{ text: "Lưu ý / Notice: ", bold: true }, { text: value }],
            { after: 0 },
          ),
          CONTENT_WIDTH,
          { shade: "F2F2F2" },
        ),
      ]),
    ],
    [CONTENT_WIDTH],
  );
}

function valueBox(value: string): string {
  return tableXml(
    [tableRow([tableCell(paragraph(value, { after: 0 }), CONTENT_WIDTH)])],
    [CONTENT_WIDTH],
  );
}

function labelValueParagraph(label: string, value: string): string {
  return paragraphRuns([{ text: `${label}: `, bold: true }, { text: value }], {
    after: 100,
  });
}

function sectionHeading(value: string): string {
  return `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="10" w:space="2" w:color="000000"/></w:pBdr><w:keepNext/></w:pPr>${run(
    value,
    { bold: true, size: 24 },
  )}</w:p>`;
}

function paragraph(value: string, options: ParagraphOptions = {}): string {
  const runOptions: RunOptions = {
    text: value,
    bold: options.bold,
    italic: options.italic,
    underline: options.underline,
    size: options.size,
  };
  return paragraphRuns([runOptions], options);
}

function paragraphRuns(
  runs: RunOptions[],
  options: ParagraphOptions = {},
): string {
  return `<w:p><w:pPr><w:jc w:val="${options.align ?? "left"}"/><w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 80}"/><w:keepLines/></w:pPr>${runs
    .map((item) => run(item.text, item))
    .join("")}</w:p>`;
}

function run(value: string, options: RunStyleOptions = {}): string {
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>${
    options.bold ? "<w:b/><w:bCs/>" : ""
  }${options.italic ? "<w:i/><w:iCs/>" : ""}${
    options.underline ? '<w:u w:val="single"/>' : ""
  }<w:sz w:val="${options.size ?? 22}"/><w:szCs w:val="${
    options.size ?? 22
  }"/></w:rPr><w:t xml:space="preserve">${xml(value)}</w:t></w:r>`;
}

function tableXml(rows: string[], widths: number[], borders = true): string {
  return `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_WIDTH}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${
    borders ? tableBorders() : ""
  }</w:tblPr><w:tblGrid>${widths
    .map((width) => `<w:gridCol w:w="${width}"/>`)
    .join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}

function tableRow(cells: string[], height?: number): string {
  return `<w:tr>${
    height
      ? `<w:trPr><w:trHeight w:val="${height}" w:hRule="atLeast"/></w:trPr>`
      : ""
  }${cells.join("")}</w:tr>`;
}

function tableCell(
  content: string,
  width: number,
  options: CellOptions = {},
): string {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${
    options.gridSpan ? `<w:gridSpan w:val="${options.gridSpan}"/>` : ""
  }${options.shade ? `<w:shd w:fill="${options.shade}"/>` : ""}${
    options.verticalAlign ? `<w:vAlign w:val="${options.verticalAlign}"/>` : ""
  }${options.border === false ? noCellBorders() : ""}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar></w:tcPr>${content}</w:tc>`;
}

function tableBorders(): string {
  return `<w:tblBorders><w:top w:val="single" w:sz="4" w:color="${BORDER_COLOR}"/><w:left w:val="single" w:sz="4" w:color="${BORDER_COLOR}"/><w:bottom w:val="single" w:sz="4" w:color="${BORDER_COLOR}"/><w:right w:val="single" w:sz="4" w:color="${BORDER_COLOR}"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders>`;
}

function noCellBorders(): string {
  return '<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>';
}

function pageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function requiredSection(
  sections: Map<string, ResolvedWizardSection>,
  id: string,
): ResolvedWizardSection {
  const section = sections.get(id);
  if (!section) throw new Error(`Missing Wizard section: ${id}`);
  return section;
}

function formatDate(value: string, locale: ReadinessExportLocale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function contentTypesXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
}

function rootRelationshipsXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
}

function documentRelationshipsXml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
}

function stylesXml(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/></w:style></w:styles>';
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type RunStyleOptions = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: number;
};

type ParagraphOptions = RunStyleOptions & {
  align?: "left" | "center" | "right";
  before?: number;
  after?: number;
};

type RunOptions = RunStyleOptions & {
  text: string;
};

type CellOptions = {
  shade?: string;
  gridSpan?: number;
  verticalAlign?: "top" | "center" | "bottom";
  border?: boolean;
};

function zipStore(files: Record<string, Buffer>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, data] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
