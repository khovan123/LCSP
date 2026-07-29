import { NextResponse } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { isMockModeEnabled, readMockJson } from "@/lib/mocks/mock-response";
import {
  MOCK_WORKSPACE_COOKIE_NAME,
  type MockDeveloperAccount,
  type MockManagerAccount,
} from "@/lib/mocks/mock-workspace";

import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session/session-store";

type SignInApiSuccess = {
  ok: true;
  mfa_required?: boolean;
  session_token: string;
};

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (isMockModeEnabled()) {
    const developerAccount = await readMockJson<MockDeveloperAccount>(
      "developer-account.json",
    );
    const managerAccount = await readMockJson<MockManagerAccount>(
      "manager-account.json",
    );
    const credentials = body as { email?: unknown; password?: unknown };
    if (
      credentials.email === managerAccount.email &&
      credentials.password === managerAccount.password
    ) {
      const response = NextResponse.json({
        ok: true,
        mfa_required: false,
      });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "mock-session:manager",
        sessionCookieOptions,
      );
      response.cookies.delete(MOCK_WORKSPACE_COOKIE_NAME);
      return response;
    }

    if (
      credentials.email === developerAccount.email &&
      credentials.password === developerAccount.password
    ) {
      const response = NextResponse.json({
        ok: true,
        workspace_selection_required: true,
        workspaces: developerAccount.workspaces,
      });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "mock-session:workspace-selection",
        sessionCookieOptions,
      );
      return response;
    }

    return NextResponse.json(
      { code: AUTH_ERROR_CODES.invalidCredentials },
      { status: 401 },
    );
  }

  const apiResponse = await fetch(`${apiBaseUrl}/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload: unknown = await apiResponse.json().catch(() => null);

  if (!isSignInApiSuccess(payload)) {
    return NextResponse.json(
      payload ?? { code: AUTH_ERROR_CODES.invalidCredentials },
      {
        status: apiResponse.ok ? 401 : apiResponse.status,
      },
    );
  }

  const response = NextResponse.json({
    ok: true,
    mfa_required: payload.mfa_required === true,
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    payload.session_token,
    sessionCookieOptions,
  );
  return response;
}

function isSignInApiSuccess(payload: unknown): payload is SignInApiSuccess {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true &&
    typeof (payload as { session_token?: unknown }).session_token === "string"
  );
}
