# Legal Corpus OCR

Use this operator-only step for scanned legal PDFs before corpus normalization.
It creates review artifacts only; it does not ingest or approve legal content.

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
