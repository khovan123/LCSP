import { execFileSync } from "node:child_process";
import net from "node:net";

const containerName = "lcsp-api-test-postgres";
const image = "postgres:16-alpine";

/**
 * @param {string[]} args
 * @param {import("node:child_process").ExecFileSyncOptions} [options]
 * @returns {string}
 */
function run(args, options = {}) {
  const output = execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  return output.toString().trim();
}

function containerStatus() {
  const output = run([
    "ps",
    "-a",
    "--filter",
    `name=^/${containerName}$`,
    "--format",
    "{{.Status}}",
  ]);

  return output;
}

function ensureContainer() {
  const status = containerStatus();
  if (!status) {
    run([
      "run",
      "--name",
      containerName,
      "-e",
      "POSTGRES_USER=postgres",
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=lcsp_api_test",
      "-p",
      "127.0.0.1:54322:5432",
      "-d",
      image,
    ]);
    return;
  }

  if (!status.startsWith("Up ")) {
    run(["start", containerName]);
  }
}

/**
 * @param {number} port
 * @param {string} host
 */
function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
}

function waitUntilReady() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      run([
        "exec",
        containerName,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "lcsp_api_test",
      ]);
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }

  throw new Error("PostgreSQL test container did not become ready in time");
}

if (!(await isPortOpen(54322, "127.0.0.1"))) {
  ensureContainer();
  waitUntilReady();
}
