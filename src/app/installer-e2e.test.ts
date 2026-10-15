import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { zipSync } from "fflate";
import { readTree } from "../infrastructure/fs-tree";
import { renderNodeFiles } from "./render-templates";

const NODE = "demo";
const REPO = "jotredev/forge614-demo";
const VERSION = "1.0.0";
const onWindows = process.platform === "win32";
const root = process.cwd();
const nodeBinary = Bun.which("node");
const tempDirs: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Create an isolated directory for one fake release and installation. */
function tempDir(prefix: string): string {
  const path = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

/** Return the GNU SHA256SUMS line for a named byte sequence. */
function sum(name: string, bytes: Buffer): string {
  return `${createHash("sha256").update(bytes).digest("hex")}  ${name}\n`;
}

/** Build a minimal USTAR file for the real tar.gz extraction path. */
function tarEntry(name: string, bytes: Buffer): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000755\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(`${bytes.length.toString(8).padStart(11, "0")}\0`, 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header[156] = 48;
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  const checksum = header.reduce((total, byte) => total + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  const padding = Buffer.alloc((512 - (bytes.length % 512)) % 512);
  return Buffer.concat([header, bytes, padding, Buffer.alloc(1024)]);
}

/** Build one fake release containing a platform launcher, pointer, and GNU checksum manifest. */
function fakeRelease(version: string, options: { badHash?: boolean; failSmoke?: boolean; pathModify?: boolean; dependencies?: object[]; minimumVersion?: string; assetType?: "raw-binary" | "binary-tar-gzip-or-zip" } = {}, nodeName = NODE, repository = REPO) {
  const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const assetType = options.assetType ?? "raw-binary";
  const archiveSuffix = os === "windows" ? ".zip" : ".tar.gz";
  const asset = `forge614-${nodeName}-${os}-${arch}${assetType === "raw-binary" ? ".cmd" : archiveSuffix}`;
  const executable = Buffer.from(
    process.platform === "win32"
      ? `@echo off\r\nif "%1"=="uninstall" if "%2"=="--self" echo called>"%FORGE614_TEST_UNINSTALL_MARKER%"\r\n${options.failSmoke ? "exit /b 1" : `echo forge614-${nodeName} ${version}`}\r\n`
      : options.failSmoke ? "#!/bin/sh\nexit 1\n" : `#!/bin/sh\nif [ "$1" = uninstall ] && [ "$2" = --self ]; then printf called > "$FORGE614_TEST_UNINSTALL_MARKER"; exit 0; fi\nprintf '%s\\n' 'forge614-${nodeName} ${version}'\n`,
    "utf8",
  );
  const pointer = Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      node: nodeName,
      install: {
        repository,
        minimumNodeVersion: options.minimumVersion ?? "22.19.0",
        systems: [
          { os: "darwin", architectures: ["arm64", "x64"] },
          { os: "linux", architectures: ["arm64", "x64"] },
          { os: "windows", architectures: ["x64"] },
        ],
        tagFormat: "vX.Y.Z",
        asset: { type: assetType, pattern: `forge614-${nodeName}-<plat>-<arch>${assetType === "raw-binary" ? ".cmd" : ".tar.gz|.zip"}`, checksumFile: "SHA256SUMS" },
        dependencies: options.dependencies ?? [],
        path: { modify: options.pathModify ?? false, retireWhen: options.pathModify ? "test retirement" : null },
        smokeTest: ["--version"],
      },
    }),
  );
  const installer = readFileSync(join(root, "standard/templates/install.mjs"));
  const rendered = renderNodeFiles(readTree(join(root, "standard/templates")), {
    pointer: { node: nodeName, install: { repository } },
    NODE_TITLE: nodeName,
    STANDARD_VERSION: "1.2.0",
  });
  const installSh = Buffer.from(rendered["install.sh"] ?? "");
  const installPs1 = Buffer.from(rendered["install.ps1"] ?? "");
  const launcherName = process.platform === "win32" ? `forge614-${nodeName}.cmd` : `forge614-${nodeName}`;
  const assetBytes = assetType === "raw-binary"
    ? executable
    : process.platform === "win32"
      ? Buffer.from(zipSync({ [launcherName]: executable }))
      : gzipSync(tarEntry(launcherName, executable));
  const assetSum = sum(asset, assetBytes);
  const badAssetSum = `${assetSum[0] === "0" ? "1" : "0"}${assetSum.slice(1)}`;
  const files = new Map([
    [asset, assetBytes],
    ["forge614.node.json", pointer],
    ["install.mjs", installer],
    ["install.sh", installSh],
    ["install.ps1", installPs1],
  ]) as Map<string, Buffer>;
  const sums = Buffer.from(`${options.badHash ? badAssetSum : assetSum}${sum("forge614.node.json", pointer)}${sum("install.mjs", installer)}${sum("install.sh", installSh)}${sum("install.ps1", installPs1)}`);
  files.set("SHA256SUMS", sums);
  return { files, asset };
}

