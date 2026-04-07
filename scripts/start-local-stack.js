#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");

const isWin = process.platform === "win32";
const args = new Set(process.argv.slice(2));
const detached = !args.has("--foreground");
const skipBuild = args.has("--skip-build");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function candidatePaths(tool) {
  if (tool === "docker") {
    return isWin
      ? [
          "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
          "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker",
        ]
      : ["/usr/local/bin/docker", "/opt/homebrew/bin/docker", "/usr/bin/docker"];
  }

  if (tool === "docker-compose") {
    return isWin
      ? [
          "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe",
          "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose",
        ]
      : [
          "/usr/local/bin/docker-compose",
          "/opt/homebrew/bin/docker-compose",
          "/usr/bin/docker-compose",
        ];
  }

  return [];
}

function which(tool) {
  const command = isWin ? "where" : "which";
  const result = spawnSync(command, [tool], { encoding: "utf8" });
  if (result.status === 0) {
    const lines = String(result.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      return lines[0];
    }
  }

  for (const candidate of candidatePaths(tool)) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function injectToolBin(toolPath) {
  const toolDir = path.dirname(toolPath);
  const delimiter = path.delimiter;
  const current = process.env.PATH || "";
  const parts = current.split(delimiter);
  if (!parts.includes(toolDir)) {
    process.env.PATH = `${toolDir}${delimiter}${current}`;
  }
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}`));
      }
    });
  });
}

function runCapture(command, commandArgs) {
  return spawnSync(command, commandArgs, { encoding: "utf8" });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitDockerDaemon(dockerPath, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = runCapture(dockerPath, ["info"]);
    if (result.status === 0) {
      return true;
    }
    await sleep(3000);
  }
  return false;
}

function startDockerDesktopIfAvailable() {
  if (!isWin) {
    return;
  }

  const desktopExe = "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
  if (!existsSync(desktopExe)) {
    return;
  }

  spawn(desktopExe, [], {
    detached: true,
    stdio: "ignore",
    shell: false,
  }).unref();
}

function detectComposeMode(dockerPath, dockerComposePath) {
  const pluginCheck = runCapture(dockerPath, ["compose", "version"]);
  if (pluginCheck.status === 0) {
    return { kind: "plugin", command: dockerPath };
  }

  if (dockerComposePath) {
    return { kind: "standalone", command: dockerComposePath };
  }

  fail("Neither 'docker compose' plugin nor 'docker-compose' command is available.");
}

function pingUrl(url) {
  const client = url.startsWith("https") ? https : http;
  return new Promise((resolve) => {
    const req = client.get(url, { timeout: 5000 }, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 500;
      res.resume();
      resolve(ok);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitHttp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await pingUrl(url)) {
      log(`[ok] ${url}`);
      return true;
    }
    await sleep(2000);
  }
  log(`[timeout] ${url} did not respond`);
  return false;
}

async function main() {
  log("Checking required tools...");
  const dockerPath = which("docker");
  if (!dockerPath) {
    fail("Required command 'docker' was not found in PATH.");
  }
  injectToolBin(dockerPath);

  const dockerComposePath = which("docker-compose");
  if (dockerComposePath) {
    injectToolBin(dockerComposePath);
  }

  log("Ensuring Docker daemon is running...");
  let ready = await waitDockerDaemon(dockerPath, 10_000);
  if (!ready) {
    startDockerDesktopIfAvailable();
    ready = await waitDockerDaemon(dockerPath, 180_000);
  }
  if (!ready) {
    fail("Docker daemon did not become ready. Open Docker Desktop (or start your daemon) and retry.");
  }

  const compose = detectComposeMode(dockerPath, dockerComposePath);
  const upArgs = ["up"];
  if (detached) upArgs.push("-d");
  if (!skipBuild) upArgs.push("--build");

  log("Starting local stack via docker compose...");
  if (compose.kind === "plugin") {
    await run(compose.command, ["compose", ...upArgs]);
  } else {
    await run(compose.command, upArgs);
  }

  log("Waiting for local services to respond...");
  const [bootstrapReady, peerReady, djangoReady] = await Promise.all([
    waitHttp("http://localhost:3000/peers/stats", 120_000),
    waitHttp("http://localhost:3001/peers/stats", 120_000),
    waitHttp("http://localhost:8000/admin/", 120_000),
  ]);

  log("Container status:");
  if (compose.kind === "plugin") {
    await run(compose.command, ["compose", "ps"]);
  } else {
    await run(compose.command, ["ps"]);
  }

  if (bootstrapReady && peerReady && djangoReady) {
    log("Local stack is ready for emulator testing.");
    log("Android emulator backend URL: http://10.0.2.2:3001");
    process.exit(0);
  }

  fail("One or more services did not become healthy. Check logs with: docker compose logs -f");
}

main().catch((error) => fail(String(error.message || error)));
