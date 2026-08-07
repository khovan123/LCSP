# Blind Hunter Review Prompt

Invoke the `bmad-review-adversarial-general` skill on the Story 2.4 readiness DOCX-format rebuild.

Use this approved spec:

- `docs/implementation-artifacts/spec-2-4-rebuild-readiness-export-docx-format.md`

Review the complete tracked and untracked implementation diff from baseline commit `c779cd720fad3d0d7f3546daebcb55909f48b498`, with primary focus on:

- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts`
- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts`
- `apps/api/scripts/readiness-export-pdf-demo.helpers.ts`
- `apps/api/test/readiness-export-pdf-demo.spec.ts`
- `apps/api/test/wizard-readiness-export.e2e-spec.ts`

The authoritative visual source is `output/readiness_template.docx`. Report only concrete bugs, regressions, spec deviations, or missing verification, with file and line references.


===
Explicit unknown and unanswered fields are rendered with a checked box because checkbox state is derived only from value !== "Not provided"; values such as "Unknown" and "Not answered" therefore appear selected instead of the required visible unchecked/unknown state. [readiness-export-pdf.service.ts (line 269)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:269) [generate-readiness-export.handler.ts (line 459)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts:459)

The renderer ignores answer_state entirely, so EXPLICIT_UNKNOWN, NOT_ANSWERED, and an ordinary answered value containing "Unknown" become visually indistinguishable. This loses persisted readiness state required by the unknown-answer acceptance case. [readiness-export-pdf.service.ts (line 534)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:534) [readiness-export-pdf.service.spec.ts (line 56)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts:56)

The DOCX checkbox structure is not reproduced: arrays and bounded choices are flattened into comma-separated text and displayed beside one checked box. The export cannot show selected versus unselected options as the authoritative form does, despite advertising [X] selected / [ ] not selected. [generate-readiness-export.handler.ts (line 478)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts:478) [readiness-export-pdf.service.ts (line 188)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:188)

Answers not present in the hard-coded section definitions are persisted under "Additional wizard answers" but never rendered. The PDF only reads six named sections, silently omitting future, migrated, or feature-specific Wizard fields from the snapshot. [generate-readiness-export.handler.ts (line 439)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts:439) [readiness-export-pdf.service.ts (line 534)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:534)

Non-ASCII snapshot data is deliberately replaced with ?. Vietnamese names, organization details, and ordinary accented user answers cannot survive export, which is especially incompatible with the Vietnamese authoritative template. [readiness-export-pdf.service.ts (line 655)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:655)

Arbitrary user-entered text is mutated before persistence: every standalone high, medium, low, or risk is rewritten even when it is descriptive business content rather than a prohibited classification label. The generated record therefore no longer contains the actual persisted Wizard answer required by the spec. [generate-readiness-export.handler.ts (line 490)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts:490)

Long rows are not split across pages. ensure() starts a new page but answerRow() still draws the entire calculated height there; a value wrapping to roughly 53 or more lines extends below BOTTOM, overlaps the footer, and clips off-page. [readiness-export-pdf.service.ts (line 269)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:269) [readiness-export-pdf.service.ts (line 430)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:430)

Pagination checks headings, table headers, and rows independently. A section heading can be left at the bottom of one page while its table starts on the next, and a table header can similarly be orphaned without its first row. Continuation pages also do not repeat the active table’s column header. [readiness-export-pdf.service.ts (line 200)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:200) [readiness-export-pdf.service.ts (line 230)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:230)

The identification block substitutes the assessment ID for both “Record ID” and “Assessment,” uses the owner UUID as “Declared by,” and supplies fixed status/source values. It does not reproduce the template’s actual assessment name, system name, responsible unit, declarant identity, or organization information. [readiness-export-pdf.service.ts (line 153)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:153) [generate-readiness-export.handler.ts (line 257)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts:257)

Section 1 inserts fabricated fallback content such as "System declaration", the generic preview, and "Readiness preparation and evidence collection" when corresponding answers are absent. These are neither snapshot values nor blank/unknown states, violating the requirement that the PDF contain only snapshot-derived values. [readiness-export-pdf.service.ts (line 23)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:23)

The “real demo PDF content validator” does not validate PDF structure: it only checks the %PDF- prefix and searches raw bytes. Its positive regression fixture is plain text with a fake PDF header and footer, demonstrating that malformed, unreadable output passes. [readiness-export-pdf-demo.helpers.ts (line 69)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/scripts/readiness-export-pdf-demo.helpers.ts:69) [readiness-export-pdf-demo.spec.ts (line 7)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/test/readiness-export-pdf-demo.spec.ts:7)

