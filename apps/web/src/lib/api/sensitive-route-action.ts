import { checkSensitiveRoute } from "./auth-client";

type SensitiveRouteActionInput = {
  method: string;
  path: string;
  onReauthRequired: () => void;
  onAllowed: () => void | Promise<void>;
};

export async function runSensitiveRouteAction(
  input: SensitiveRouteActionInput,
): Promise<void> {
  const routeCheck = await checkSensitiveRoute({
    method: input.method,
    path: input.path,
  });

  if (routeCheck.is_sensitive && routeCheck.reauth_required) {
    input.onReauthRequired();
    return;
  }

  await input.onAllowed();
}
