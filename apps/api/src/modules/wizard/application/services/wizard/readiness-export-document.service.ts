import { Injectable } from "@nestjs/common";

import type { ReadinessExportContent } from "../../contracts/wizard/readiness-export.contract.js";

export type ReadinessExportFormat = "pdf" | "docx";
export type ReadinessExportLocale = "en" | "vi";

export interface RenderedReadinessDocument {
  buffer: Buffer;
  mediaType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  extension: ReadinessExportFormat;
}

type Copy = {
  title: string;
  subtitle: string;
  notice: string;
  identification: string;
  recordId: string;
  status: string;
  completed: string;
  assessment: string;
  generated: string;
  owner: string;
  organization: string;
  convention: string;
  selected: string;
  unselected: string;
  other: string;
  missingEvidence: string;
  unresolved: string;
  guidance: string;
  nextSteps: string;
  declaration: string;
  signatures: string[];
  notProvided: string;
  end: string;
};

const COPY: Record<ReadinessExportLocale, Copy> = {
  en: {
    title: "AI SYSTEM DECLARATION AND INFORMATION RECORD",
    subtitle: "Auto-generated after Wizard completion",
    notice:
      "This document records information declared by the user at the time of Wizard completion. It is a readiness-only record and does not replace legal advice, audit conclusions, technical evidence, or a formal classification decision.",
    identification: "PROFILE IDENTIFICATION INFORMATION",
    recordId: "Record ID",
    status: "Status",
    completed: "Wizard completed",
    assessment: "Assessment",
    generated: "Generated",
    owner: "Declared by",
    organization: "Organization",
    convention: "Display convention",
    selected: "Selected",
    unselected: "Not selected",
    other: "Other",
    missingEvidence: "Missing technical evidence",
    unresolved: "Information requiring verification",
    guidance: "Preparation guidance",
    nextSteps: "Recommended actions",
    declaration:
      "I confirm that this record reflects the information declared in the Wizard at the time of export. The information must be updated when the system scope, data, provider, deployment, or business process changes.",
    signatures: ["DECLARED BY", "COMPLIANCE REVIEW", "APPROVAL REPRESENTATIVE"],
    notProvided: "Not provided",
    end: "--- END OF FORM ---",
  },
  vi: {
    title:
      "PHIẾU KHAI BÁO VÀ GHI NHẬN THÔNG TIN ĐÁNH GIÁ HỆ THỐNG TRÍ TUỆ NHÂN TẠO",
    subtitle: "Kết quả xuất tự động sau khi hoàn thành Wizard Form",
    notice:
      "Tài liệu này ghi nhận thông tin do người dùng khai báo tại thời điểm hoàn thành Wizard. Tài liệu chỉ phục vụ chuẩn bị hồ sơ và không thay thế ý kiến tư vấn pháp lý, kết luận kiểm toán, bằng chứng kỹ thuật hoặc quyết định phân loại chính thức.",
    identification: "THÔNG TIN NHẬN DIỆN HỒ SƠ",
    recordId: "Mã hồ sơ",
    status: "Trạng thái",
    completed: "Đã hoàn thành Wizard",
    assessment: "Tên assessment",
    generated: "Ngày xuất",
    owner: "Người khai báo",
    organization: "Tổ chức",
    convention: "Quy ước hiển thị",
    selected: "Lựa chọn đã chọn",
    unselected: "Lựa chọn không chọn",
    other: "Khác",
    missingEvidence: "Bằng chứng kỹ thuật còn thiếu",
    unresolved: "Thông tin cần xác minh",
    guidance: "Hướng dẫn chuẩn bị hồ sơ",
    nextSteps: "Hành động đề xuất",
    declaration:
      "Tôi xác nhận các thông tin trong phiếu này phản ánh đúng nội dung đã được khai báo tại thời điểm hoàn thành Wizard. Thông tin cần được cập nhật khi phạm vi sử dụng, dữ liệu, nhà cung cấp, triển khai hoặc quy trình nghiệp vụ thay đổi.",
    signatures: [
      "NGƯỜI KHAI BÁO",
      "PHÁP CHẾ/TUÂN THỦ RÀ SOÁT",
      "ĐẠI DIỆN PHÊ DUYỆT",
    ],
    notProvided: "Chưa cung cấp",
    end: "--- HẾT ---",
  },
};