Neither the unit nor download-level tests exercise long content, multiple-page boundary conditions, checkbox drawing state, Unicode preservation, clipping, footer overlap, or visual/structural comparison with the authoritative DOCX. Raw Latin-1 substring assertions cannot verify the central format and safe-pagination acceptance criteria. [readiness-export-pdf.service.spec.ts (line 10)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts:10) [wizard-readiness-export.e2e-spec.ts (line 184)](/Users/nguyenanh/Documents/Capstone/LCSP/apps/api/test/wizard-readiness-export.e2e-spec.ts:184)

The authoritative output/readiness_template.docx is untracked and the implementation now ignores the entire output/ directory. A clean checkout therefore lacks the approved visual source, preventing reproducible implementation or review against the document named authoritative by the spec. [.gitignore (line 26)](/Users/nguyenanh/Documents/Capstone/LCSP/.gitignore:26) [spec-2-4-rebuild-readiness-export-docx-format.md (line 42)](/Users/nguyenanh/Documents/Capstone/LCSP/docs/implementation-artifacts/spec-2-4-rebuild-readiness-export-docx-format.md:42)

The documented focused-test command places Jest options after an extra --; in this workspace that caused --watchman=false not to take effect and the command failed through Watchman permissions. The tests passed only when invoked without that separator, so the recorded verification command is not currently reproducible as written. [spec-2-4-rebuild-readiness-export-docx-format.md (line 69)](/Users/nguyenanh/Documents/Capstone/LCSP/docs/implementation-artifacts/spec-2-4-rebuild-readiness-export-docx-format.md:69)



[
  {
    "location": "apps/api/src/modules/wizard/application/queries/download-readiness-export/download-readiness-export.handler.ts:46-48",
    "trigger_condition": "A generated export predates the rebuilt content schema",
    "guard_snippet": "if (!isCurrentContent(content)) return migrateOrProblem();",
    "potential_consequence": "Download throws and returns a server error"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:23-35",
    "trigger_condition": "System name, description, or purpose answers are absent",
    "guard_snippet": "const value = persistedValue ?? "Not provided";",
    "potential_consequence": "Report presents invented declarations as persisted answers"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:38-61",
    "trigger_condition": "Snapshot contains an additional or newly introduced wizard question",
    "guard_snippet": "for (const section of content.wizard_profile.sections) renderSection(section);",
    "potential_consequence": "Persisted answers disappear from the exported form"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:200-205",
    "trigger_condition": "Page break occurs after a section heading or table header",
    "guard_snippet": "reserve heading + header + first row; redraw tableHeader() after page breaks",
    "potential_consequence": "Heading becomes orphaned and continuation rows lose column labels"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:269-291",
    "trigger_condition": "Answer state is explicit unknown or not answered",
    "guard_snippet": "const checked = answer.answer_state === ANSWER_STATES.answered;",
    "potential_consequence": "Unknown or unanswered fields appear affirmatively selected"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:269-303",
    "trigger_condition": "One answer requires more than a continuation page",
    "guard_snippet": "for (const chunk of paginateRow(lines)) drawRowFragment(chunk);",
    "potential_consequence": "Row extends through the footer or beyond the page"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:289",
    "trigger_condition": "A label or response contains many wide characters",
    "guard_snippet": "wrapByMeasuredWidth(label, labelWidth); wrapByMeasuredWidth(value, responseWidth);",
    "potential_consequence": "Text crosses vertical borders or exits the right margin"
  },
  {
    "location": "apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts:209-227",
    "trigger_condition": "Signature table fits but its trailing end marker does not",
    "guard_snippet": "ensure(headingHeight + declarationHeight + signatureHeight + endMarkerHeight);",
    "potential_consequence": "End marker enters the reserved footer area"
  },
  {
    "location": "apps/api/scripts/readiness-export-pdf-demo.helpers.ts:66-67",
    "trigger_condition": "PDF contains approved, certified, severity, violation, or final-classification wording",
    "guard_snippet": "assert.doesNotMatch(text, COMPLETE_READINESS_OVERCLAIM_PATTERN);",
    "potential_consequence": "Demo validation accepts prohibited readiness claims"
  },
  {
    "location": "apps/api/scripts/readiness-export-pdf-demo.helpers.ts:69-80",
    "trigger_condition": "Required substrings exist inside a malformed or mispaginated PDF",
    "guard_snippet": "parse xref/pages; assert header, footer, and page totals on every page",
    "potential_consequence": "Malformed PDFs and pagination regressions pass demo validation"
  }
]






