import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("./run.mjs", import.meta.url), "utf8");

test("agent-runtime startup does not rely on generated managed build state", () => {
  const retiredCli = ["m", "d", "a"].join("");
  const legacyBuildDir = [".", retiredCli].join("");
  const legacyDevCommand = new RegExp(
    `\\b${[retiredCli, "dev"].join("\\s+")}\\b`,
    "u",
  );
  const start = source.indexOf("function prepareAgentRuntime()");
  const end = source.indexOf("function stopStaleAgentRuntimeProcesses()");
  assert.ok(start >= 0 && end > start);

  const prepareRuntime = source.slice(start, end);
  assert.match(prepareRuntime, /stopStaleAgentRuntimeProcesses\(\);/u);
  assert.doesNotMatch(prepareRuntime, /mkdirSync/u);
  assert.doesNotMatch(source, /managedAgentPersistenceDir/u);
  assert.doesNotMatch(
    source,
    new RegExp(
      `path\\.join\\(\\s*workerRoot,\\s*["']${legacyBuildDir}["'],\\s*["']build["']`,
      "u",
    ),
  );
  assert.doesNotMatch(source, legacyDevCommand);
});

test("dev supervisor identifies the child that terminates the stack", () => {
  const retiredSandboxMessage = ["LangSmith", "Sandbox", "access"].join(" ");
  assert.ok(
    source.includes(
      "[run] ${member} exited with code ${code}. Stopping remaining processes.",
    ),
  );
  assert.ok(!source.includes(retiredSandboxMessage));
  assert.match(source, /pnpm dev:app/u);
});

test("agent runtime disables LangSmith control-plane env unless explicitly enabled", () => {
  assert.match(source, /function hardenLangSmithEnv\(env\)/u);
  assert.match(source, /LCSP_LANGSMITH_TRACING/u);
  assert.match(source, /LANGGRAPH_CLOUD_LICENSE_KEY/u);
  assert.match(source, /LANGSMITH_TRACING = "false"/u);
  assert.match(source, /LANGCHAIN_TRACING_V2 = "false"/u);
});

test("agent runtime sets explicit local LangGraph concurrency", () => {
  assert.match(source, /LCSP_AGENT_RUNTIME_JOBS_PER_WORKER/u);
  assert.match(source, /--n-jobs-per-worker/u);
  assert.match(source, /resolvePositiveInteger/u);
  assert.match(source, /"8"/u);
});
