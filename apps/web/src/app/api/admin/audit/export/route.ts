import { NextResponse } from "next/server";
import { AUDIT_EXPORT_STATUSES } from "@lcsp/contracts/audit";

export async function POST() {
  return NextResponse.json({
    ok: true,
    data: {
      exportRequestId: "export-1",
      status: AUDIT_EXPORT_STATUSES.queued,
    },
  });
}