/** Start an asynchronous loopback server with mutable latest-release metadata. */
async function fakeReleaseServer(): Promise<{ baseUrl: string; publish: typeof fakeRelease; setLatest: (version: string, repository?: string) => void; requests: Map<string, number> }> {
  const releases = new Map<string, Map<string, Buffer>>();
  const latest = new Map<string, string>([[REPO, VERSION]]);
  const requests = new Map<string, number>();
  const publish = (version: string, options: Parameters<typeof fakeRelease>[1] = {}, repository = REPO, nodeName = repository.split("forge614-")[1] ?? NODE) => {
    const release = fakeRelease(version, options, nodeName, repository);
    releases.set(`${repository}@v${version}`, release.files);
    if (!latest.has(repository)) latest.set(repository, version);
    return release;
  };
  publish(VERSION);
  const server = createServer((request, response) => {
    const latestMatch = /^\/repos\/([^/]+\/[^/]+)\/releases\/latest$/.exec(request.url ?? "");
    if (latestMatch) {
      const repository = latestMatch[1] ?? REPO;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ tag_name: `v${latest.get(repository) ?? VERSION}` }));
      return;
    }
    const parts = request.url?.split("/") ?? [];
    const file = decodeURIComponent(parts.at(-1) ?? "");
    const tag = decodeURIComponent(parts.at(-2) ?? "");
    const repository = `${parts[2] ?? ""}/${parts[3] ?? ""}`;
    requests.set(file, (requests.get(file) ?? 0) + 1);
    const bytes = releases.get(`${repository}@${tag}`)?.get(file);
    if (!bytes) {
      response.statusCode = 404;
      response.end("missing");
      return;
    }
    response.end(bytes);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("local test server did not bind TCP");
  return { baseUrl: `http://127.0.0.1:${address.port}`, publish, setLatest: (version, repository = REPO) => { latest.set(repository, version); }, requests };
}

