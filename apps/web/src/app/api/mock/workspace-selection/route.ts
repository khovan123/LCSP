import { NextRequest } from "next/server";
import { AUTH_ERROR_CODES, WORKSPACE_ERROR_CODES } from "@lcsp/contracts/auth";
import { SHARED_ERROR_CODES } from "@lcsp/contracts/shared";

import { isMockModeEnabled, readMockJson } from "@/lib/server/fixtures/response";
import {
  MOCK_WORKSPACE_COOKIE_NAME,
  type MockDeveloperAccount,
} from "@/lib/server/fixtures/workspace";
import { problemJson, successJson } from "@/lib/server/problem-json";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";

export async function GET(request: NextRequest) {
  if (!isMockModeEnabled()) {
    return problemJson(SHARED_ERROR_CODES.notFound, { status: 404 });
  }

  const account = await readMockJson<MockDeveloperAccount>(
    "developer-account.json",
  );
  const selectedWorkspaceId = request.cookies.get(
    MOCK_WORKSPACE_COOKIE_NAME,
  )?.value;

  return successJson({
    email: account.email,
    workspaces: account.workspaces,
    selected_workspace_id: selectedWorkspaceId,
  });
}

export async function POST(request: NextRequest) {
  if (!isMockModeEnabled()) {
    return problemJson(SHARED_ERROR_CODES.notFound, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const workspaceId = (body as { workspace_id?: unknown })?.workspace_id;
  if (typeof workspaceId !== "string") {
    return problemJson(AUTH_ERROR_CODES.validationFailed, { status: 400 });
  }

  const account = await readMockJson<MockDeveloperAccount>(
    "developer-account.json",
  );
  const selectedWorkspace = account.workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );
  if (!selectedWorkspace) {
    return problemJson(WORKSPACE_ERROR_CODES.notFound, { status: 404 });
  }

  const response = successJson({
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
