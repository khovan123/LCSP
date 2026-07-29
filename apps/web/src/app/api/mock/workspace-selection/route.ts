import { NextRequest, NextResponse } from "next/server";

import { isMockModeEnabled, readMockJson } from "@/lib/mocks/mock-response";
import {
  MOCK_WORKSPACE_COOKIE_NAME,
  type MockDeveloperAccount,
} from "@/lib/mocks/mock-workspace";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";

export async function GET(request: NextRequest) {
  if (!isMockModeEnabled()) {
    return NextResponse.json(
      { problem: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  const account = await readMockJson<MockDeveloperAccount>(
    "developer-account.json",
  );
  const selectedWorkspaceId = request.cookies.get(
    MOCK_WORKSPACE_COOKIE_NAME,
  )?.value;

  return NextResponse.json({
    email: account.email,
    workspaces: account.workspaces,
    selected_workspace_id: selectedWorkspaceId,
  });
}

export async function POST(request: NextRequest) {
  if (!isMockModeEnabled()) {
    return NextResponse.json(
      { problem: { code: "NOT_FOUND" } },
      { status: 404 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const workspaceId = (body as { workspace_id?: unknown })?.workspace_id;
  if (typeof workspaceId !== "string") {
    return NextResponse.json(
      { problem: { code: "VALIDATION_FAILED" } },
      { status: 400 },
    );
  }

  const account = await readMockJson<MockDeveloperAccount>(
    "developer-account.json",
  );
  const selectedWorkspace = account.workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );
  if (!selectedWorkspace) {
    return NextResponse.json(
      { problem: { code: "WORKSPACE_NOT_FOUND" } },
      { status: 404 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    selected_workspace: selectedWorkspace,
  });
  response.cookies.set(
    MOCK_WORKSPACE_COOKIE_NAME,
    selectedWorkspace.id,
    sessionCookieOptions,
  );
  response.cookies.set(
    SESSION_COOKIE_NAME,
    `mock-session:${selectedWorkspace.id}`,
    sessionCookieOptions,
  );
  return response;
}
