# Legal Corpus OCR

Use the VBPL HTML crawler as the preferred source path. It preserves document
text and metadata without OCR. The OCR command is only a fallback for a
provenance-validated scan that has no accessible HTML source.

Both commands create review artifacts only; neither ingests or approves legal
content.

## Preferred: Crawl Official VBPL HTML

The crawler requires the numeric gateway document ID, not the `ItemID` in the
portal URL. Obtain that ID from an approved operator lookup; do not bulk-crawl
or probe the gateway.

```bash
lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/crawl_vbpl_document.py \
  --document-id LAW-71-2025-QH15 \
  --gateway-document-id <validated-vbpl-gateway-id> \
  --source-url 'https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=179989&Keyword=' \
  --output-dir reports/legal-corpus-source
```

This outputs source HTML, normalized plain text and a JSON manifest containing
the source/status metadata, retrieval time, and SHA-256 hashes. Review the
manifest's `sourceEffectStatus` before corpus ingestion.

## Normalize To A Draft Corpus Payload

```bash
lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/normalize_vbpl_document.py \
  --source-manifest reports/legal-corpus-source/LAW-71-2025-QH15.source.json \
  --corpus-version VN-LEGAL-2026-08 \
  --output reports/legal-corpus-source/LAW-71-2025-QH15.ingest.json
```

The crawler always verifies HTTPS. On a server using an enterprise TLS proxy,
provide the proxy CA without disabling verification:

```bash
REQUESTS_CA_BUNDLE=/etc/ssl/certs/enterprise-proxy-ca.pem \
  lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/crawl_congbao_docx.py ...
```

The generated payload contains stable `art-N`, `art-N::cl-M`, and
`art-N::cl-M::pt-X` locators, parent context and direct in-document article
references. It has `reviewRequired: true`; inspect warnings, hierarchy and
cross references before submitting it to the corpus ingestion endpoint.

## Official DOCX Fallback For Law 134

Luật 134/2025/QH15 is available as an official Công báo DOCX. Use it instead
of OCR:

```bash
lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/crawl_congbao_docx.py \
  --document-id LAW-134-2025-QH15 \
  --source-url 'https://congbao.chinhphu.vn/van-ban/luat-so-134-2025-qh15-468694.htm' \
  --source-effect-status 'Còn hiệu lực' \
  --output-dir reports/legal-corpus-source

lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/normalize_vbpl_document.py \
  --source-manifest reports/legal-corpus-source/LAW-134-2025-QH15.source.json \
  --corpus-version VN-LEGAL-2026-08 \
  --output reports/legal-corpus-source/LAW-134-2025-QH15.ingest.json
```

## Fallback: OCR Scanned PDF

## Prerequisites

```bash
sudo apt-get update
sudo apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-vie
```

`pdftoppm` comes from `poppler-utils`; Vietnamese recognition data is supplied
by `tesseract-ocr-vie`.

## Run The Repository Sources

From the repository root:

```bash
lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/ocr_legal_pdf.py \
  --pdf reports/Luat_134_2025_QH15.pdf \
  --document-id LAW-134-2025-QH15 \
  --source-url https://vanban.chinhphu.vn/?docid=216334\&pageid=27160 \
  --output-dir reports/legal-corpus-ocr

lcsp-python-workers/.venv/bin/python lcsp-python-workers/scripts/ocr_legal_pdf.py \
  --pdf reports/Luat-71-2025-qh15_0710195033.pdf \
  --document-id LAW-71-2025-QH15 \
  --source-url https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=179989\&Keyword= \
  --output-dir reports/legal-corpus-ocr
```

Each run creates:

- `<document-id>.ocr.txt`: page-separated OCR text;
- `<document-id>.ocr.json`: source hash, page text hashes, OCR language/DPI and timestamp.

## Review Gate

The Internal Legal Operator must correct and review the OCR output, identify
document/article/clause/point hierarchy, and create stable citation locators
before calling the corpus ingestion API. OCR output is never automatically
approved or presented as a legal source.
