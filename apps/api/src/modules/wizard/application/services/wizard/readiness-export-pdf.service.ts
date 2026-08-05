import { Injectable } from "@nestjs/common";
import { ANSWER_STATES } from "@lcsp/contracts/wizard";

import type { ReadinessExportContent } from "../../contracts/wizard/readiness-export.contract.js";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 85;
const RIGHT = 57;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;
const TOP = 770;
const BOTTOM = 64;
const LIGHT_GRAY = "0.91 0.91 0.91";
const MID_GRAY = "0.55 0.55 0.55";
const BLACK = "0 0 0";

@Injectable()
export class ReadinessExportPdfService {
  render(content: ReadinessExportContent): Buffer {
    content = normalizeContent(content);
    const pages: PdfPage[] = [];
    const state = new RenderState(pages, content);

    state.drawFirstPageIntro();
    state.section("1. GENERAL SYSTEM INFORMATION", [
      answerField(content, "systemName", "System / solution"),
      staticField(
        "Assessment description",
        content.metadata.assessment_description,
      ),
      answerField(content, "aiPurpose", "Purpose"),
    ]);
    state.section(
      "2. PRELIMINARY SCREENING",
      sectionAnswers(content, "Pre-screen"),
    );
    state.section(
      "3. BUSINESS CONTEXT AND PURPOSE",
      sectionAnswers(content, "Purpose and context"),
    );
    state.section(
      "4. DATA AND AFFECTED SUBJECTS",
      sectionAnswers(content, "Data and affected groups"),
    );
    state.section(
      "5. DECISION ROLE AND HUMAN OVERSIGHT",
      sectionAnswers(content, "Decision support and oversight"),
    );
    state.section(
      "6. PROVIDER AND DEPLOYMENT SCOPE",
      sectionAnswers(content, "Provider and deployment"),
    );
    state.section(
      "7. INDICATORS REQUIRING REVIEW",
      sectionAnswers(content, "Signal review"),
    );
    for (const section of content.wizard_profile.sections.filter(
      (item) => !RENDERED_SECTION_TITLES.has(item.title),
    )) {
      state.section(
        `ADDITIONAL WIZARD INFORMATION - ${section.title.toUpperCase()}`,
        section.answers.map(toReportField),
      );
    }

    state.section("8. RECORD STATUS AND NEXT ACTIONS", [
      staticField(
        "Missing technical evidence",
        content.missing_evidence.length > 0
          ? content.missing_evidence
              .map((item) => `${item.label}: ${item.description}`)
              .join("; ")
          : "None recorded",
      ),
      staticField(
        "Information requiring verification",
        content.unresolved_unknowns.join("; ") || "None recorded",
      ),
      staticField(
        "Preparation guidance",
        content.preparation_guidance.join("; ") || "None recorded",
      ),
      staticField(
        "Recommended actions",
        content.next_steps.join("; ") || "None recorded",
      ),
    ]);
    state.drawApprovalSection();

    const totalPages = pages.length;
    pages.forEach((page, index) => drawFooter(page, index + 1, totalPages));
    return buildPdf(pages);
  }
}

function normalizeContent(
  content: ReadinessExportContent,
): ReadinessExportContent {
  const candidate = content as Partial<ReadinessExportContent>;
  return {
    ...content,
    missing_evidence: Array.isArray(candidate.missing_evidence)
      ? candidate.missing_evidence
      : [],
    next_steps: Array.isArray(candidate.next_steps) ? candidate.next_steps : [],
    preparation_guidance: Array.isArray(candidate.preparation_guidance)
      ? candidate.preparation_guidance
      : [],
    unresolved_unknowns: Array.isArray(candidate.unresolved_unknowns)
      ? candidate.unresolved_unknowns
      : [],
    wizard_profile: candidate.wizard_profile ?? { sections: [] },
  };
}

type PdfPage = { commands: string[] };
type ReportField = {
  answerState: string;
  label: string;
  selectedValues: string[];
  value: string;
};

const RENDERED_SECTION_TITLES = new Set([
  "Pre-screen",
  "Purpose and context",
  "Data and affected groups",
  "Decision support and oversight",
  "Provider and deployment",
  "Signal review",
]);

class RenderState {
  page: PdfPage;
  y = TOP;

