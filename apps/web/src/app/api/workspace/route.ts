import { NextRequest } from "next/server";
import { AUTH_ERROR_CODES, WORKSPACE_ERROR_CODES } from "@lcsp/contracts/auth";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";

import { isMockModeEnabled, readMockJson } from "@/lib/server/fixtures/response";
import {
  MOCK_WORKSPACE_COOKIE_NAME,
  type MockDeveloperAccount,
} from "@/lib/server/fixtures/workspace";
import { problemJson, successJson } from "@/lib/server/problem-json";
import {
  readSessionToken,
  requireSessionToken,
} from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  if (isMockModeEnabled()) {
    const sessionToken = readSessionToken(request);
    if (sessionToken === "mock-session:mfa-verify-pending") {
      return problemJson(AUTH_ERROR_CODES.mfaRequired, {
        status: 403,
      });
    }
    if (sessionToken === "mock-session:manager") {
      return successJson(await readMockJson("workspace.json"));
    }

    const selectedWorkspaceId = request.cookies.get(
      MOCK_WORKSPACE_COOKIE_NAME,
    )?.value;
    if (!selectedWorkspaceId) {
      return problemJson(WORKSPACE_ERROR_CODES.selectionRequired, {
        status: 409,
      });
    }

    const account = await readMockJson<MockDeveloperAccount>(
      "developer-account.json",
    );
    const selectedWorkspace = account.workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    );
    if (!selectedWorkspace) {
      return problemJson(WORKSPACE_ERROR_CODES.selectionRequired, {
        status: 409,
      });
    }

    return successJson({
      organization: selectedWorkspace,
      membership: { role: SUBJECT_ROLES.developer },
      granted_actions: [
        PBAC_ACTIONS.assessmentList,
        PBAC_ACTIONS.assessmentRead,
        PBAC_ACTIONS.wizardWrite,
        PBAC_ACTIONS.wizardSubmit,
        PBAC_ACTIONS.conflictRead,
        PBAC_ACTIONS.evidenceRead,
        PBAC_ACTIONS.documentRead,
        PBAC_ACTIONS.workspaceRead,
      ],
    });
  }

  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const upstream = await upstreamRequest("/workspace", {
    bearerToken: session.token,
  });
  return upstreamJson(upstream);
}
