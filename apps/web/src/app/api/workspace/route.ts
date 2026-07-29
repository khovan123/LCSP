import { NextRequest, NextResponse } from "next/server";

import { isMockModeEnabled, readMockJson } from "@/lib/mocks/mock-response";
import {
  MOCK_WORKSPACE_COOKIE_NAME,
  type MockDeveloperAccount,
} from "@/lib/mocks/mock-workspace";
import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  if (isMockModeEnabled()) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken === "mock-session:manager") {
      return NextResponse.json(await readMockJson("workspace.json"));
    }

    const selectedWorkspaceId = request.cookies.get(
      MOCK_WORKSPACE_COOKIE_NAME,
    )?.value;
    if (!selectedWorkspaceId) {
      return NextResponse.json(
        { problem: { code: "WORKSPACE_SELECTION_REQUIRED" } },
        { status: 409 },
      );
    }

    const account = await readMockJson<MockDeveloperAccount>(
      "developer-account.json",
    );
    const selectedWorkspace = account.workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    );
    if (!selectedWorkspace) {
      return NextResponse.json(
        { problem: { code: "WORKSPACE_SELECTION_REQUIRED" } },
        { status: 409 },
      );
    }

    return NextResponse.json({
      organization: selectedWorkspace,
      membership: { role: "Developer" },
      granted_actions: [
        "assessment:list",
        "assessment:read",
        "wizard:write",
        "wizard:submit",
        "conflict:read",
        "evidence:read",
        "document:read",
        "workspace:read",
      ],
    });
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json(
      { problem: { code: "SESSION_INVALID" } },
      { status: 401 },
    );
  }
  const apiResponse = await fetch(`${apiBaseUrl}/workspace`, {
    headers: { authorization: `Bearer ${sessionToken}` },
    cache: "no-store",
  });
  return NextResponse.json(await apiResponse.json().catch(() => null), {
    status: apiResponse.status,
  });
}
