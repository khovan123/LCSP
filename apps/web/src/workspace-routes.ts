import { AUTH_ERROR_CODES, type AppProblem } from "@lcsp/contracts/auth";
import { buildBlockedAuthViewModel, PUBLIC_ENTRY_ROUTES } from "./auth-entry.ts";

type WorkspaceRouteInput = {
  apiWorkspaceResult?: {
    ok: true | false;
    problem?: AppProblem;
    workspace?: unknown;
    capabilities?: Record<string, unknown>;
  };
  clientCapabilities?: Record<string, unknown>;
};

export function resolveProtectedWorkspaceRoute({ apiWorkspaceResult, clientCapabilities = {} }: WorkspaceRouteInput) {
  if (!apiWorkspaceResult?.ok) {
    const shouldRedirect =
      apiWorkspaceResult?.problem?.code === AUTH_ERROR_CODES.authRequired ||
      apiWorkspaceResult?.problem?.code === AUTH_ERROR_CODES.sessionInvalid;

    return {
      redirect: shouldRedirect ? PUBLIC_ENTRY_ROUTES.signIn : null,
      render_workspace: false,
      workspace_payload: null,
      blocked_state: buildBlockedAuthViewModel(apiWorkspaceResult as Parameters<typeof buildBlockedAuthViewModel>[0])
    };
  }

  return {
    redirect: null,
    render_workspace: true,
    workspace_payload: apiWorkspaceResult.workspace,
    capabilities: {
      ...clientCapabilities,
      ...apiWorkspaceResult.capabilities
    }
  };
}
