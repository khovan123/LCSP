import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readinessPage = readFileSync(
  new URL(
    "../apps/web/src/features/readiness/components/organisms/readiness-status-page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const readinessQueries = readFileSync(
  new URL("../apps/web/src/lib/api/assessment-queries.ts", import.meta.url),
  "utf8",
);
const readinessExportRoute = readFileSync(
  new URL(
    "../apps/web/src/app/api/assessments/[id]/wizard/readiness-export/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const readinessExportHistoryRoute = readFileSync(
  new URL(
    "../apps/web/src/app/api/assessments/[id]/wizard/readiness-exports/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const readinessExportDownloadRoute = readFileSync(
  new URL(
    "../apps/web/src/app/api/assessments/[id]/wizard/readiness-exports/[exportId]/download/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const upstreamRequest = readFileSync(
  new URL("../apps/web/src/lib/server/upstream-request.ts", import.meta.url),
  "utf8",
);
const englishMessages = readFileSync(
  new URL("../packages/i18n/src/locales/en/pages.ts", import.meta.url),
  "utf8",
);
const vietnameseMessages = readFileSync(
  new URL("../packages/i18n/src/locales/vi/pages.ts", import.meta.url),
  "utf8",
);

test("Story 2.4 exposes readiness export from the Manager readiness entry point", () => {
  assert.match(readinessPage, /useGenerateReadinessExportMutation/);
  assert.match(readinessPage, /pages\.readiness\.actions\.generateExport/);
  assert.match(readinessQueries, /requestReadinessExport/);
  assert.match(readinessExportRoute, /wizard\/readiness-export/);
  assert.match(readinessExportRoute, /validatedUpstreamJson/);
});

test("Story 2.4 exposes guarded history and download state", () => {
  assert.match(readinessPage, /useReadinessExportHistoryQuery/);
  assert.match(readinessPage, /pages\.readiness\.exportHistoryTitle/);
  assert.match(readinessPage, /pages\.readiness\.actions\.downloadExport/);
  assert.match(readinessExportHistoryRoute, /wizard\/readiness-exports/);
  assert.match(readinessExportDownloadRoute, /content-disposition/i);
  assert.match(readinessExportDownloadRoute, /application\/pdf/i);
  assert.match(readinessExportDownloadRoute, /%PDF-/);
  assert.match(readinessExportDownloadRoute, /%%EOF/);
  assert.match(readinessExportDownloadRoute, /\.pdf/);
  assert.match(upstreamRequest, /upstreamBinaryRequest/);
  assert.match(readinessPage, /downloadExport/);
  assert.match(englishMessages, /downloadExport: "Download PDF"/);
  assert.match(vietnameseMessages, /downloadExport: "Tải PDF"/);
});

test("Story 2.4 renders the canonical unresolved-unknown projection", () => {
  assert.match(readinessPage, /unresolvedUnknownItems/);
  assert.match(readinessPage, /pages\.readiness\.unresolvedUnknownsTitle/);
});