/** Run install.mjs with the real Node executable and an isolated Forge home. */
async function runInstaller(home: string, baseUrl: string, args: string[] = [], overrides: Record<string, string> = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  if (!nodeBinary) throw new Error("Node.js is required for installer end-to-end tests");
  const script = join(root, "standard/templates/install.mjs");
  return await new Promise((resolve, reject) => {
    const child = spawn(nodeBinary, [script, ...args], {
      env: {
        ...process.env,
        HOME: home,
        FORGE614_HOME: join(home, ".forge614"),
        FORGE614_INSTALL_TEST_BASE_URL: baseUrl,
        FORGE614_INSTALL_REPOSITORY: REPO,
        FORGE614_INSTALL_NODE: NODE,
        ...overrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), 10_000);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

/** Run a gatekeeper process asynchronously and enforce a per-case timeout. */
async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
  });
}

/** Register an installer case with a progress line and a bounded test duration. */
function installerCase(name: string, operation: () => void | Promise<void>, skip = false): void {
  if (skip) {
    test.skip(`${name} (skipped: POSIX shell is unavailable)`, operation);
    return;
  }
  test(name, async () => {
    process.stdout.write(`[installer-e2e] ${name}\n`);
    await operation();
  }, 120_000);
}

/** Render the shared POSIX gatekeeper into a temporary file for a real invocation. */
function renderedShellGatekeeper(home: string): string {
  const files = renderNodeFiles(readTree("standard/templates"), {
    pointer: { node: NODE, install: { repository: REPO } }, NODE_TITLE: "Demo", STANDARD_VERSION: "1.2.0",
  });
  const path = join(home, "install.sh");
  writeFileSync(path, files["install.sh"] ?? "", { mode: 0o755 });
  chmodSync(path, 0o755);
  return path;
}

/** Render the shared PowerShell gatekeeper into a temporary script. */
function renderedPowerShellGatekeeper(home: string): string {
  const files = renderNodeFiles(readTree("standard/templates"), {
    pointer: { node: NODE, install: { repository: REPO } }, NODE_TITLE: "Demo", STANDARD_VERSION: "1.2.0",
  });
  const path = join(home, "install.ps1");
  writeFileSync(path, files["install.ps1"] ?? "");
  return path;
}

installerCase("standard:render copies install.mjs byte for byte", () => {
  const files = renderNodeFiles(readTree("standard/templates"), {
    pointer: { node: NODE, install: { repository: REPO } },
    NODE_TITLE: "Demo",
    STANDARD_VERSION: "1.2.0",
  });
  expect(Buffer.from(files["install.mjs"] ?? "").equals(readFileSync("standard/templates/install.mjs"))).toBe(true);
});

installerCase("a new local release installs to a version directory and passes its smoke test", async () => {
  const { baseUrl } = await fakeReleaseServer();
  const home = tempDir("forge614-install-home-");
  const result = await runInstaller(home, baseUrl);
  const nodeHome = join(home, ".forge614", NODE);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(nodeHome, ".active-version"), "utf8").trim()).toBe(VERSION);
  const launcher = process.platform === "win32" ? "forge614-demo.cmd" : "forge614-demo";
  expect(readFileSync(join(nodeHome, VERSION, launcher), "utf8")).toContain("forge614-demo 1.0.0");
  expect(readdirSync(nodeHome).some((entry) => entry.startsWith(".active-version."))).toBe(false);
});

installerCase("a platform archive resolves and installs from tar.gz or ZIP", async () => {
  const server = await fakeReleaseServer();
  server.publish(VERSION, { assetType: "binary-tar-gzip-or-zip" });
  const home = tempDir("forge614-install-archive-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  const launcher = process.platform === "win32" ? "forge614-demo.cmd" : "forge614-demo";
  expect(readFileSync(join(home, ".forge614", NODE, VERSION, launcher), "utf8")).toContain("forge614-demo 1.0.0");
});

installerCase("the same version is a no-op unless --force is supplied", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-repeat-");
  expect((await runInstaller(home, server.baseUrl)).code).toBe(0);
  const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const assetName = `forge614-demo-${os}-${arch}.cmd`;
  const downloadsBefore = server.requests.get(assetName);
  const same = await runInstaller(home, server.baseUrl);
  expect(same.code, same.stderr).toBe(0);
  expect(same.stdout).toContain("ya está al día");
  expect(server.requests.get(assetName)).toBe(downloadsBefore);
  const forced = await runInstaller(home, server.baseUrl, ["--force"]);
  expect(forced.code, forced.stderr).toBe(0);
  expect(server.requests.get(assetName)).toBe((downloadsBefore ?? 0) + 1);
});

installerCase("an update activates the new version and retains the previous version", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-update-");
  expect((await runInstaller(home, server.baseUrl)).code).toBe(0);
  server.publish("1.1.0");
  server.setLatest("1.1.0");
  const update = await runInstaller(home, server.baseUrl);
  const nodeHome = join(home, ".forge614", NODE);
  expect(update.code, update.stderr).toBe(0);
  expect(update.stdout).toContain("se actualizó de 1.0.0 a 1.1.0");
  expect(readFileSync(join(nodeHome, ".active-version"), "utf8").trim()).toBe("1.1.0");
  expect(existsSync(join(nodeHome, "1.0.0"))).toBe(true);
  expect(existsSync(join(nodeHome, "1.1.0"))).toBe(true);
});

