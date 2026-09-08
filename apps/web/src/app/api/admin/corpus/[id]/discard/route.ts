import { NextResponse } from "next/server";
import { LEGAL_RULE_LIFECYCLE_STATUSES } from "@lcsp/contracts/legal-rule-catalog";

export async function POST() {
  return NextResponse.json({
    ok: true,
    data: { status: LEGAL_RULE_LIFECYCLE_STATUSES.rejected },
  });
}
