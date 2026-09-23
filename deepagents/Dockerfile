FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates curl git gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY deepagents /app/deepagents
COPY reports/legal-corpus-ocr/lcsp-precompiled-engineering-rules-vn-2026-08.json \
    /app/reports/legal-corpus-ocr/lcsp-precompiled-engineering-rules-vn-2026-08.json

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir "/app/deepagents"

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/deepagents

WORKDIR /app/deepagents

ENTRYPOINT ["python", "entrypoint.py"]