  constructor(
    private readonly pages: PdfPage[],
    private readonly content: ReadinessExportContent,
  ) {
    this.page = this.newPage(true);
  }

  drawFirstPageIntro(): void {
    text(
      this.page,
      "REFERENCE FORM",
      PAGE_WIDTH - RIGHT,
      this.y,
      8,
      "F2",
      BLACK,
      "right",
    );
    this.y -= 26;
    text(
      this.page,
      "AI SYSTEM DECLARATION AND INFORMATION RECORD",
      PAGE_WIDTH / 2,
      this.y,
      16,
      "F2",
      BLACK,
      "center",
    );
    this.y -= 17;
    text(
      this.page,
      "AUTO-GENERATED AFTER WIZARD COMPLETION",
      PAGE_WIDTH / 2,
      this.y,
      9,
      "F3",
      BLACK,
      "center",
    );
    this.y -= 24;
    this.paragraph(
      "This record captures information declared by the user at the time of Wizard completion. It is a readiness-only preparation record and does not replace professional review, technical evidence, or a formal downstream decision.",
      9,
    );
    this.y -= 8;
    text(
      this.page,
      "PROFILE IDENTIFICATION INFORMATION",
      LEFT,
      this.y,
      10,
      "F2",
      BLACK,
    );
    this.y -= 18;
    this.table([
      [
        "Record ID",
        this.content.metadata.assessment_id,
        "Status",
        "Wizard completed",
      ],
      [
        "Assessment",
        this.content.metadata.assessment_name ?? "Not provided",
        "Generated",
        formatTimestamp(this.content.metadata.generated_at),
      ],
      [
        "Wizard version",
        String(this.content.metadata.wizard_profile_version),
        "Export version",
        String(this.content.metadata.version),
      ],
      [
        "Declared by",
        this.content.metadata.owner_display_name ?? "Not provided",
        "Organization",
        this.content.metadata.organization_name ?? "Not provided",
      ],
      [
        "Artifact",
        this.content.metadata.artifact_type,
        "Classification gate",
        this.content.metadata.classification_status,
      ],
    ]);
    this.y -= 12;
    text(this.page, "READINESS-ONLY RECORD", LEFT, this.y, 9, "F2", BLACK);
    this.y -= 14;
    text(
      this.page,
      "DISPLAY CONVENTION: [X] selected / [ ] not selected or not provided",
      LEFT,
      this.y,
      8,
      "F3",
      BLACK,
    );
    this.y -= 20;
  }

  section(title: string, fields: ReportField[]): void {
    this.ensure(35 + 18 + 31);
    this.heading(title);
    this.tableHeader();
    const rows =
      fields.length > 0
        ? fields
        : [staticField("Wizard answer", "Not provided", "NOT_ANSWERED")];
    rows.forEach((field) => this.answerRow(title, field));
    this.y -= 10;
  }

  drawApprovalSection(): void {
    this.ensure(210);
    this.heading("9. DECLARATION AND APPROVAL");
    this.paragraph(
      "I confirm that this record reflects the information declared in the Wizard at the time of export. The information must be updated when the system scope, data, provider, deployment, or business process changes.",
      9,
    );
    this.y -= 8;
    this.signatureTable();
    this.y -= 14;
    text(
      this.page,
      "--- END OF FORM ---",
      PAGE_WIDTH / 2,
      this.y,
      8,
      "F2",
      BLACK,
      "center",
    );
  }

  private heading(title: string): void {
    this.ensure(35);
    text(this.page, title, LEFT, this.y, 10, "F2", BLACK);
    strokeLine(
      this.page,
      LEFT,
      this.y - 5,
      PAGE_WIDTH - RIGHT,
      this.y - 5,
      BLACK,
    );
    this.y -= 24;
  }

  private tableHeader(): void {
    this.ensure(24);
    fillRect(this.page, LEFT, this.y - 18, CONTENT_WIDTH, 18, LIGHT_GRAY);
    strokeRect(this.page, LEFT, this.y - 18, CONTENT_WIDTH, 18, MID_GRAY);
    strokeLine(
      this.page,
      LEFT + 150,
      this.y - 18,
      LEFT + 150,
      this.y,
      MID_GRAY,
    );
    text(this.page, "FIELD / QUESTION", LEFT + 7, this.y - 13, 7, "F2", BLACK);
    text(
      this.page,
      "DECLARED RESPONSE",
      LEFT + 158,
      this.y - 13,
      7,
      "F2",
      BLACK,
    );
    this.y -= 18;
  }

