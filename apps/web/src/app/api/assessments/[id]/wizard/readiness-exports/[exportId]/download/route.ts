import { NextResponse, type NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamBinaryRequest,
  upstreamJson,
} from "@/lib/server/upstream-request";

const FORMATS = new Set(["pdf", "docx"]);
const LOCALES = new Set(["en", "vi"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const { id, exportId } = await params;
  const requestedFormat = request.nextUrl.searchParams.get("format") ?? "pdf";
  const requestedLocale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!FORMATS.has(requestedFormat) || !LOCALES.has(requestedLocale)) {
    return NextResponse.json(
      { error: "format must be pdf|docx and locale must be en|vi" },
      { status: 400 },
    );
  }

  const upstream = await upstreamBinaryRequest(
    `/assessments/${encodeURIComponent(id)}/wizard/readiness-exports/${encodeURIComponent(exportId)}/download/${requestedFormat}/${requestedLocale}`,
    { bearerToken: session.token },
  );
  if (!upstream.ok || upstream.body === null) {
    return upstreamJson(upstream);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "cache-control": "private, no-store",
      "content-type":
        upstream.contentType ??
        (requestedFormat === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf"),
      ...(upstream.contentDisposition
        ? { "content-disposition": upstream.contentDisposition }
        : {}),
    },
  });
}
