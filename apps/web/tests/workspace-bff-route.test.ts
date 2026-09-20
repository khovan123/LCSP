import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

test("workspace BFF route requests upstream /auth/profile instead of deleted /workspace", async () => {
  const source = await read("../src/app/api/workspace/route.ts");
  assert.equal(source.includes('upstreamRequest("/auth/profile"'), true);
  assert.equal(source.includes('upstreamRequest("/workspace"'), false);
});