  private answerRow(sectionTitle: string, field: ReportField): void {
    const answered = field.answerState === ANSWER_STATES.answered;
    const values =
      answered && field.selectedValues.length > 0
        ? field.selectedValues
        : [field.value || "Not provided"];
    const renderedLines = values.flatMap((value) =>
      wrapPdfLine(value, 58).map((line, lineIndex) => ({
        checked: answered,
        line,
        startsValue: lineIndex === 0,
      })),
    );
    let offset = 0;
    let firstFragment = true;

    while (offset < renderedLines.length) {
      if (this.y - 31 < BOTTOM) {
        this.continueTable(sectionTitle);
      }
      const maxLines = Math.max(1, Math.floor((this.y - BOTTOM - 13) / 12));
      const chunk = renderedLines.slice(offset, offset + maxLines);
      const height = Math.max(31, chunk.length * 12 + 13);
      strokeRect(
        this.page,
        LEFT,
        this.y - height,
        CONTENT_WIDTH,
        height,
        MID_GRAY,
      );
      strokeLine(
        this.page,
        LEFT + 150,
        this.y - height,
        LEFT + 150,
        this.y,
        MID_GRAY,
      );
      text(
        this.page,
        firstFragment ? field.label.toUpperCase() : "(CONTINUED)",
        LEFT + 7,
        this.y - 13,
        7,
        "F2",
        BLACK,
      );
      chunk.forEach((item, index) => {
        if (item.startsValue) {
          drawCheckbox(
            this.page,
            LEFT + 158,
            this.y - 17 - index * 12,
            item.checked,
          );
        }
        text(
          this.page,
          item.line,
          LEFT + 171,
          this.y - 14 - index * 12,
          8,
          "F1",
          BLACK,
        );
      });
      this.y -= height;
      offset += chunk.length;
      firstFragment = false;
    }
  }

  private continueTable(sectionTitle: string): void {
    this.page = this.newPage(false);
    this.y = 710;
    this.heading(`${sectionTitle} - CONTINUED`);
    this.tableHeader();
  }

  private table(rows: string[][]): void {
    const colWidth = CONTENT_WIDTH / 4;
    rows.forEach((row) => {
      const height = Math.max(
        29,
        ...row.map((cell) => wrapPdfLine(cell, 28).length * 10 + 12),
      );
      this.ensure(height + 2);
      strokeRect(
        this.page,
        LEFT,
        this.y - height,
        CONTENT_WIDTH,
        height,
        MID_GRAY,
      );
      for (let column = 1; column < 4; column++)
        strokeLine(
          this.page,
          LEFT + colWidth * column,
          this.y - height,
          LEFT + colWidth * column,
          this.y,
          MID_GRAY,
        );
      row.forEach((cell, column) => {
        wrapPdfLine(cell, 28).forEach((line, lineIndex) => {
          text(
            this.page,
            line,
            LEFT + colWidth * column + 5,
            this.y - 12 - lineIndex * 10,
            7,
            column % 2 === 0 ? "F2" : "F1",
            BLACK,
          );
        });
      });
      this.y -= height;
    });
  }

  private signatureTable(): void {
    const width = CONTENT_WIDTH / 3;
    const height = 112;
    this.ensure(height + 4);
    const labels = [
      "DECLARED BY",
      "COMPLIANCE REVIEW",
      "APPROVAL REPRESENTATIVE",
    ];
    for (let column = 0; column < 3; column++) {
      const x = LEFT + width * column;
      fillRect(this.page, x, this.y - 24, width, 24, LIGHT_GRAY);
      strokeRect(this.page, x, this.y - height, width, height, BLACK);
      text(
        this.page,
        labels[column],
        x + width / 2,
        this.y - 15,
        7,
        "F2",
        BLACK,
        "center",
      );
      text(
        this.page,
        "Name: [........................]",
        x + 8,
        this.y - 42,
        7,
        "F1",
        BLACK,
      );
      text(
        this.page,
        "Role: [..........................]",
        x + 8,
        this.y - 58,
        7,
        "F1",
        BLACK,
      );
      text(
        this.page,
        "Date: ....../....../........",
        x + width / 2,
        this.y - 90,
        7,
        "F3",
        BLACK,
        "center",
      );
      text(
        this.page,
        "(Signature / full name)",
        x + width / 2,
        this.y - 103,
        7,
        "F3",
        BLACK,
        "center",
      );
    }
    this.y -= height;
  }