@Injectable()
export class ReadinessExportDocumentService {
  render(
    content: ReadinessExportContent,
    format: ReadinessExportFormat,
    locale: ReadinessExportLocale,
  ): RenderedReadinessDocument {
    return format === "docx"
      ? {
          buffer: buildDocx(content, locale),
          mediaType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extension: "docx",
        }
      : {
          buffer: buildPdf(content, locale),
          mediaType: "application/pdf",
          extension: "pdf",
        };
  }
}

function buildDocx(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): Buffer {
  const copy = COPY[locale];
  const body: string[] = [];
  body.push(paragraph(copy.title, true, 28, "center"));
  body.push(paragraph(`(${copy.subtitle})`, false, 20, "center", true));
  body.push(boxParagraph(copy.notice));
  body.push(heading(copy.identification, 1));
  body.push(
    table([
      [
        copy.recordId,
        content.metadata.assessment_id,
        copy.status,
        copy.completed,
      ],
      [
        copy.assessment,
        content.metadata.assessment_name ?? copy.notProvided,
        copy.generated,
        formatDate(content.metadata.generated_at, locale),
      ],
      [
        copy.owner,
        content.metadata.owner_display_name ?? copy.notProvided,
        copy.organization,
        content.metadata.organization_name ?? copy.notProvided,
      ],
      [
        "Wizard version",
        String(content.metadata.wizard_profile_version),
        "Export version",
        String(content.metadata.version),
      ],
    ]),
  );
  body.push(
    paragraph(
      `${copy.convention}: ☒ ${copy.selected}    ☐ ${copy.unselected}`,
      true,
    ),
  );

  content.wizard_profile.sections.forEach((section, sectionIndex) => {
    body.push(
      heading(`${sectionIndex + 1}. ${section.title.toUpperCase()}`, 1),
    );
    section.answers.forEach((answer, answerIndex) => {
      body.push(
        paragraph(
          `${sectionIndex + 1}.${answerIndex + 1}. ${answer.label}`,
          true,
        ),
      );
      const selected = answer.selected_values?.length
        ? answer.selected_values
        : answer.value
          ? [answer.value]
          : [];
      if (selected.length === 0) body.push(paragraph(`☐ ${copy.notProvided}`));
      else selected.forEach((value) => body.push(paragraph(`☒ ${value}`)));
      body.push(
        paragraph(
          `☐ ${copy.other}: ........................................................................................................`,
        ),
      );
    });
  });

  const nextNumber = content.wizard_profile.sections.length + 1;
  body.push(
    heading(
      `${nextNumber}. ${locale === "vi" ? "TÌNH TRẠNG HỒ SƠ VÀ HÀNH ĐỘNG TIẾP THEO" : "RECORD STATUS AND NEXT ACTIONS"}`,
      1,
    ),
  );
  body.push(
    labelValue(
      copy.missingEvidence,
      content.missing_evidence
        .map((item) => `${item.label}: ${item.description}`)
        .join("; ") || copy.notProvided,
    ),
  );
  body.push(
    labelValue(
      copy.unresolved,
      content.unresolved_unknowns.join("; ") || copy.notProvided,
    ),
  );
  body.push(
    labelValue(
      copy.guidance,
      content.preparation_guidance.join("; ") || copy.notProvided,
    ),
  );
  body.push(
    labelValue(
      copy.nextSteps,
      content.next_steps.join("; ") || copy.notProvided,
    ),
  );

  body.push(
    heading(
      `${nextNumber + 1}. ${locale === "vi" ? "XÁC NHẬN VÀ PHÊ DUYỆT" : "DECLARATION AND APPROVAL"}`,
      1,
    ),
  );
  body.push(paragraph(copy.declaration));
  body.push(signatureTable(copy));
  body.push(paragraph(copy.end, true, 18, "center"));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="992" w:right="1134" w:bottom="964" w:left="1701" w:header="540" w:footer="540"/><w:footerReference w:type="default" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></w:sectPr></w:body></w:document>`;

  const files: Record<string, Buffer> = {
    "[Content_Types].xml": Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`,
    ),
    "_rels/.rels": Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ),
    "word/_rels/document.xml.rels": Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "word/document.xml": Buffer.from(documentXml),
    "word/styles.xml": Buffer.from(stylesXml()),
    "word/footer1.xml": Buffer.from(footerXml(locale)),
  };
  return zipStore(files);
}