installerCase("a bad active checksum returns 66 before creating the node directory", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { badHash: true });
  server.setLatest("1.0.0");
  const home = tempDir("forge614-install-bad-hash-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614", NODE))).toBe(false);
});

installerCase("a failing smoke test restores the previous version and removes the staged version", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-smoke-rollback-");
  expect((await runInstaller(home, server.baseUrl)).code).toBe(0);
  server.publish("1.1.0", { failSmoke: true });
  server.setLatest("1.1.0");
  const result = await runInstaller(home, server.baseUrl);
  const nodeHome = join(home, ".forge614", NODE);
  expect(result.code).toBe(65);
  expect(readFileSync(join(nodeHome, ".active-version"), "utf8").trim()).toBe("1.0.0");
  expect(existsSync(join(nodeHome, "1.0.0"))).toBe(true);
  expect(existsSync(join(nodeHome, "1.1.0"))).toBe(false);
});

installerCase("PATH modification is idempotent when enabled and absent when disabled", async () => {
  const enabled = await fakeReleaseServer();
  enabled.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-");
  expect((await runInstaller(home, enabled.baseUrl)).code).toBe(0);
  const profile = process.platform === "win32"
    ? join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1")
    : join(home, ".profile");
  expect(readFileSync(profile, "utf8").match(/>>> forge614-demo PATH >>>/g)?.length).toBe(1);
  expect((await runInstaller(home, enabled.baseUrl, ["--force"])).code).toBe(0);
  expect(readFileSync(profile, "utf8").match(/>>> forge614-demo PATH >>>/g)?.length).toBe(1);

  const disabled = await fakeReleaseServer();
  const otherHome = tempDir("forge614-install-no-path-");
  expect((await runInstaller(otherHome, disabled.baseUrl)).code).toBe(0);
  const disabledProfile = process.platform === "win32"
    ? join(otherHome, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1")
    : join(otherHome, ".profile");
  expect(existsSync(disabledProfile)).toBe(false);
});

installerCase("a flat launcher is retained in a legacy folder during migration", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-migration-");
  const oldLauncher = join(home, ".forge614", NODE, "bin", `forge614-demo${process.platform === "win32" ? ".exe" : ""}`);
  mkdirSync(join(home, ".forge614", NODE, "bin"), { recursive: true });
  writeFileSync(oldLauncher, process.platform === "win32" ? "legacy" : "#!/bin/sh\necho legacy\n", { mode: 0o755 });
  const result = await runInstaller(home, server.baseUrl);
  const nodeHome = join(home, ".forge614", NODE);
  expect(result.code, result.stderr).toBe(0);
  const legacyDir = readdirSync(nodeHome).find((entry) => entry.startsWith("legacy-"));
  expect(legacyDir).toBeDefined();
  expect(existsSync(join(nodeHome, legacyDir ?? "", oldLauncher.split(/[\\/]/).at(-1) ?? ""))).toBe(true);
});

installerCase("--uninstall removes only the node home after its self-uninstall hook", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-uninstall-");
  expect((await runInstaller(home, server.baseUrl)).code).toBe(0);
  const protectedFile = join(home, ".forge614", "other-node", "keep.txt");
  mkdirSync(join(home, ".forge614", "other-node"), { recursive: true });
  writeFileSync(protectedFile, "keep");
  const marker = join(home, "uninstall-hook-called");
  const result = await runInstaller(home, server.baseUrl, ["--uninstall"], { FORGE614_TEST_UNINSTALL_MARKER: marker });
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(marker, "utf8")).toBe("called");
  expect(existsSync(join(home, ".forge614", NODE))).toBe(false);
  expect(readFileSync(protectedFile, "utf8")).toBe("keep");
});

installerCase("empty and relative FORGE614_HOME values return 64", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-home-invalid-");
  expect((await runInstaller(home, server.baseUrl, [], { FORGE614_HOME: "" })).code).toBe(64);
  const relative = await runInstaller(home, server.baseUrl, [], { FORGE614_HOME: "relative/path" });
  expect(relative.code).toBe(64);
  expect(relative.stderr).toContain("INVALID_FORGE614_HOME");
});

