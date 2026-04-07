#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const isWin = process.platform === "win32";
const cliArgs = process.argv.slice(2);

function argValue(flag, fallback) {
  const i = cliArgs.indexOf(flag);
  if (i >= 0 && i + 1 < cliArgs.length) {
    return cliArgs[i + 1];
  }
  return fallback;
}

const backendUrl = argValue("--backend-url", "http://10.0.2.2:3001");

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function candidatePaths(tool) {
  if (tool === "node") {
    return isWin
      ? ["C:\\Program Files\\nodejs\\node.exe"]
      : ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/usr/bin/node"];
  }

  if (tool === "npm") {
    return isWin
      ? ["C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\npm.exe"]
      : ["/usr/local/bin/npm", "/opt/homebrew/bin/npm", "/usr/bin/npm"];
  }

  if (tool === "adb") {
    if (isWin) {
      const local = process.env.LOCALAPPDATA || "";
      return [path.join(local, "Android", "Sdk", "platform-tools", "adb.exe")];
    }
    return [
      "/usr/local/bin/adb",
      "/opt/homebrew/bin/adb",
      "/usr/bin/adb",
      path.join(process.env.HOME || "", "Library", "Android", "sdk", "platform-tools", "adb"),
      path.join(process.env.HOME || "", "Android", "Sdk", "platform-tools", "adb"),
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
    if (candidate && existsSync(candidate)) {
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

function run(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      stdio: "inherit",
      shell: false,
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

function parseEnv(content) {
  const map = new Map();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function writeEnvFile(envPath, vars) {
  const lines = [
    `EXPO_PUBLIC_BACKEND_URL=${vars.get("EXPO_PUBLIC_BACKEND_URL") || backendUrl}`,
    `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=${vars.get("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN") || "your_mapbox_public_token_here"}`,
    `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=${vars.get("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY") || "pk_test_your_stripe_publishable_key"}`,
  ];
  writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  log("Checking required tools...");
  const nodePath = which("node");
  const npmPath = which("npm");
  const adbPath = which("adb");

  if (!nodePath) fail("Required command 'node' was not found in PATH.");
  if (!npmPath) fail("Required command 'npm' was not found in PATH.");
  if (!adbPath) fail("Required command 'adb' was not found in PATH.");

  injectToolBin(nodePath);
  injectToolBin(npmPath);
  injectToolBin(adbPath);

  const repoRoot = path.resolve(__dirname, "..");
  const mobileDir = path.join(repoRoot, "codepop");
  const envPath = path.join(mobileDir, ".env.local");

  log("Writing emulator-safe mobile env file...");
  const existingVars = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : new Map();
  existingVars.set("EXPO_PUBLIC_BACKEND_URL", backendUrl);
  writeEnvFile(envPath, existingVars);

  log("Installing mobile dependencies...");
  await run(npmPath, ["install"], mobileDir);

  log("Starting Expo Android app...");
  await run(npmPath, ["run", "android"], mobileDir);
}

main().catch((error) => fail(String(error.message || error)));