  private paragraph(value: string, size: number): void {
    const lines = wrapPdfLine(value, 92);
    this.ensure(lines.length * (size + 3) + 4);
    lines.forEach((line, index) =>
      text(
        this.page,
        line,
        LEFT,
        this.y - index * (size + 3),
        size,
        "F1",
        BLACK,
      ),
    );
    this.y -= lines.length * (size + 3);
  }

  private ensure(height: number): void {
    if (this.y - height >= BOTTOM) return;
    this.page = this.newPage(false);
    this.y = 710;
  }

  private newPage(first: boolean): PdfPage {
    const page: PdfPage = { commands: [] };
    this.pages.push(page);
    drawHeader(page, this.content, first);
    return page;
  }
}

function drawHeader(
  page: PdfPage,
  content: ReadinessExportContent,
  first: boolean,
): void {
  text(page, "LCSP", LEFT, 806, 9, "F2", BLACK);
  text(
    page,
    `Document no.: ${content.metadata.assessment_id}`,
    LEFT,
    792,
    7,
    "F1",
    BLACK,
  );
  text(
    page,
    "SOCIALIST REPUBLIC OF VIET NAM",
    PAGE_WIDTH - RIGHT,
    806,
    8,
    "F2",
    BLACK,
    "right",
  );
  text(
    page,
    "Independence - Freedom - Happiness",
    PAGE_WIDTH - RIGHT,
    792,
    8,
    "F3",
    BLACK,
    "right",
  );
  strokeLine(page, LEFT, 780, PAGE_WIDTH - RIGHT, 780, BLACK);
  if (!first) {
    text(
      page,
      "AI SYSTEM DECLARATION AND INFORMATION RECORD",
      PAGE_WIDTH / 2,
      756,
      11,
      "F2",
      BLACK,
      "center",
    );
    text(
      page,
      "READINESS-ONLY RECORD - CONTINUED",
      PAGE_WIDTH / 2,
      741,
      8,
      "F3",
      BLACK,
      "center",
    );
  }
}

function drawFooter(
  page: PdfPage,
  pageNumber: number,
  totalPages: number,
): void {
  strokeLine(page, LEFT, 50, PAGE_WIDTH - RIGHT, 50, MID_GRAY);
  text(page, "Form code: LCSP-WIZ-01", LEFT, 36, 7, "F1", BLACK);
  text(page, "Version: 1.0", PAGE_WIDTH / 2, 36, 7, "F1", BLACK, "center");
  text(
    page,
    "Classification: Internal",
    PAGE_WIDTH - RIGHT,
    36,
    7,
    "F1",
    BLACK,
    "right",
  );
  text(
    page,
    `Page ${pageNumber} / ${totalPages}`,
    PAGE_WIDTH / 2,
    22,
    7,
    "F1",
    BLACK,
    "center",
  );
}

function sectionAnswers(
  content: ReadinessExportContent,
  title: string,
): ReportField[] {
  const section = content.wizard_profile.sections.find(
    (item) => item.title === title,
  );
  return section?.answers.map(toReportField) ?? [];
}

function answerField(
  content: ReadinessExportContent,
  questionId: string,
  label: string,
): ReportField {
  for (const section of content.wizard_profile.sections) {
    const answer = section.answers.find(
      (item) => item.question_id === questionId,
    );
    if (answer) return { ...toReportField(answer), label };
  }
  return staticField(label, "Not provided", "NOT_ANSWERED");
}

function toReportField(
  answer: ReadinessExportContent["wizard_profile"]["sections"][number]["answers"][number],
): ReportField {
  return {
    answerState: answer.answer_state,
    label: answer.label,
    selectedValues: answer.selected_values ?? [],
    value: answer.value,
  };
}

function staticField(
  label: string,
  value: string | undefined,
  answerState: string = ANSWER_STATES.answered,
): ReportField {
  const resolvedValue = value || "Not provided";
  return {
    answerState: value ? answerState : "NOT_ANSWERED",
    label,
    selectedValues: value ? [resolvedValue] : [],
    value: resolvedValue,
  };
}