installerCase("messages honor FORGE614_LOCALE and the legacy locale fallback", async () => {
  const english = await fakeReleaseServer();
  const englishHome = tempDir("forge614-install-locale-en-");
  const resultEn = await runInstaller(englishHome, english.baseUrl, [], { FORGE614_LOCALE: "en" });
  expect(resultEn.code).toBe(0);
  expect(resultEn.stdout).toContain("was installed at");

  const legacy = await fakeReleaseServer();
  const legacyHome = tempDir("forge614-install-locale-legacy-");
  const resultLegacy = await runInstaller(legacyHome, legacy.baseUrl, [], { FORGE614_SHELL_LOCALE: "en" });
  expect(resultLegacy.code).toBe(0);
  expect(resultLegacy.stdout).toContain("was installed at");
});

installerCase("a missing dependency installs from its own verified release before the requesting node", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("1.0.0", {}, shellRepo, "shell");
  server.publish("1.0.0", {
    dependencies: [{ node: "shell", minimumVersion: "1.0.0", requiredCapabilities: [], compatibility: "version" }],
  });
  const home = tempDir("forge614-install-dependency-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", "shell", ".active-version"), "utf8").trim()).toBe("1.0.0");
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
});

installerCase("--help prints localized usage without contacting a release", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-help-");
  const result = await runInstaller(home, server.baseUrl, ["--help"]);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("Uso: install.mjs");
  expect(server.requests.size).toBe(0);
  expect(existsSync(join(home, ".forge614"))).toBe(false);
});

installerCase("a dependency asset with a bad checksum returns 66 without activating the requesting node", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("1.0.0", { badHash: true }, shellRepo, "shell");
  server.publish("1.0.0", {
    dependencies: [{ node: "shell", minimumVersion: "1.0.0", requiredCapabilities: [], compatibility: "version" }],
  });
  const home = tempDir("forge614-install-dependency-hash-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614", NODE))).toBe(false);
});

installerCase("a dependency below the declared minimum returns 69 without activating the requester", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("0.5.0", {}, shellRepo, "shell");
  server.setLatest("0.5.0", shellRepo);
  server.publish("1.0.0", {
    dependencies: [{ node: "shell", minimumVersion: "1.0.0", requiredCapabilities: [], compatibility: "version" }],
  });
  const home = tempDir("forge614-install-dependency-minimum-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(69);
  expect(existsSync(join(home, ".forge614", NODE))).toBe(false);
});

installerCase("POSIX gatekeeper returns 65 without Node and changes no files", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-no-node-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script], {
    ...process.env, HOME: home, FORGE614_HOME: join(home, ".forge614"), PATH: "", FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  });
  expect(result.code).toBe(65);
  expect(result.stderr).toContain("Forge614 necesita Node.js 22.19.0 o posterior");
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, onWindows);

installerCase("POSIX gatekeeper verifies a local release and forwards arguments", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-node-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script, "--version", "1.0.0"], {
    ...process.env, HOME: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  });
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, onWindows);

const powershell51 = Bun.which("powershell.exe");
const pwsh = Bun.which("pwsh");
const powershell51Reason = powershell51 === null ? " (skipped: Windows PowerShell 5.1 is unavailable)" : "";
const pwshReason = pwsh === null ? " (skipped: pwsh is unavailable)" : "";

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 gatekeeper verifies a release and forwards arguments${powershell51Reason}`, async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-ps51-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "1.0.0"], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 gatekeeper without Node returns 65 without changing files${powershell51Reason}`, async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-ps51-no-node-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), PATH: "", FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code).toBe(65);
  expect(result.stderr).toContain("Forge614 necesita Node.js 22.19.0 o posterior");
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, 60_000);

test.skipIf(pwsh === null)(`pwsh gatekeeper verifies a release and forwards arguments${pwshReason}`, async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-pwsh-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(pwsh as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "1.0.0"], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, 60_000);
