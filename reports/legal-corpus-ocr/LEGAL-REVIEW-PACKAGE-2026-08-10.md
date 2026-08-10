# Legal corpus and rule-catalog review package — 2026-08-10

## Status and decision boundary

**DRAFT — NOT APPROVED.** This package is a review aid for the Internal Legal
Operator. It does not create an approved `LegalCorpusVersion`, an approved
`LegalRuleCatalogVersion`, or a legal-compliance conclusion.

The source PDFs were processed with Vietnamese/English OCR to produce stable,
hashable review artefacts. Raw OCR artefacts are immutable evidence of the OCR
run and must not be edited in place. Before normalization and corpus ingestion,
a Legal Operator must produce a corrected reviewed-text artefact and explicitly
confirm the document hierarchy used to derive stable locators.

In particular, the locally held Law 71 PDF must not be promoted to a PRIMARY
source merely because its OCR manifest uses the canonical VBPL URL; the source
file provenance remains subject to review.

| Document | OCR artefacts | Canonical source URL | OCR profile | Review state |
| --- | --- | --- | --- | --- |
| `LAW-134-2025-QH15` | `LAW-134-2025-QH15.ocr.txt`, `LAW-134-2025-QH15.ocr.json` | `https://congbao.chinhphu.vn/van-ban/luat-so-134-2025-qh15-468694.htm` | `vie+eng`, 200 DPI, 20 pages | `REVIEWED_TEXT_AND_HIERARCHY_SIGNOFF_REQUIRED` |
| `LAW-71-2025-QH15` | `LAW-71-2025-QH15.ocr.txt`, `LAW-71-2025-QH15.ocr.json` | `https://vbpl.vn/van-ban/chi-tiet/luat-cong-nghiep-cong-nghe-so-so-71-2025-qh15--179989` | `vie+eng`, 200 DPI, 28 pages | `REVIEWED_TEXT_AND_HIERARCHY_SIGNOFF_REQUIRED` |

## Required Legal Operator handoff before implementation continues

The remaining blocking input is not another OCR run. It is the Legal
Operator-reviewed source text and hierarchy confirmation for each document.
Implementation must remain fail-closed until that handoff exists.

Required artefacts per document:

1. `<document-id>.reviewed.txt`
   - corrected against a PRIMARY official source;
   - free of OCR-only transcription artefacts that could change legal meaning or
     hierarchy;
   - preserves the reviewed legal wording used for normalization.
2. `<document-id>.hierarchy-review.json`
   - records reviewed chapter/article/clause/point boundaries;
   - records any correction from raw OCR headings;
   - records the Legal Operator identity, review date and source snapshot/hash;
   - ends with an explicit review state (`APPROVED` or `CHANGES_REQUIRED`).
3. The corpus normalizer/ingestion flow must consume the reviewed artefacts,
   never the raw `.ocr.txt`, once the Legal Operator gate is enabled.

### Known hierarchy issue requiring explicit confirmation — Law 134

The raw OCR currently renders the management chapter following Article 29 as
`Chương VI`, even though the preceding enforcement chapter is already
`Chương VI`, and the final provisions are rendered as `Chương VIII`.

Candidate reviewed hierarchy:

- `Chương VI` — Articles 28–29 — inspection/enforcement and violations;
- **`Chương VII` — Articles 30–32 — state management of artificial intelligence;**
- `Chương VIII` — Articles 33–35 — final provisions.

This is a **candidate correction only** until the Legal Operator compares it to
the PRIMARY source and records the decision in
`LAW-134-2025-QH15.hierarchy-review.json`. Do not silently rewrite the raw OCR
artefact and do not approve a corpus version while this hierarchy decision is
missing.

## Candidate locator normalization and repeal mapping

The following locators are candidates only. The Legal Operator must compare
them to a PRIMARY-source snapshot and correct OCR transcription before corpus
ingestion.

| Amending text | Target document | Candidate target locators | Required corpus action after review |
| --- | --- | --- | --- |
| Law 134, Article 33 | Law 71 | `art-3::cl-9` | set target chunk to `REPEALED`; set `repealed_by_ref` to Law 134 Article 33 |
| Law 134, Article 33 | Law 71 | `art-4::cl-7` | same |
| Law 134, Article 33 | Law 71 | `art-12::cl-6` | same |
| Law 134, Article 33 | Law 71 | `art-34::cl-2::pt-đ` | same |
| Law 134, Article 33 | Law 71 | `art-41..art-45` (Chapter IV) | set every article and child locator in the range to `REPEALED` |

