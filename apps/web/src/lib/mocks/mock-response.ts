import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export function isMockModeEnabled(): boolean {
  return process.env.LCSP_USE_MOCKS === "true";
}

export async function mockJsonResponse(
  filename: string,
): Promise<NextResponse | null> {
  if (!isMockModeEnabled()) {
    return null;
  }

  return NextResponse.json(await readMockJson(filename));
}

export async function readMockJson<T = unknown>(filename: string): Promise<T> {
  const filePath = path.join(
    process.cwd(),
    "src",
    "public",
    "assets",
    "mocks",
    filename,
  );
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