function buildPdf(
  content: ReadinessExportContent,
  locale: ReadinessExportLocale,
): Buffer {
  const copy = COPY[locale];
  const lines: string[] = [
    copy.title,
    `(${copy.subtitle})`,
    "",
    copy.notice,
    "",
    copy.identification,
  ];
  lines.push(`${copy.recordId}: ${content.metadata.assessment_id}`);
  lines.push(`${copy.status}: ${copy.completed}`);
  lines.push(
    `${copy.assessment}: ${content.metadata.assessment_name ?? copy.notProvided}`,
  );
  lines.push(
    `${copy.generated}: ${formatDate(content.metadata.generated_at, locale)}`,
  );
  lines.push(
    `${copy.owner}: ${content.metadata.owner_display_name ?? copy.notProvided}`,
  );
  lines.push(
    `${copy.organization}: ${content.metadata.organization_name ?? copy.notProvided}`,
  );
  lines.push(
    `${copy.convention}: ☒ ${copy.selected} / ☐ ${copy.unselected}`,
    "",
  );

  content.wizard_profile.sections.forEach((section, sectionIndex) => {
    lines.push(`${sectionIndex + 1}. ${section.title.toUpperCase()}`);
    section.answers.forEach((answer, answerIndex) => {
      lines.push(`${sectionIndex + 1}.${answerIndex + 1}. ${answer.label}`);
      const selected = answer.selected_values?.length
        ? answer.selected_values
        : answer.value
          ? [answer.value]
          : [];
      if (selected.length === 0) lines.push(`☐ ${copy.notProvided}`);
      else selected.forEach((value) => lines.push(`☒ ${value}`));
      lines.push(
        `☐ ${copy.other}: ........................................................`,
      );
    });
    lines.push("");
  });
  lines.push(copy.missingEvidence.toUpperCase());
  lines.push(
    content.missing_evidence
      .map((item) => `${item.label}: ${item.description}`)
      .join("; ") || copy.notProvided,
  );
  lines.push(
    copy.unresolved.toUpperCase(),
    content.unresolved_unknowns.join("; ") || copy.notProvided,
  );
  lines.push(
    copy.guidance.toUpperCase(),
    content.preparation_guidance.join("; ") || copy.notProvided,
  );
  lines.push(
    copy.nextSteps.toUpperCase(),
    content.next_steps.join("; ") || copy.notProvided,
    "",
  );
  lines.push(
    locale === "vi" ? "XÁC NHẬN VÀ PHÊ DUYỆT" : "DECLARATION AND APPROVAL",
    copy.declaration,
    "",
  );
  lines.push(copy.signatures.join("     "), "", copy.end);
  return simpleUnicodePdf(lines);
}

