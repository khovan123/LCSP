#!/usr/bin/env bash
set -euo pipefail

APP=/srv/apps/lcsp-pm2

cd "$APP"

echo "==> Pull source"
git pull

echo "==> Install Node dependencies"
pnpm install --frozen-lockfile

echo "==> Install Python workers"
.venv/bin/python -m pip install ./lcsp-python-workers

echo "==> Build scanner TS/JS analyzer"
cd "$APP/lcsp-python-workers/src/lcsp_workers/scanner/ts_js_bridge/ts-js-analyzer"
npm install
npm run build
npm prune --omit=dev

cd "$APP"

echo "==> Build API"
dotenv -e .env.pm2 -- pnpm --filter @lcsp/api build

echo "==> Build Web"
dotenv -e .env.pm2 -- pnpm --filter @lcsp/web build

echo "==> Restart PM2"
pm2 restart ecosystem.config.cjs --update-env

sleep 3

echo "==> Status"
pm2 status

echo "==> API"
curl -fsS http://127.0.0.1:8080/health
echo

echo "==> Web"
curl -I --max-time 10 http://127.0.0.1:3001/ | head -n 1

echo "==> Workers"
for port in {8101..8108}; do
  printf "%s -> " "$port"
  curl -fsS "http://127.0.0.1:$port/health" || echo "FAILED"
  echo
done

echo "==> LCSP redeploy completed"
