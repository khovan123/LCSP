import { NextResponse } from "next/server";

const apiBaseUrl = process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const provider = requestUrl.searchParams.get("provider") ?? "github";
  const destination = new URL("/auth/oauth/start", apiBaseUrl);
  destination.searchParams.set("provider", provider);
  return NextResponse.redirect(destination);
}
