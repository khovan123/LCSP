import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./lib/session/session-store";
import { getWorkspaceRouteRedirectPath } from "./workspace-route-middleware.ts";

export function proxy(request: NextRequest) {
  const redirectPath = getWorkspaceRouteRedirectPath({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value),
  });

  if (!redirectPath) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}

export const config = {
  matcher: [
    "/workspace/:path*",
    "/assessments/:path*",
    "/developer/assessments/:path*",
  ],
};