function paragraph(
  value: string,
  bold = false,
  size = 22,
  align: "left" | "center" = "left",
  italic = false,
): string {
  return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:after="100"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
}
function heading(value: string, level: number): string {
  return `<w:p><w:pPr><w:outlineLvl w:val="${level}"/><w:spacing w:before="180" w:after="80"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${xml(value)}</w:t></w:r></w:p>`;
}
function boxParagraph(value: string): string {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/></w:tblBorders></w:tblPr><w:tr><w:tc><w:tcPr><w:shd w:fill="F2F2F2"/></w:tcPr>${paragraph(value)}</w:tc></w:tr></w:tbl>`;
}
function labelValue(label: string, value: string): string {
  return paragraph(`${label}: ${value}`);
}
function table(rows: string[][]): string {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.map((row) => `<w:tr>${row.map((cell, index) => `<w:tc><w:tcPr>${index % 2 === 0 ? '<w:shd w:fill="E7E6E6"/>' : ""}</w:tcPr>${paragraph(cell, index % 2 === 0)}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;
}
function signatureTable(copy: Copy): string {
  return table([
    copy.signatures,
    [
      "Name / Họ tên: ........................",
      "Name / Họ tên: ........................",
      "Name / Họ tên: ........................",
    ],
    [
      "Date / Ngày: ....../....../........",
      "Date / Ngày: ....../....../........",
      "Date / Ngày: ....../....../........",
    ],
  ]);
}
function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="22"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>`;
}
function footerXml(locale: ReadinessExportLocale): string {
  return `<?xml version="1.0" encoding="UTF-8"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${locale === "vi" ? "Mã biểu mẫu: LCSP-WIZ-01 | Phiên bản 1.0 | Mức độ: Nội bộ" : "Form code: LCSP-WIZ-01 | Version 1.0 | Classification: Internal"}</w:t></w:r></w:p></w:ftr>`;
}
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
function formatDate(value: string, locale: ReadinessExportLocale): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date);
}

function zipStore(files: Record<string, Buffer>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name);
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    nameBuffer.copy(local, 30);
    locals.push(local, data);
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuffer.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length, 8);
  end.writeUInt16LE(centrals.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function simpleUnicodePdf(lines: string[]): Buffer {
  const pageLines = paginate(
    lines.flatMap((line) => wrap(line, 88)),
    48,
  );
  const objects: Buffer[] = [];
  const pageIds = pageLines.map((_, index) => 5 + index * 2);
  objects.push(Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(
    Buffer.from(
      `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
    ),
  );
  objects.push(
    Buffer.from(
      "<< /Type /Font /Subtype /Type0 /BaseFont /ArialUnicodeMS /Encoding /Identity-H /DescendantFonts [4 0 R] >>",
    ),
  );
  objects.push(
    Buffer.from(
      "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ArialUnicodeMS /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 >>",
    ),
  );
  pageLines.forEach((page, index) => {
    const content = [`BT /F1 10 Tf 50 790 Td`];
    page.forEach((line, lineIndex) => {
      if (lineIndex > 0) content.push("0 -15 Td");
      content.push(`<${utf16Hex(line)}> Tj`);
    });
    content.push("ET");
    const stream = Buffer.from(content.join("\n"));
    const contentId = 6 + index * 2;
    objects.push(
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
    objects.push(
      Buffer.concat([
        Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),
        stream,
        Buffer.from("\nendstream"),
      ]),
    );
  });
  const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let cursor = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(cursor);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(chunk);
    cursor += chunk.length;
  });
  const xref = [
    `xref`,
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    `trailer << /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref`,
    String(cursor),
    "%%EOF",
  ];
  chunks.push(Buffer.from(`${xref.join("\n")}\n`));
  return Buffer.concat(chunks);
}
function utf16Hex(value: string): string {
  const bytes = Buffer.alloc(2 + value.length * 2);
  bytes.writeUInt16BE(0xfeff, 0);
  for (let i = 0; i < value.length; i += 1)
    bytes.writeUInt16BE(value.charCodeAt(i), 2 + i * 2);
  return bytes.toString("hex").toUpperCase();
}
function wrap(value: string, width: number): string[] {
  if (!value) return [""];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}
function paginate<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    pages.push(items.slice(index, index + size));
  return pages.length ? pages : [[]];
}