Law 134 Articles 9–15 are retained as active candidate citation targets. Law
71 Articles 41–45 must not be retrieved as active law after the Article 33
mapping has been reviewed and applied.

## Rule applicability draft for Law 134 Articles 9–15

Every rule below must use `BLOCK_ON_UNKNOWN`. A match means only that an
obligation may apply; it is not a finding that the organization has breached or
satisfied that obligation. Each material fact must carry a verified-profile
evidence reference.

| Article / candidate rule | Required applicability facts | Blocking or unknown facts | Evidence needed beyond source code |
| --- | --- | --- | --- |
| Art. 9 high-risk classification | AI system, potential significant harm, affected subjects, business purpose, sector, automation level, downstream action, scale of users/impact | Any unresolved risk criterion | Use-case description, affected-person analysis, deployment scale and risk assessment |
| Art. 9 medium-risk classification | Direct AI interaction or AI-generated content capable of misleading/manipulating a user | Output/interaction mode unresolved | Product UX, output-distribution description and audience scope |
| Art. 10 provider classification and notice | Confirmed provider role; confirmed medium/high classification; system is before use or materially changed | Role, classification, or change status unknown | Classification dossier, notice receipt/submission and change record |
| Art. 10 deployer reclassification | Confirmed deployer role; modification, integration, or functional change; potential new/higher risk | Modification impact unknown | Integration/change-control record and updated classification dossier |
| Art. 11 direct-interaction transparency | Provider role; direct human interaction; absence/presence of AI notice | Whether an exception applies is unknown | UX copy, release evidence and accessibility/route evidence |
| Art. 11 generated-content labeling | Provider role; generated audio/image/video | Output media type or applicable exception unknown | Machine-readable marking design, output metadata and release evidence |
| Art. 11 public-content notice / simulated-content label | Deployer role; public distribution; generated/edited content; risk of confusion or simulated real person/event | Public distribution, confusion potential, or exception unknown | Publication workflow, labeling records and content samples |
| Art. 12 incident management | Relevant actor role; AI incident with potential harm, or serious incident | Incident severity and actor role unknown | Incident policy, alerts/logs, report/notice records, remediation evidence |
| Art. 13 conformity assessment | Confirmed high-risk classification; before use or significant change; provider/system responsibility | High-risk catalog status or change significance unknown | Conformity assessment, certificate/self-assessment, technical file and maintained-status evidence |
| Art. 14 high-risk provider duties | Confirmed high-risk classification and provider role | Role/classification unknown | Risk-management file, data governance, technical file, activity logs, transparency and incident controls |
| Art. 14 high-risk deployer duties | Confirmed high-risk classification and deployer role | Role/classification unknown | Operating controls, human-intervention control, data-security proof, incident and accountability records |
| Art. 15 medium-risk duties | Confirmed medium-risk classification and actor role | Classification or actor role unknown | Transparency, accountability, operation/control and incident records as applicable to the actor |

## Schema and authoring gaps that block approval

The current baseline script can only use a small set of technical profile
fields. It does not yet contain evidence-backed facts for the legal role
(`provider`, `deployer`, `developer`, `user`), use/deployment stage, sector,
scale, public distribution, high-risk catalogue status, or conformity dossier.
Therefore it must not be approved merely by adding more literal checks to the
existing script.

Before authoring a replacement catalog version, the Legal Operator and domain
owner must approve fact definitions and evidence sources for those fields. The
replacement catalog must cite reviewed stable locators in an approved corpus,
and must remain `DRAFT` until a Legal Operator reviews every citation and
applicability expression.

## Legal Operator sign-off checklist

- [ ] Produce reviewed text for Law 134 from a PRIMARY official source and
      record the reviewed source/hash.
- [ ] Confirm Law 134 chapter hierarchy, specifically that Articles 30–32 belong
      to Chapter VII (or record the authoritative correction if different).
- [ ] Produce reviewed text for Law 71 from a PRIMARY official source and
      record the reviewed source/hash.
- [ ] Verify identity, effective date and source effect status for both laws.
- [ ] Produce reviewed stable article/clause/point locators.
- [ ] Verify Law 134 Article 33 mapping and mark all listed Law 71 target
      chunks `REPEALED`.
- [ ] Create a `DRAFT` corpus version only from the reviewed source artefacts.
- [ ] Review and approve the missing verified-profile fact definitions.
- [ ] Author the replacement Article 9–15 rules against reviewed locators.
- [ ] Approve corpus and rule catalog separately, recording authority, date and
      scope.