function drawCheckbox(
  page: PdfPage,
  x: number,
  y: number,
  checked: boolean,
): void {
  page.commands.push(checked ? "% CHECKBOX_CHECKED" : "% CHECKBOX_UNCHECKED");
  strokeRect(page, x, y - 8, 8, 8, BLACK);
  if (checked) {
    strokeLine(page, x + 1, y - 4, x + 3, y - 7, BLACK);
    strokeLine(page, x + 3, y - 7, x + 7, y - 1, BLACK);
  }
}

function fillRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  page.commands.push(`${color} rg\n${x} ${y} ${width} ${height} re f`);
}

function strokeRect(
  page: PdfPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  page.commands.push(`${color} RG\n0.5 w\n${x} ${y} ${width} ${height} re S`);
}

function strokeLine(
  page: PdfPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): void {
  page.commands.push(`${color} RG\n0.5 w\n${x1} ${y1} m ${x2} ${y2} l S`);
}

function text(
  page: PdfPage,
  value: string,
  x: number,
  y: number,
  size: number,
  font: PdfFont,
  color: string,
  align: "left" | "center" | "right" = "left",
): void {
  const resolvedX =
    align === "left"
      ? x
      : align === "center"
        ? x - approximateTextWidth(value, size, font) / 2
        : x - approximateTextWidth(value, size, font);
  const usesUnicode = /[^\x20-\x7e]/.test(value);
  const resolvedFont = usesUnicode ? unicodeFont(font) : font;
  const encodedValue = usesUnicode
    ? `<${utf16BeHex(value)}>`
    : `(${escapePdfText(value)})`;
  page.commands.push(
    `BT\n/${resolvedFont} ${size} Tf\n${color} rg\n${resolvedX.toFixed(1)} ${y} Td\n${encodedValue} Tj\nET`,
  );
}

const PDF_FONTS = {
  regular: "F1",
  bold: "F2",
  italic: "F3",
} as const;
type PdfFont = (typeof PDF_FONTS)[keyof typeof PDF_FONTS];

function unicodeFont(font: PdfFont): "F4" | "F5" | "F6" {
  if (font === PDF_FONTS.bold) return "F5";
  if (font === PDF_FONTS.italic) return "F6";
  return "F4";
}

function utf16BeHex(value: string): string {
  const bytes = Buffer.from(value, "utf16le");
  for (let index = 0; index < bytes.length; index += 2) {
    const first = bytes[index];
    bytes[index] = bytes[index + 1];
    bytes[index + 1] = first;
  }
  return `feff${bytes.toString("hex")}`;
}

function approximateTextWidth(
  value: string,
  size: number,
  font: PdfFont,
): number {
  return value.length * size * (font === "F2" ? 0.54 : 0.48);
}

function wrapPdfLine(value: string, maxCharacters: number): string[] {
  if (value.length <= maxCharacters) return [value];
  const lines: string[] = [];
  let remaining = value;
  while (remaining.length > maxCharacters) {
    const breakAt = remaining.lastIndexOf(" ", maxCharacters);
    const index = breakAt > 0 ? breakAt : maxCharacters;
    lines.push(remaining.slice(0, index));
    remaining = remaining.slice(index).trimStart();
  }
  return [...lines, remaining];
}

function formatTimestamp(value: string): string {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function escapePdfText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function buildPdf(pages: PdfPage[]): Buffer {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${12 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /TimesNewRomanPSMT /Encoding /Identity-H /DescendantFonts [9 0 R] >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /TimesNewRomanPS-BoldMT /Encoding /Identity-H /DescendantFonts [10 0 R] >>",
    "<< /Type /Font /Subtype /Type0 /BaseFont /TimesNewRomanPS-ItalicMT /Encoding /Identity-H /DescendantFonts [11 0 R] >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /TimesNewRomanPSMT /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 /CIDToGIDMap /Identity >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /TimesNewRomanPS-BoldMT /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 /CIDToGIDMap /Identity >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /TimesNewRomanPS-ItalicMT /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 1000 /CIDToGIDMap /Identity >>",
  ];

  pages.forEach((page, index) => {
    const pageObject = 12 + index * 2;
    const contentObject = pageObject + 1;
    const stream = page.commands.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R /F5 7 0 R /F6 8 0 R >> >> /Contents ${contentObject} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
