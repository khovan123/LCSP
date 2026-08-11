# Legal Corpus + Rule Catalog Data Quality Gate — 2026-08-11

## Scope

This record captures the deterministic quality gates added after the reviewed
Law 134/2025/QH15 and Law 71/2025/QH15 artefacts were approved for LCSP's
targeted corpus scope.

It is an engineering/audit record only. It is not legal advice, legal
certification, or an external regulatory approval.

## Legal Corpus publication gate

The reviewed-corpus builder now publishes only locators covered by
`reviewScope.fullTextReviewedLocators`.

Hierarchy-only and boundary-only locators remain available to validate legal
structure and repeal ranges, but are not emitted as retrievable corpus chunks.
For the current fixture this means, among others:

- Law 134 Articles 28–32 are hierarchy-only and are not retrieval content;
- Law 71 Article 40 and Article 46 are range-boundary assertions and are not
  retrieval content;
- Law 71 `art-34::cl-2::pt-đ` remains reviewable with its parent Article/Clause
  context without widening the reviewed legal text beyond the reviewed artefact.

The builder fails closed when:

- reviewed text or hierarchy review is missing;
- `reviewState` is not `APPROVED`;
- reviewed text/source hashes do not resolve to the reviewed snapshot;
- `fullTextReviewedLocators` is missing or cannot be resolved;
- the Law 134 Article 33 mapping is not identically confirmed by both Law 134
  and Law 71 review records;
- the `art-41..art-45` range expansion is incomplete;
- Law 71 boundary locators `art-40` or `art-46` cannot be found.

### Build the reviewed corpus payload

From the repository root:

```bash
lcsp-python-workers/.venv/bin/python \
  lcsp-python-workers/scripts/build_reviewed_legal_corpus.py \
  --source-manifest reports/legal-corpus-source/LAW-134-2025-QH15.source.json \
  --source-manifest reports/legal-corpus-source/LAW-71-2025-QH15.source.json \
  --reviewed-dir reports/legal-corpus-ocr \
  --version VN-LEGAL-2026-08-REVIEWED \
  --output reports/legal-corpus-source/VN-LEGAL-2026-08-REVIEWED.ingest.json
```

The output provenance is rebound to the source snapshot actually reviewed by
the hierarchy-review artefact. Discovery/crawler manifests are retained as
provenance inputs but do not override the reviewed snapshot hash.

## Article 33 legal-effect materialization

The materialized relationship is:

```text
LAW-134-2025-QH15::art-33
  -> LAW-71-2025-QH15::art-3::cl-9
  -> LAW-71-2025-QH15::art-4::cl-7
  -> LAW-71-2025-QH15::art-12::cl-6
  -> LAW-71-2025-QH15::art-34::cl-2::pt-đ
  -> LAW-71-2025-QH15::art-41..art-45 (including descendants)
```

Each affected published chunk receives:

```json
{
  "legalStatus": "REPEALED",
  "hierarchy": {
    "repealedByRef": {
      "documentId": "LAW-134-2025-QH15",
      "locator": "art-33"
    }
  }
}
```

The payload also records a `sourceManifest.materializedRelationships` audit
entry with declared locators, materialized chunk IDs, and the Article 40/46
boundary assertions.

## Corpus approval and audit-principal policy

Reviewed artefact identity and lifecycle approval identity are separate audit
concerns:

- `reviewedBy` identifies the technical principal that produced/approved the
  reviewed artefact gate;
- the bearer token identifies the authenticated principal authorized by PBAC to
  ingest/approve the corpus lifecycle action.

The orchestrator now declares:

```json
{
  "identityPolicy": "TECHNICAL_AUDIT_PRINCIPALS_INDEPENDENT",
  "approvalActorMayDiffer": true
}
```

The API accepts a differing approval actor only when that exact policy is
present. Legacy/undeclared sign-offs remain fail-closed and still require the
same principal. `CorpusApprovalRecord.approvedBy` records the authenticated
actor who actually performed approval.

## Rule Catalog quality gate

Rule applicability evaluation now distinguishes three states that were
previously conflated:

- required fact matched -> candidate can become `MATCHED` when evidence exists;
- required fact is known and different -> `NOT_APPLICABLE`;
- required fact is unknown/unclear/not determinable ->
  `BLOCKED_UNKNOWN_FACT` under `BLOCK_ON_UNKNOWN`.

`NOT_DETERMINABLE_FROM_CODE` is explicitly treated as unknown and cannot be used
as a positive fact proving that a legal obligation applies or has been
violated.

List-valued facts use containment semantics. Example: a rule requiring
`POTENTIAL_HIGH_IMPACT` still matches a verified profile that contains that
category plus other evidence-backed harm categories.

Blocking facts with an `expectedValue` block only when the actual value matches
that expected value; mere presence of the field does not make a rule
inapplicable.

## Law 134 baseline Rule Catalog authoring

`apps/api/scripts/author-law-134-baseline-catalog.ts` now behaves as an authoring
utility, not an implicit approval utility:

- duplicate/empty rule IDs are rejected;
- every candidate needs required facts and citation locators;
- unknown values (`UNKNOWN`, `UNCLEAR`, `NOT_DETERMINABLE_FROM_CODE`) cannot be
  authored as positive required facts;
- the previous Article 14 rule no longer treats
  `riskDocumentationEvidence = NOT_DETERMINABLE_FROM_CODE` as a positive match;
- the catalog remains `DRAFT` by default;
- approval happens only when `LEGAL_RULE_CATALOG_APPROVE` is explicitly set to
  `1`, `true`, or `yes`.

The baseline still requires human/domain review of legal-role applicability
(provider/deployer/developer/user scope) before production approval because the
current VerifiedProfile does not yet expose a sufficiently explicit legal-role
fact for those obligations.

## Verification targets

The branch adds/extends tests for:

- reviewed full-text publication scope;
- exclusion of hierarchy/boundary-only content;
- bilateral Article 33 repeal confirmation;
- reviewed-dir/source-manifest handoff;
- exact reviewed source provenance;
- known mismatch versus unknown fact behavior;
- `NOT_DETERMINABLE_FROM_CODE` blocking;
- additive list matching;
- value-aware blocking facts;
- independent technical review/approval audit-principal sign-off policy.

CI remains the final repository-level verification gate before merge.
