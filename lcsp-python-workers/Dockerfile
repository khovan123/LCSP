FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY lcsp-python-workers /app/lcsp-python-workers

RUN cd /app/lcsp-python-workers/src/lcsp_workers/scanner/ts_js_bridge/ts-js-analyzer \
    && npm install \
    && npm run build \
    && npm prune --omit=dev

RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir /app/lcsp-python-workers

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app/lcsp-python-workers/src
ENV HEALTH_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=6 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2).read()"

ENTRYPOINT ["python", "-m", "lcsp_workers.runtime"]
