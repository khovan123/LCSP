import { SHARED_ERROR_CODES } from "@lcsp/contracts/shared";
import { NextRequest, NextResponse } from "next/server";

import {
  isMockModeEnabled,
  readMockJson,
} from "@/lib/server/fixtures/response";
import { problemJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamBinaryRequest,
  upstreamJson,
} from "@/lib/server/upstream-request";

const PDF_CONTENT_TYPE = "application/pdf";
const PDF_MAGIC = "%PDF-";
const PDF_END_MARKER = "%%EOF";
const PDF_DISPOSITION_PATTERN =
  /^attachment; filename="wizard-readiness-export-v[1-9][0-9]*\.pdf"$/;

interface MockPdfFixture {
  body_base64: string;
  content_disposition: string;
  content_type: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> },
) {
  const { id, exportId } = await params;
  let bytes: Uint8Array | null;
  let contentDisposition: string | null;
  let contentType: string | null;

  if (isMockModeEnabled()) {
    const fixture = await readMockJson<MockPdfFixture>(
      "readiness-export-pdf.json",
    );
    bytes = Uint8Array.from(Buffer.from(fixture.body_base64, "base64"));
    contentDisposition = fixture.content_disposition;
    contentType = fixture.content_type;
  } else {
    const session = requireSessionToken(request);
    if (!session.ok) return session.response;
    const upstream = await upstreamBinaryRequest(
      `/assessments/${encodeURIComponent(id)}/wizard/readiness-exports/${encodeURIComponent(exportId)}/download`,
      { bearerToken: session.token },
    );
    if (!upstream.ok) return upstreamJson(upstream);
    bytes = upstream.bytes;
    contentDisposition = upstream.contentDisposition;
    contentType = upstream.contentType;
  }

  if (
    !isValidPdf(bytes, contentType, contentDisposition) ||
    contentDisposition === null
  ) {
    return problemJson(SHARED_ERROR_CODES.upstreamResponseInvalid, {
      status: 502,
    });
  }

  return new NextResponse(toArrayBuffer(bytes), {
    status: 200,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-disposition": contentDisposition,
      "content-type": PDF_CONTENT_TYPE,
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
    },
  });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function isValidPdf(
  bytes: Uint8Array | null,
  contentType: string | null,
  contentDisposition: string | null,
): bytes is Uint8Array {
  return (
    bytes !== null &&
    bytes.length > PDF_MAGIC.length &&
    new TextDecoder("ascii").decode(bytes.subarray(0, PDF_MAGIC.length)) ===
      PDF_MAGIC &&
    new TextDecoder("ascii")
      .decode(bytes.subarray(Math.max(0, bytes.length - 32)))
      .includes(PDF_END_MARKER) &&
    contentType === PDF_CONTENT_TYPE &&
    contentDisposition !== null &&
    PDF_DISPOSITION_PATTERN.test(contentDisposition)
  );
}
