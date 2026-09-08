import { NextResponse } from "next/server";
import { ADMIN_USER_STATUSES } from "@/features/admin/types/admin.types";

export async function POST() {
  return NextResponse.json({
    ok: true,
    data: { status: ADMIN_USER_STATUSES.suspended },
  });
}
