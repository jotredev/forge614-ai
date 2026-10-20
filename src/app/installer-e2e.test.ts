import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
function tarEntry(name: string, bytes: Buffer, type = 48, end = true): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write("0000755\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(`${bytes.length.toString(8).padStart(11, "0")}\0`, 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header[156] = type;
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  const checksum = header.reduce((total, byte) => total + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  const padding = Buffer.alloc((512 - (bytes.length % 512)) % 512);
  return Buffer.concat([header, bytes, padding, end ? Buffer.alloc(1024) : Buffer.alloc(0)]);
}

/** Replace one published release asset and keep the fake GNU manifest consistent. */
function replaceAsset(release: ReturnType<typeof fakeRelease>, bytes: Buffer): void {
  const oldSums = release.files.get("SHA256SUMS")!.toString("utf8").split(/\r?\n/).filter(Boolean);
  const otherEntries = oldSums.filter((line) => !line.endsWith(`  ${release.asset}`));
  release.files.set(release.asset, bytes);
  release.files.set("SHA256SUMS", Buffer.from([sum(release.asset, bytes).trimEnd(), ...otherEntries].join("\n") + "\n"));
}

/** Build one fake release containing a platform launcher, pointer, and GNU checksum manifest. */
function fakeRelease(version: string, options: { badHash?: boolean; badInstallerHash?: boolean; badCapabilities?: boolean; failSmoke?: boolean; wrongSmokeOutput?: boolean; wrongNodeName?: boolean; failPublishedSmoke?: boolean; failUninstall?: boolean; pathModify?: boolean; unsupportedSystem?: boolean; dependencies?: object[]; minimumVersion?: string; assetType?: "raw-binary" | "binary-tar-gzip" | "binary-tar-gzip-or-zip"; launcherExtension?: "exe" | "cmd" } = {}, nodeName = NODE, repository = REPO) {
  const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const assetType = options.assetType ?? "raw-binary";
  const archiveSuffix = os === "windows" ? ".zip" : ".tar.gz";
  const launcherExtension = options.launcherExtension ?? "cmd";
  const asset = `forge614-${nodeName}-${os}-${arch}${assetType === "raw-binary" ? `.${launcherExtension}` : archiveSuffix}`;
  const executable = process.platform === "win32" && launcherExtension === "exe"
    ? readFileSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe"))
    : Buffer.from(
    process.platform === "win32"
      ? `@echo off\r\nif "%1"=="uninstall" if "%2"=="--self" ( ${options.failUninstall ? "exit /b 1" : "echo called>\"%FORGE614_TEST_UNINSTALL_MARKER%\""} & exit /b 0 )\r\nif "%1"=="capabilities" if "%2"=="--agent" ( echo ${options.badCapabilities ? "not-json" : "{\"schemaVersion\":1,\"id\":\"claude-code\",\"label\":\"Claude Code\",\"supportsMcp\":true,\"supportsHooks\":true,\"supportsHeadlessExec\":true,\"supportsReasoningLevel\":true,\"supportsReadOnly\":true,\"fullySupported\":true}"} & exit /b 0 )\r\n${options.failSmoke ? "exit /b 1" : options.failPublishedSmoke ? `echo %~dp0 | findstr /i "bin" >nul && exit /b 1` : `echo forge614-${options.wrongNodeName ? "wrong" : nodeName} ${options.wrongSmokeOutput ? "9.9.9" : version}`}\r\n`
      : options.failSmoke ? "#!/bin/sh\nexit 1\n" : `#!/bin/sh\nif [ "$1" = uninstall ] && [ "$2" = "--self" ]; then ${options.failUninstall ? "exit 1" : 'printf called > "$FORGE614_TEST_UNINSTALL_MARKER"; exit 0'}; fi\nif [ "$1" = capabilities ] && [ "$2" = "--agent" ]; then printf '%s\\n' '${options.badCapabilities ? "not-json" : "{\"schemaVersion\":1,\"id\":\"claude-code\",\"label\":\"Claude Code\",\"supportsMcp\":true,\"supportsHooks\":true,\"supportsHeadlessExec\":true,\"supportsReasoningLevel\":true,\"supportsReadOnly\":true,\"fullySupported\":true}"}'; exit 0; fi\n${options.failPublishedSmoke ? 'case "$0" in */bin/*) exit 1;; esac\n' : ""}printf '%s\\n' 'forge614-${options.wrongNodeName ? "wrong" : nodeName} ${options.wrongSmokeOutput ? "9.9.9" : version}'\n`,
    "utf8",
  );
  const pointer = Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      node: nodeName,
      install: {
        repository,
        minimumNodeVersion: options.minimumVersion ?? "22.19.0",
        systems: options.unsupportedSystem ? [] : [
          { os: "darwin", architectures: ["arm64", "x64"] },
          { os: "linux", architectures: ["arm64", "x64"] },
          { os: "windows", architectures: ["x64"] },
        ],
        tagFormat: "vX.Y.Z",
        asset: { type: assetType, pattern: `forge614-${nodeName}-<plat>-<arch>${assetType === "raw-binary" ? `.${launcherExtension}` : assetType === "binary-tar-gzip" ? ".tar.gz" : ".tar.gz|.zip"}`, checksumFile: "SHA256SUMS" },
        dependencies: options.dependencies ?? [],
        path: { modify: options.pathModify ?? false, retireWhen: options.pathModify ? "test retirement" : null },
      smokeTest: process.platform === "win32" && launcherExtension === "exe" ? ["/c", `echo forge614-${nodeName} ${version}`] : ["--version"],
      },
    }),
  );
  const installerSource = readFileSync(join(root, "standard/templates/install.mjs"));
  const installer = options.badInstallerHash ? Buffer.concat([installerSource, Buffer.from("tampered")]) : installerSource;
  const rendered = renderNodeFiles(readTree(join(root, "standard/templates")), {
    pointer: { node: nodeName, install: { repository } },
    NODE_TITLE: nodeName,
    STANDARD_VERSION: "1.2.0",
  });
  const installSh = Buffer.from(rendered["install.sh"] ?? "");
  const installPs1 = Buffer.from(rendered["install.ps1"] ?? "");
  const launcherName = process.platform === "win32" ? `forge614-${nodeName}.${launcherExtension}` : `forge614-${nodeName}`;
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
  const installerSum = options.badInstallerHash ? `${sum("install.mjs", installer)[0] === "0" ? "1" : "0"}${sum("install.mjs", installer).slice(1)}` : sum("install.mjs", installer);
  const sums = Buffer.from(`${options.badHash ? badAssetSum : assetSum}${sum("forge614.node.json", pointer)}${installerSum}${sum("install.sh", installSh)}${sum("install.ps1", installPs1)}`);
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
async function runInstaller(home: string, baseUrl: string, args: string[] = [], overrides: Record<string, string> = {}, cwd = process.cwd()): Promise<{ code: number | null; stdout: string; stderr: string }> {
  if (!nodeBinary) throw new Error("Node.js is required for installer end-to-end tests");
  const script = join(root, "standard/templates/install.mjs");
  const automaticEnvKey = onWindows && !overrides.FORGE614_TEST_WINDOWS_ENV_KEY
    ? await createWindowsEnvironmentTestKey("existing-entry")
    : "";
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(nodeBinary, [script, ...args], {
        env: {
          ...process.env,
          HOME: home,
          FORGE614_HOME: join(home, ".forge614"),
          FORGE614_INSTALL_TEST_BASE_URL: baseUrl,
          FORGE614_INSTALL_REPOSITORY: REPO,
          FORGE614_INSTALL_NODE: NODE,
          ...(automaticEnvKey ? { FORGE614_TEST_WINDOWS_ENV_KEY: automaticEnvKey } : {}),
          ...overrides,
        },
        cwd,
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
  } finally {
    if (automaticEnvKey) await removeWindowsEnvironmentTestKey(automaticEnvKey);
  }
}

/** Run a gatekeeper process asynchronously and enforce a per-case timeout. */
async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs = 20_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const isolatedHome = env.HOME || tempDir("forge614-command-home-");
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...env, HOME: env.HOME ?? isolatedHome, FORGE614_HOME: env.FORGE614_HOME ?? join(isolatedHome, ".forge614") },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
  });
}

/** Run a UTF-16LE encoded command with Windows PowerShell 5.1. */
async function runPowerShell51(script: string, env: NodeJS.ProcessEnv = {}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const powershell = Bun.which("powershell.exe");
  if (!powershell) throw new Error("Windows PowerShell 5.1 is required for registry tests");
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return await runCommand(powershell, ["-NoProfile", "-EncodedCommand", encoded], { ...process.env, ...env }, 20_000);
}

/** Create a disposable registry key for Windows Path tests without touching HKCU:\\Environment. */
async function createWindowsEnvironmentTestKey(initialPath?: string, valueKind = "String"): Promise<string> {
  const key = `Software\\Forge614-Test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const script = [
    "$registryKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($env:FORGE614_TEST_WINDOWS_ENV_KEY)",
    "if ($env:FORGE614_TEST_INITIAL_PATH_PRESENT -eq '1') {",
    "  $value = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:FORGE614_TEST_INITIAL_PATH_BASE64))",
    "  $kind = [Enum]::Parse([Microsoft.Win32.RegistryValueKind], $env:FORGE614_TEST_INITIAL_PATH_KIND)",
    "  $registryKey.SetValue('Path', $value, $kind)",
    "}",
    "$registryKey.Close()",
  ].join("\n");
  const result = await runPowerShell51(script, {
    FORGE614_TEST_WINDOWS_ENV_KEY: key,
    FORGE614_TEST_INITIAL_PATH_PRESENT: initialPath === undefined ? "0" : "1",
    FORGE614_TEST_INITIAL_PATH_BASE64: Buffer.from(initialPath ?? "", "utf8").toString("base64"),
    FORGE614_TEST_INITIAL_PATH_KIND: valueKind,
  });
  if (result.code !== 0) throw new Error(result.stderr || "could not create disposable Windows registry key");
  return key;
}

/** Read Path and its registry kind from a disposable test key as ASCII metadata. */
async function readWindowsEnvironmentTestKey(key: string): Promise<{ kind: string | null; valueBase64: string | null }> {
  const script = [
    "$registryKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($env:FORGE614_TEST_WINDOWS_ENV_KEY, $false)",
    "if ($null -eq $registryKey -or -not ($registryKey.GetValueNames() -contains 'Path')) { [Console]::Out.WriteLine('MISSING|'); exit 0 }",
    "$value = $registryKey.GetValue('Path', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
    "$kind = $registryKey.GetValueKind('Path').ToString()",
    "$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($value))",
    "$registryKey.Close()",
    "[Console]::Out.WriteLine($kind + '|' + $encoded)",
  ].join("\n");
  const result = await runPowerShell51(script, { FORGE614_TEST_WINDOWS_ENV_KEY: key });
  if (result.code !== 0) throw new Error(result.stderr || "could not read disposable Windows registry key");
  const [kind, valueBase64] = result.stdout.trim().split("|");
  return kind === "MISSING" ? { kind: null, valueBase64: null } : { kind: kind ?? null, valueBase64: valueBase64 ?? null };
}

/** Remove a disposable test registry key even when an assertion fails. */
async function removeWindowsEnvironmentTestKey(key: string): Promise<void> {
  const script = [
    "$registryKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($env:FORGE614_TEST_WINDOWS_ENV_KEY, $true)",
    "if ($null -ne $registryKey) { $registryKey.Close(); [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($env:FORGE614_TEST_WINDOWS_ENV_KEY, $false) }",
  ].join("\n");
  const result = await runPowerShell51(script, { FORGE614_TEST_WINDOWS_ENV_KEY: key });
  if (result.code !== 0) throw new Error(result.stderr || "could not remove disposable Windows registry key");
}

/** Register an installer case with a progress line and a bounded test duration. */
function installerCase(name: string, operation: () => void | Promise<void>, skip = false): void {
  if (skip) {
    test.skip(`${name} (skipped: unsupported on this system)`, operation);
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

installerCase("the system tar long-name format installs a deeply nested launcher", async () => {
  const server = await fakeReleaseServer();
  const release = server.publish("1.0.0", { assetType: "binary-tar-gzip" });
  const home = tempDir("forge614-install-system-tar-");
  const contentRoot = join(home, "tar-source");
  const levels = ["a".repeat(90), "b".repeat(90), "c".repeat(90)];
  const nested = join(contentRoot, ...levels);
  mkdirSync(nested, { recursive: true });
  const launcher = join(nested, "forge614-demo");
  writeFileSync(launcher, "#!/bin/sh\nprintf '%s\\n' 'forge614-demo 1.0.0'\n", { mode: 0o755 });
  chmodSync(launcher, 0o755);
  const archive = join(home, "system.tar.gz");
  const tarResult = await runCommand("tar", ["-czf", archive, "-C", contentRoot, levels[0]!], process.env);
  expect(tarResult.code, tarResult.stderr).toBe(0);
  replaceAsset(release, readFileSync(archive));
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, onWindows);

installerCase("--archive installs a checksum verified local archive", async () => {
  const server = await fakeReleaseServer();
  const release = server.publish("1.0.0", { assetType: "binary-tar-gzip-or-zip" });
  const home = tempDir("forge614-install-archive-option-");
  const archive = join(home, release.asset);
  writeFileSync(archive, release.files.get(release.asset)!);
  const result = await runInstaller(home, server.baseUrl, ["--archive", archive]);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
});

installerCase("tar archives reject parent traversal, absolute paths and symlinks", async () => {
  const cases = [
    { name: "nested/../escape", type: 48 },
    { name: "/tmp/forge614-absolute-escape", type: 48 },
    { name: "forge614-link", type: 50 },
  ];
  for (const entry of cases) {
    const server = await fakeReleaseServer();
    const release = server.publish("1.0.0", { assetType: "binary-tar-gzip-or-zip" });
    const launcher = tarEntry("forge614-demo", Buffer.from("#!/bin/sh\necho 'forge614-demo 1.0.0'\n"), 48, false);
    const unsafe = tarEntry(entry.name, Buffer.from("forge614-demo"), entry.type, false);
    replaceAsset(release, gzipSync(Buffer.concat([launcher, unsafe, Buffer.alloc(1024)])));
    const home = tempDir("forge614-install-unsafe-tar-");
    const result = await runInstaller(home, server.baseUrl);
    expect(result.code, entry.name).toBe(66);
  }
});

installerCase("a system absent from install.systems returns 65", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { unsupportedSystem: true });
  const home = tempDir("forge614-install-unsupported-system-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(65);
  expect(existsSync(join(home, ".forge614", NODE))).toBe(false);
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

installerCase("--force on the active version publishes into a unique version directory", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-force-same-version-");
  expect((await runInstaller(home, server.baseUrl)).code).toBe(0);
  const nodeHome = join(home, ".forge614", NODE);
  const activeVersionDir = join(nodeHome, VERSION);
  const result = await runInstaller(home, server.baseUrl, ["--force"]);
  expect(result.code, result.stderr).toBe(0);
  expect(result.stdout).toContain("se reinstaló 1.0.0");
  expect(existsSync(activeVersionDir)).toBe(true);
  expect(readdirSync(nodeHome).filter((entry) => entry.startsWith(`${VERSION}.install-`))).toHaveLength(1);
  const again = await runInstaller(home, server.baseUrl, ["--force"]);
  expect(again.code, again.stderr).toBe(0);
  expect(again.stdout).toContain("se reinstaló 1.0.0");
  expect(readdirSync(nodeHome).filter((entry) => entry.startsWith(`${VERSION}.install-`))).toHaveLength(1);
});

installerCase("an update activates the new version and removes the previous version", async () => {
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
  expect(existsSync(join(nodeHome, "1.0.0"))).toBe(false);
  expect(existsSync(join(nodeHome, "1.1.0"))).toBe(true);
  expect(readdirSync(nodeHome).filter((entry) => entry.startsWith("legacy-")).length).toBe(0);
});

installerCase("installing cleans old SemVer versions, legacy directories, and links to outside while preserving user files and outside targets", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-clean-old-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(join(nodeHome, "0.1.0"), { recursive: true });
  mkdirSync(join(nodeHome, "0.2.0"), { recursive: true });
  mkdirSync(join(nodeHome, "0.3.0"), { recursive: true });
  mkdirSync(join(nodeHome, "legacy-old-dir"), { recursive: true });
  writeFileSync(join(nodeHome, "memory-falsa.bak"), "loose file to keep");
  const outsideDir = tempDir("forge614-outside-target-");
  writeFileSync(join(outsideDir, "keep.txt"), "outside content");
  symlinkSync(outsideDir, join(nodeHome, "legacy-symlink"));

  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);

  expect(existsSync(join(nodeHome, VERSION))).toBe(true);
  expect(existsSync(join(nodeHome, "bin"))).toBe(true);
  expect(existsSync(join(nodeHome, ".active-version"))).toBe(true);
  expect(existsSync(join(nodeHome, ".bin-dir"))).toBe(true);
  expect(existsSync(join(nodeHome, "memory-falsa.bak"))).toBe(true);

  expect(existsSync(outsideDir)).toBe(true);
  expect(existsSync(join(outsideDir, "keep.txt"))).toBe(true);

  expect(existsSync(join(nodeHome, "0.1.0"))).toBe(false);
  expect(existsSync(join(nodeHome, "0.2.0"))).toBe(false);
  expect(existsSync(join(nodeHome, "0.3.0"))).toBe(false);
  expect(existsSync(join(nodeHome, "legacy-old-dir"))).toBe(false);
  expect(existsSync(join(nodeHome, "legacy-symlink"))).toBe(false);
});

installerCase("a failed installation does not remove any old versions", async () => {
  const server = await fakeReleaseServer();
  server.publish(VERSION, { failSmoke: true });
  const home = tempDir("forge614-install-failed-smoke-keep-old-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(join(nodeHome, "0.1.0"), { recursive: true });
  mkdirSync(join(nodeHome, "0.2.0"), { recursive: true });

  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).not.toBe(0);
  expect(existsSync(join(nodeHome, "0.1.0"))).toBe(true);
  expect(existsSync(join(nodeHome, "0.2.0"))).toBe(true);
});

installerCase("an unremovable old version directory does not fail installation and is renamed to .trash", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-unremovable-old-");
  const nodeHome = join(home, ".forge614", NODE);
  const lockedDir = join(nodeHome, "0.1.0");
  mkdirSync(lockedDir, { recursive: true });
  writeFileSync(join(lockedDir, "file.txt"), "data");
  if (!onWindows) chmodSync(lockedDir, 0o555);

  try {
    const result = await runInstaller(home, server.baseUrl);
    expect(result.code, result.stderr).toBe(0);
    expect(existsSync(join(nodeHome, VERSION))).toBe(true);
    expect(existsSync(lockedDir)).toBe(false);
    const trashDirs = readdirSync(nodeHome).filter((entry) => entry.startsWith(".trash-"));
    expect(trashDirs.length).toBeGreaterThan(0);
  } finally {
    if (!onWindows) {
      for (const entry of readdirSync(nodeHome)) {
        if (entry.startsWith(".trash-")) chmodSync(join(nodeHome, entry), 0o755);
      }
      if (existsSync(lockedDir)) chmodSync(lockedDir, 0o755);
    }
  }
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

installerCase("an invalid requesting asset checksum does not install its dependencies", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("1.0.0", {}, shellRepo, "shell");
  server.publish("1.0.0", {
    badHash: true,
    dependencies: [{ node: "shell", minimumVersion: "1.0.0", requiredCapabilities: [], compatibility: "version" }],
  });
  const home = tempDir("forge614-install-dependency-order-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614", "shell"))).toBe(false);
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

installerCase("a published launcher smoke failure rolls back the first installation", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { failPublishedSmoke: true });
  server.setLatest("1.0.0");
  const home = tempDir("forge614-install-published-smoke-");
  const result = await runInstaller(home, server.baseUrl);
  const nodeHome = join(home, ".forge614", NODE);
  expect(result.code).toBe(65);
  expect(existsSync(join(nodeHome, ".active-version"))).toBe(false);
  expect(existsSync(join(nodeHome, "bin", `forge614-demo${onWindows ? ".cmd" : ""}`))).toBe(false);
  expect(existsSync(join(nodeHome, VERSION))).toBe(false);
});

installerCase("a bin-dir write failure rolls back the activation transaction", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-bindir-transaction-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(join(nodeHome, ".bin-dir"), { recursive: true });
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(65);
  expect(existsSync(join(nodeHome, ".active-version"))).toBe(false);
  expect(existsSync(join(nodeHome, VERSION))).toBe(false);
  expect(existsSync(join(nodeHome, "bin", "forge614-demo"))).toBe(false);
});

installerCase("smoke testing requires the exact node name and version output", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { wrongSmokeOutput: true });
  const home = tempDir("forge614-install-wrong-smoke-output-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(65);
  expect(existsSync(join(home, ".forge614", NODE, ".active-version"))).toBe(false);
});

installerCase("a PATH failure rolls back a first activation without an active pointer", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-rollback-");
  const envKey = "Software\\Forge614-Test-path-failure";
  try {
    const result = await runInstaller(home, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey });
    const nodeHome = join(home, ".forge614", NODE);
    expect(result.code).toBe(65);
    expect(existsSync(join(nodeHome, ".active-version"))).toBe(false);
    expect(existsSync(join(nodeHome, "bin", "forge614-demo"))).toBe(false);
    expect(existsSync(join(nodeHome, VERSION))).toBe(false);
    expect(await readWindowsEnvironmentTestKey(envKey)).toEqual({ kind: null, valueBase64: null });
  } finally {
    await removeWindowsEnvironmentTestKey(envKey);
  }
}, !onWindows);

installerCase("PATH modification is idempotent when enabled and absent when disabled", async () => {
  const enabled = await fakeReleaseServer();
  enabled.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-");
  expect((await runInstaller(home, enabled.baseUrl, [], { SHELL: "/bin/sh" })).code).toBe(0);
  const profile = join(home, ".profile");
  expect(readFileSync(profile, "utf8").match(/>>> forge614-demo PATH >>>/g)?.length).toBe(1);
  expect((await runInstaller(home, enabled.baseUrl, ["--force"], { SHELL: "/bin/sh" })).code).toBe(0);
  expect(readFileSync(profile, "utf8").match(/>>> forge614-demo PATH >>>/g)?.length).toBe(1);

  const disabled = await fakeReleaseServer();
  const otherHome = tempDir("forge614-install-no-path-");
  expect((await runInstaller(otherHome, disabled.baseUrl)).code).toBe(0);
  const disabledProfile = join(otherHome, ".profile");
  expect(existsSync(disabledProfile)).toBe(false);
}, onWindows);

installerCase("PATH creates only the selected profile, preserves symlinks and retires old markers", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-profile-");
  const target = join(home, "zshrc-target");
  writeFileSync(target, "# user profile\n", { mode: 0o644 });
  symlinkSync(target, join(home, ".zshrc"));
  writeFileSync(join(home, ".profile"), [
    "# >>> forge614-engram PATH >>>", "export PATH=old", "# <<< forge614-engram PATH <<<",
    "# >>> forge614-atlas PATH >>>", "export PATH=old", "# <<< forge614-atlas PATH <<<",
    "# Forge614 Shell", "export PATH=old", "",
  ].join("\n"));
  const result = await runInstaller(home, server.baseUrl, [], { SHELL: "/bin/zsh" });
  expect(result.code, result.stderr).toBe(0);
  expect(lstatSync(join(home, ".zshrc")).isSymbolicLink()).toBe(true);
  expect(readFileSync(target, "utf8")).toContain(">>> forge614-demo PATH >>>");
  if (!onWindows) expect((lstatSync(target).mode & 0o777).toString(8)).toBe("644");
  expect(existsSync(join(home, ".bash_profile"))).toBe(false);
  const oldProfile = readFileSync(join(home, ".profile"), "utf8");
  expect(oldProfile).toContain("forge614-engram PATH");
  expect(oldProfile).toContain("forge614-atlas PATH");
  expect(oldProfile).toContain("# Forge614 Shell");
}, onWindows);

installerCase("installing and uninstalling one node preserves the other node's PATH block", async () => {
  const server = await fakeReleaseServer();
  const engramRepo = "jotredev/forge614-engram";
  const atlasRepo = "jotredev/forge614-atlas";
  server.publish("1.0.0", { pathModify: true }, engramRepo, "engram");
  server.publish("1.0.0", { pathModify: true }, atlasRepo, "atlas");
  const home = tempDir("forge614-install-path-nodes-");
  for (const [node, repository] of [["engram", engramRepo], ["atlas", atlasRepo]] as const) {
    const result = await runInstaller(home, server.baseUrl, [], {
      FORGE614_INSTALL_REPOSITORY: repository,
      FORGE614_INSTALL_NODE: node,
      SHELL: "/bin/sh",
    });
    expect(result.code, result.stderr).toBe(0);
  }
  const profile = join(home, ".profile");
  expect(readFileSync(profile, "utf8")).toContain("forge614-engram PATH");
  expect(readFileSync(profile, "utf8")).toContain("forge614-atlas PATH");
  const removed = await runInstaller(home, server.baseUrl, ["--uninstall"], {
    FORGE614_INSTALL_REPOSITORY: atlasRepo,
    FORGE614_INSTALL_NODE: "atlas",
  });
  expect(removed.code, removed.stderr).toBe(0);
  expect(readFileSync(profile, "utf8")).toContain("forge614-engram PATH");
  expect(readFileSync(profile, "utf8")).not.toContain("forge614-atlas PATH");
}, onWindows);

installerCase("only Shell retires the legacy Forge614 Shell PATH line", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("1.0.0", { pathModify: true }, shellRepo, "shell");
  const home = tempDir("forge614-install-shell-legacy-path-");
  const profile = join(home, ".profile");
  writeFileSync(profile, "# user profile\n# Forge614 Shell\nexport PATH=old\n# keep this\n");
  const result = await runInstaller(home, server.baseUrl, [], {
    FORGE614_INSTALL_NODE: "shell", FORGE614_INSTALL_REPOSITORY: shellRepo, SHELL: "/bin/sh",
  });
  expect(result.code, result.stderr).toBe(0);
  const content = readFileSync(profile, "utf8");
  expect(content).not.toContain("# Forge614 Shell");
  expect(content).not.toContain("export PATH=old");
  expect(content).toContain("# keep this");
}, onWindows);

installerCase("an incomplete PATH marker warns and leaves profile bytes untouched", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  for (const { locale, expected } of [
    { locale: "es", expected: "forge614-demo quedó instalado, pero no se agregó al PATH: el perfil tiene un marcador PATH incompleto." },
    { locale: "en", expected: "forge614-demo was installed, but was not added to PATH: the profile has an incomplete PATH marker." },
  ]) {
    const home = tempDir(`forge614-install-path-incomplete-${locale}-`);
    const profile = join(home, ".profile");
    const initial = "# before\n# >>> forge614-demo PATH >>>\nuser content\n";
    writeFileSync(profile, initial);
    const result = await runInstaller(home, server.baseUrl, [], { FORGE614_LOCALE: locale, SHELL: "/bin/sh" });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toContain("marcador");
    expect(result.stdout).toContain(expected);
    expect(readFileSync(profile, "utf8")).toBe(initial);
  }
}, onWindows);

installerCase("uninstall without a PATH block leaves trailing blank lines byte-identical", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-uninstall-no-path-block-");
  const profile = join(home, ".profile");
  const original = Buffer.from("# user profile\n\n\n");
  writeFileSync(profile, original);
  const result = await runInstaller(home, server.baseUrl, ["--uninstall"]);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(profile).equals(original)).toBe(true);
}, onWindows);

installerCase("PATH insertion preserves mixed existing line endings and uses the majority for new lines", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-mixed-eol-");
  const profile = join(home, ".profile");
  const binDir = join(home, ".forge614", NODE, "bin");
  const original = "first\r\nsecond\nthird\r\n";
  writeFileSync(profile, original);
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  const escapedBinDir = binDir.replaceAll("\\", "\\\\");
  expect(readFileSync(profile, "utf8")).toBe(`${original}# >>> forge614-demo PATH >>>\r\nexport PATH="${escapedBinDir}:$PATH"\r\n# <<< forge614-demo PATH <<<\r\n`);
}, onWindows);

installerCase("PATH preserves CRLF and does not replace an already-correct profile", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-crlf-");
  const profile = join(home, ".profile");
  const binDir = join(home, ".forge614", NODE, "bin");
  const initial = `# user\r\n# >>> forge614-demo PATH >>>\r\nexport PATH="${binDir}:$PATH"\r\n# <<< forge614-demo PATH <<<\r\n`;
  writeFileSync(profile, initial);
  const inode = statSync(profile).ino;
  const result = await runInstaller(home, server.baseUrl, [], { SHELL: "/bin/sh" });
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(profile, "utf8")).toBe(initial);
  expect(statSync(profile).ino).toBe(inode);
}, onWindows);

installerCase("PATH escapes shell metacharacters in --bin-dir", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-escape-");
  const binDir = join(home, 'bin$`"quoted');
  const result = await runInstaller(home, server.baseUrl, ["--bin-dir", binDir], { SHELL: "/bin/sh" });
  expect(result.code, result.stderr).toBe(0);
  const escaped = binDir.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$").replaceAll("`", "\\`");
  expect(readFileSync(join(home, ".profile"), "utf8")).toContain(`export PATH="${escaped}:$PATH"`);
}, onWindows);

installerCase("a broken profile symlink is skipped while installation continues", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-broken-link-");
  symlinkSync(join(home, "missing-profile-target"), join(home, ".profile"));
  const result = await runInstaller(home, server.baseUrl, [], { SHELL: "/bin/sh" });
  expect(result.code, result.stderr).toBe(0);
  expect(result.stderr).toContain("perfil roto");
  expect(result.stdout).toContain("quedó instalado, pero no se agregó al PATH: el perfil de shell no está disponible");
  expect(lstatSync(join(home, ".profile")).isSymbolicLink()).toBe(true);
}, onWindows);

installerCase("uninstall without --bin-dir removes the external launcher recorded at install", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0");
  const home = tempDir("forge614-install-bin-dir-persist-");
  const binDir = join(home, "custom-bin");
  const installed = await runInstaller(home, server.baseUrl, ["--bin-dir", binDir]);
  expect(installed.code, installed.stderr).toBe(0);
  const launcherName = `forge614-demo${onWindows ? ".cmd" : ""}`;
  expect(existsSync(join(binDir, launcherName))).toBe(true);
  const removed = await runInstaller(home, server.baseUrl, ["--uninstall"]);
  expect(removed.code, removed.stderr).toBe(0);
  expect(existsSync(join(binDir, launcherName))).toBe(false);
});

installerCase("PATH creates one profile from SHELL when none exists", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-path-create-");
  const result = await runInstaller(home, server.baseUrl, [], { SHELL: "/bin/zsh" });
  expect(result.code, result.stderr).toBe(0);
  expect(existsSync(join(home, ".zshrc"))).toBe(true);
  expect(existsSync(join(home, ".bash_profile"))).toBe(false);
  expect(existsSync(join(home, ".bashrc"))).toBe(false);
  expect(existsSync(join(home, ".profile"))).toBe(false);
}, onWindows);

installerCase("PATH warns and skips profiles without HOME or USERPROFILE", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-no-home-");
  const cwd = tempDir("forge614-install-no-home-cwd-");
  const result = await runInstaller(home, server.baseUrl, [], {
    HOME: "", USERPROFILE: "", FORGE614_HOME: join(home, "forge-home"), SHELL: "/bin/zsh",
  }, cwd);
  expect(result.code, result.stderr).toBe(0);
  expect(result.stderr).toContain("no hay HOME ni USERPROFILE");
  for (const profile of [".zshrc", ".bashrc", ".profile", ".bash_profile"]) expect(existsSync(join(cwd, profile))).toBe(false);
}, onWindows);

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

installerCase("a flat .exe launcher is retained when the active Windows asset is .exe", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { launcherExtension: "exe" });
  const home = tempDir("forge614-install-migration-exe-active-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(join(nodeHome, "bin"), { recursive: true });
  const oldLauncher = join(nodeHome, "bin", "forge614-demo.exe");
  writeFileSync(oldLauncher, "legacy", { mode: 0o755 });
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  const legacyDir = readdirSync(nodeHome).find((entry) => entry.startsWith("legacy-"));
  expect(legacyDir).toBeDefined();
  expect(existsSync(join(nodeHome, legacyDir ?? "", "forge614-demo.exe"))).toBe(true);
}, !onWindows);

installerCase("an empty active-version file prevents flat-install migration", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-empty-active-pointer-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(join(nodeHome, "bin"), { recursive: true });
  writeFileSync(join(nodeHome, ".active-version"), "");
  writeFileSync(join(nodeHome, "bin", "forge614-demo"), "#!/bin/sh\necho flat\n", { mode: 0o755 });
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(readdirSync(nodeHome).some((entry) => entry.startsWith("legacy-"))).toBe(false);
  expect(readFileSync(join(nodeHome, ".active-version"), "utf8").trim()).toBe("1.0.0");
});

installerCase("a failed activation restores a flat legacy launcher", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: false, failPublishedSmoke: true });
  const home = tempDir("forge614-install-flat-rollback-");
  const oldLauncher = join(home, ".forge614", NODE, "bin", `forge614-demo${onWindows ? ".cmd" : ""}`);
  mkdirSync(join(home, ".forge614", NODE, "bin"), { recursive: true });
  writeFileSync(oldLauncher, onWindows ? "@echo off\r\necho legacy\r\n" : "#!/bin/sh\nprintf legacy\n", { mode: 0o755 });
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(65);
  expect(readFileSync(oldLauncher, "utf8")).toContain("legacy");
  expect(existsSync(join(home, ".forge614", NODE, ".active-version"))).toBe(false);
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
  // cmd.exe echo always appends \r\n.
  expect(readFileSync(marker, "utf8").trimEnd()).toBe("called");
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

installerCase("Spanish errors include a technical detail on the line after the summary", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-error-detail-");
  const result = await runInstaller(home, server.baseUrl, ["--version", "invalid"]);
  expect(result.code).toBe(64);
  expect(result.stderr.split(/\r?\n/)[0]).toBe("Uso inválido del instalador Forge614.");
  expect(result.stderr.split(/\r?\n/)[1]).toContain("invalid version tag");
});

installerCase("messages honor FORGE614_LOCALE and the legacy locale fallback", async () => {
  const english = await fakeReleaseServer();
  const englishHome = tempDir("forge614-install-locale-en-");
  const resultEn = await runInstaller(englishHome, english.baseUrl, [], { FORGE614_LOCALE: "en", FORGE614_SHELL_LOCALE: "" });
  expect(resultEn.code).toBe(0);
  expect(resultEn.stdout).toContain("was installed at");

  const legacy = await fakeReleaseServer();
  const legacyHome = tempDir("forge614-install-locale-legacy-");
  const resultLegacy = await runInstaller(legacyHome, legacy.baseUrl, [], { FORGE614_LOCALE: "", FORGE614_SHELL_LOCALE: "en" });
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

installerCase("dependency capabilities use the Engines CLI JSON schema", async () => {
  const server = await fakeReleaseServer();
  const enginesRepo = "jotredev/forge614-engines";
  server.publish("1.0.0", {}, enginesRepo, "engines");
  server.publish("1.0.0", {
    dependencies: [{ node: "engines", minimumVersion: "1.0.0", requiredCapabilities: [{ agent: "claude-code", field: "supportsReadOnly" }], compatibility: "version-and-capabilities" }],
  });
  const home = tempDir("forge614-install-dependency-capabilities-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", "engines", ".active-version"), "utf8").trim()).toBe("1.0.0");
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
});

installerCase("a broken dependency launcher is treated as incompatible and repaired", async () => {
  const server = await fakeReleaseServer();
  const enginesRepo = "jotredev/forge614-engines";
  server.publish("1.0.0", {}, enginesRepo, "engines");
  server.publish("1.0.0", {
    dependencies: [{ node: "engines", minimumVersion: "1.0.0", requiredCapabilities: [{ agent: "claude-code", field: "supportsReadOnly" }], compatibility: "version-and-capabilities" }],
  });
  const home = tempDir("forge614-install-broken-dependency-");
  const broken = join(home, ".forge614", "engines", "bin", "forge614-engines");
  mkdirSync(join(home, ".forge614", "engines", "bin"), { recursive: true });
  symlinkSync(join(home, "missing-engine"), broken);
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", "engines", ".active-version"), "utf8").trim()).toBe("1.0.0");
  const legacyDir = readdirSync(join(home, ".forge614", "engines")).find((entry) => entry.startsWith("legacy-"));
  expect(legacyDir).toBeDefined();
  expect(lstatSync(join(home, ".forge614", "engines", legacyDir ?? "", "forge614-engines")).isSymbolicLink()).toBe(true);
});

installerCase("a dependency version response must name that dependency exactly", async () => {
  const server = await fakeReleaseServer();
  const enginesRepo = "jotredev/forge614-engines";
  server.publish("1.0.0", { wrongNodeName: true }, enginesRepo, "engines");
  server.publish("1.0.0", {
    dependencies: [{ node: "engines", minimumVersion: null, requiredCapabilities: [], compatibility: "installed" }],
  });
  const home = tempDir("forge614-install-dependency-version-name-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(69);
  expect(result.stderr).toContain("no se encontró el lanzador instalado");
  expect(server.requests.get("install.mjs")).toBe(1);
});

installerCase("a rejected dependency capability reports the node and reason in both locales", async () => {
  const server = await fakeReleaseServer();
  const enginesRepo = "jotredev/forge614-engines";
  server.publish("1.0.0", { badCapabilities: true }, enginesRepo, "engines");
  server.publish("1.0.0", {
    dependencies: [{ node: "engines", minimumVersion: "1.0.0", requiredCapabilities: [{ agent: "claude-code", field: "supportsReadOnly" }], compatibility: "version-and-capabilities" }],
  });
  for (const [locale, expected] of [["es", "engines: la salida de capabilities no es JSON válido"], ["en", "engines: capabilities output is not valid JSON"]] as const) {
    const home = tempDir(`forge614-install-capability-diagnostic-${locale}-`);
    const result = await runInstaller(home, server.baseUrl, [], { FORGE614_LOCALE: locale });
    expect(result.code).toBe(69);
    expect(result.stderr).toContain(expected);
  }
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

installerCase("a dependency installer with a bad checksum returns 66", async () => {
  const server = await fakeReleaseServer();
  const shellRepo = "jotredev/forge614-shell";
  server.publish("1.0.0", { badInstallerHash: true }, shellRepo, "shell");
  server.publish("1.0.0", {
    dependencies: [{ node: "shell", minimumVersion: "1.0.0", requiredCapabilities: [], compatibility: "version" }],
  });
  const home = tempDir("forge614-install-dependency-installer-hash-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614", "shell"))).toBe(false);
});

installerCase("an installer with an altered gatekeeper checksum returns 66", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { badInstallerHash: true });
  const home = tempDir("forge614-install-gatekeeper-hash-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script], {
    ...process.env, HOME: home, FORGE614_HOME: join(home, ".forge614"), PATH: `${dirname(nodeBinary ?? "")}:${process.env.PATH ?? ""}`,
    FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  });
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, onWindows);

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

installerCase("an unsafe dependency node name is rejected before constructing dependency paths", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", {
    dependencies: [{ node: "../outside", minimumVersion: null, requiredCapabilities: [], compatibility: "installed" }],
  });
  const home = tempDir("forge614-install-invalid-dependency-node-");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code).toBe(65);
  expect(result.stderr).toContain("Detalle técnico: install dependency node is invalid");
  expect(existsSync(join(home, "outside"))).toBe(false);
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

installerCase("POSIX gatekeeper rejects a missing version value with 64", async () => {
  const home = tempDir("forge614-gatekeeper-missing-version-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script, "--version"], { ...process.env, HOME: home, PATH: process.env.PATH ?? "" });
  expect(result.code).toBe(64);
}, onWindows);

installerCase("POSIX gatekeeper rejects invalid version tags with 64", async () => {
  const home = tempDir("forge614-gatekeeper-invalid-version-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script, "--version", "bad/tag"], { ...process.env, HOME: home, PATH: process.env.PATH ?? "" });
  expect(result.code).toBe(64);
}, onWindows);

installerCase("the POSIX gatekeeper rejects altered install.mjs bytes with 66", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { badInstallerHash: true });
  const home = tempDir("forge614-gatekeeper-installer-hash-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script, "--version", "1.0.0"], {
    ...process.env, HOME: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  });
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, onWindows);

installerCase("the POSIX gatekeeper pins remote curl to HTTPS and cleans interrupt temporaries", () => {
  const shell = readFileSync(join(root, "standard/templates/install.sh"), "utf8");
  const installer = readFileSync(join(root, "standard/templates/install.mjs"), "utf8");
  expect(shell).toContain("--proto '=https' --tlsv1.2");
  expect(shell).toContain("trap 'exit 130' INT");
  expect(shell).toContain(".install-XXXXXX");
  expect(installer).toContain('process.once(signal,');
  expect(installer).toContain('"SIGINT"');
  expect(installer).toContain('"SIGTERM"');
});

installerCase("install.mjs rejects a non-SemVer version tag with 64", async () => {
  const home = tempDir("forge614-install-invalid-version-");
  const result = await runInstaller(home, "http://127.0.0.1:1", ["--version", "bad/tag"]);
  expect(result.code).toBe(64);
});

installerCase("empty FORGE614_LOCALE falls back to the legacy locale", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-locale-empty-");
  const result = await runInstaller(home, server.baseUrl, [], { FORGE614_LOCALE: "", FORGE614_SHELL_LOCALE: "en" });
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("was installed at");
});

installerCase("FORGE614_LOCALE takes precedence over the legacy locale", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-locale-precedence-");
  const result = await runInstaller(home, server.baseUrl, [], { FORGE614_LOCALE: "es", FORGE614_SHELL_LOCALE: "en" });
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("quedó instalado");
});

installerCase("uninstall uses the downloaded node identity without release network access", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-uninstall-offline-");
  const nodeHome = join(home, ".forge614", NODE);
  mkdirSync(nodeHome, { recursive: true });
  writeFileSync(join(nodeHome, ".active-version"), "1.0.0\n");
  const before = server.requests.size;
  const result = await runInstaller(home, server.baseUrl, ["--uninstall"]);
  expect(result.code, result.stderr).toBe(0);
  expect(server.requests.size).toBe(before);
  expect(existsSync(nodeHome)).toBe(false);
});

installerCase("uninstall continues after a failing hook in both locales and removes an external launcher", async () => {
  for (const { locale, warning } of [
    { locale: "es", warning: "Aviso: falló forge614-demo uninstall --self; se sigue con la limpieza del instalador." },
    { locale: "en", warning: "Warning: forge614-demo uninstall --self failed; continuing with installer cleanup." },
  ]) {
    const server = await fakeReleaseServer();
    const home = tempDir(`forge614-install-uninstall-hook-failure-${locale}-`);
    const externalBin = join(home, "external bin");
    mkdirSync(externalBin);
    const launcher = join(externalBin, `forge614-demo${onWindows ? ".cmd" : ""}`);
    if (onWindows) {
      writeFileSync(launcher, "@echo off\r\nif \"%1\"==\"--version\" (echo forge614-demo 1.0.0& exit /b 0)\r\nexit /b 1\r\n");
    } else {
      writeFileSync(launcher, "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then printf 'forge614-demo 1.0.0\\n'; exit 0; fi\nexit 1\n", { mode: 0o755 });
    }
    const profile = join(home, ".profile");
    if (!onWindows) writeFileSync(profile, "# >>> forge614-demo PATH >>>\nexport PATH=old\n# <<< forge614-demo PATH <<<\n");
    const envKey = onWindows ? await createWindowsEnvironmentTestKey(`system-entry;${externalBin}`) : undefined;
    try {
      const result = await runInstaller(home, server.baseUrl, ["--uninstall", "--bin-dir", externalBin], {
        FORGE614_INSTALL_NODE: NODE, FORGE614_INSTALL_REPOSITORY: REPO, FORGE614_LOCALE: locale,
        ...(envKey ? { FORGE614_TEST_WINDOWS_ENV_KEY: envKey } : {}),
      });
      expect(result.code, result.stderr).toBe(0);
      expect(result.stderr).toContain(warning);
      expect(existsSync(launcher)).toBe(false);
      if (onWindows && envKey) expect((await readWindowsEnvironmentTestKey(envKey)).valueBase64).toBe(Buffer.from("system-entry", "utf8").toString("base64"));
      else expect(readFileSync(profile, "utf8")).not.toContain("forge614-demo PATH");
    } finally {
      if (envKey) await removeWindowsEnvironmentTestKey(envKey);
    }
  }
});

installerCase("the PowerShell template includes a UTF-8 BOM for Windows PowerShell 5.1", () => {
  const files = renderNodeFiles(readTree("standard/templates"), {
    pointer: { node: NODE, install: { repository: REPO } }, NODE_TITLE: "Demo", STANDARD_VERSION: "1.2.0",
  });
  expect(Buffer.from(files["install.ps1"] ?? "").subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(true);
});

installerCase("the shell gatekeeper returns a nonzero install.mjs exit code unchanged", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-forward-exit-");
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script, "--archive", join(home, "missing-archive")], {
    ...process.env, HOME: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  });
  expect(result.code).toBe(66);
}, onWindows);

installerCase("the shell gatekeeper rejects simulated Node 22.18 with the full localized message", async () => {
  const home = tempDir("forge614-gatekeeper-old-node-");
  const bin = join(home, "fake-bin");
  mkdirSync(bin);
  const fakeNode = join(bin, "node");
  writeFileSync(fakeNode, "#!/bin/sh\nif [ \"$1\" = --version ]; then echo v22.18.0; exit 0; fi\nexit 1\n", { mode: 0o755 });
  const script = renderedShellGatekeeper(home);
  const result = await runCommand("/bin/sh", [script], {
    ...process.env, HOME: home, PATH: bin, FORGE614_LOCALE: "es", FORGE614_SHELL_LOCALE: "",
  });
  expect(result.code).toBe(65);
  expect(result.stderr.trim()).toBe("Forge614 necesita Node.js 22.19.0 o posterior para instalarse. Instálalo con Homebrew: brew install node; en Linux, con el gestor de paquetes de tu distribución o desde https://nodejs.org; en Windows, con winget install OpenJS.NodeJS.LTS o desde https://nodejs.org. Después vuelve a ejecutar este instalador.");
}, onWindows);

installerCase("a Windows installation home with spaces reaches the launcher smoke test", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614 install with spaces ");
  const result = await runInstaller(home, server.baseUrl);
  expect(result.code, result.stderr).toBe(0);
  expect(existsSync(join(home, ".forge614", NODE, ".active-version"))).toBe(true);
}, !onWindows);

const powershell51 = Bun.which("powershell.exe");
const pwsh = Bun.which("pwsh");
const powershell51Reason = powershell51 === null ? " (skipped: Windows PowerShell 5.1 is unavailable)" : "";
const pwshReason = pwsh === null ? " (skipped: pwsh is unavailable)" : "";

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 gatekeeper verifies a release and forwards arguments${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 gatekeeper verifies a release and forwards arguments\n");
  const server = await fakeReleaseServer();
  server.publish("2.0.0");
  server.setLatest("2.0.0");
  const home = tempDir("forge614-gatekeeper-ps51-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "1.0.0", "--latest"], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 gatekeeper without Node returns 65 without changing files${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 gatekeeper without Node returns 65 without changing files\n");
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-ps51-no-node-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), PATH: "", FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code).toBe(65);
  expect(result.stderr.trim()).toBe("Forge614 necesita Node.js 22.19.0 o posterior para instalarse. Instálalo con Homebrew: brew install node; en Linux, con el gestor de paquetes de tu distribución o desde https://nodejs.org; en Windows, con winget install OpenJS.NodeJS.LTS o desde https://nodejs.org. Después vuelve a ejecutar este instalador.");
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 rejects an altered install.mjs checksum with 66${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 rejects an altered install.mjs checksum with 66\n");
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { badInstallerHash: true });
  const home = tempDir("forge614-gatekeeper-ps51-installer-hash-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "1.0.0"], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code).toBe(66);
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 rejects a test URL without an explicit port${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 rejects a test URL without an explicit port\n");
  const home = tempDir("forge614-gatekeeper-ps51-port-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_INSTALL_TEST_BASE_URL: "http://127.0.0.1",
  }, 60_000);
  expect(result.code).toBe(64);
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 rejects an invalid version tag with 64${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 rejects an invalid version tag with 64\n");
  const home = tempDir("forge614-gatekeeper-ps51-invalid-tag-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "bad/tag"], {
    ...process.env, HOME: home, USERPROFILE: home,
  }, 60_000);
  expect(result.code).toBe(64);
}, 60_000);

test.skipIf(powershell51 === null)(`Windows PowerShell 5.1 treats an empty current locale as unset${powershell51Reason}`, async () => {
  process.stdout.write("[installer-e2e] Windows PowerShell 5.1 treats an empty current locale as unset\n");
  const home = tempDir("forge614-gatekeeper-ps51-empty-locale-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(powershell51 as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    ...process.env, HOME: home, USERPROFILE: home, PATH: "", FORGE614_LOCALE: "", FORGE614_SHELL_LOCALE: "en",
  }, 60_000);
  expect(result.code).toBe(65);
  expect(result.stderr.trim()).toBe("Forge614 requires Node.js 22.19.0 or later to install. Install it with Homebrew: brew install node; on Linux, use your distribution's package manager or https://nodejs.org; on Windows, use winget install OpenJS.NodeJS.LTS or https://nodejs.org. Then run this installer again.");
}, 60_000);

test.skipIf(pwsh === null)(`pwsh gatekeeper verifies a release and forwards arguments${pwshReason}`, async () => {
  process.stdout.write("[installer-e2e] pwsh gatekeeper verifies a release and forwards arguments\n");
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-gatekeeper-pwsh-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(pwsh as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "--version", "1.0.0"], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), FORGE614_INSTALL_TEST_BASE_URL: server.baseUrl,
  }, 60_000);
  expect(result.code, result.stderr).toBe(0);
  expect(readFileSync(join(home, ".forge614", NODE, ".active-version"), "utf8").trim()).toBe("1.0.0");
}, 60_000);

test.skipIf(pwsh === null)(`pwsh gatekeeper without Node prints the full accented requirement message${pwshReason}`, async () => {
  process.stdout.write("[installer-e2e] pwsh gatekeeper without Node prints the full accented requirement message\n");
  const home = tempDir("forge614-gatekeeper-pwsh-no-node-");
  const script = renderedPowerShellGatekeeper(home);
  const result = await runCommand(pwsh as string, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    ...process.env, HOME: home, USERPROFILE: home, FORGE614_HOME: join(home, ".forge614"), PATH: "", FORGE614_LOCALE: "es",
  }, 60_000);
  expect(result.code).toBe(65);
  expect(result.stderr.trim()).toBe("Forge614 necesita Node.js 22.19.0 o posterior para instalarse. Instálalo con Homebrew: brew install node; en Linux, con el gestor de paquetes de tu distribución o desde https://nodejs.org; en Windows, con winget install OpenJS.NodeJS.LTS o desde https://nodejs.org. Después vuelve a ejecutar este instalador.");
  expect(existsSync(join(home, ".forge614"))).toBe(false);
}, 60_000);

installerCase("Windows Path preserves ExpandString entries with Unicode and uninstalls cleanly", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-windows-user-path-");
  const original = "%USERPROFILE%\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Users\\José\\bin;C:\\Users\\O’Neil\\tools";
  const envKey = await createWindowsEnvironmentTestKey(original, "ExpandString");
  const binDir = join(home, ".forge614", NODE, "bin");
  try {
    const installed = await runInstaller(home, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey });
    expect(installed.code, installed.stderr).toBe(0);
    const afterInstall = await readWindowsEnvironmentTestKey(envKey);
    expect(afterInstall.kind).toBe("ExpandString");
    expect(afterInstall.valueBase64).toBe(Buffer.from(`${original};${binDir}`, "utf8").toString("base64"));

    const removed = await runInstaller(home, server.baseUrl, ["--uninstall"], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey });
    expect(removed.code, removed.stderr).toBe(0);
    const afterUninstall = await readWindowsEnvironmentTestKey(envKey);
    expect(afterUninstall.kind).toBe("ExpandString");
    expect(afterUninstall.valueBase64).toBe(Buffer.from(original, "utf8").toString("base64"));

    server.publish("1.1.0", { pathModify: true, failPublishedSmoke: true });
    server.setLatest("1.1.0");
    const rollbackHome = tempDir("forge614-install-windows-path-rollback-expand-");
    const failed = await runInstaller(rollbackHome, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey });
    expect(failed.code).toBe(65);
    const afterRollback = await readWindowsEnvironmentTestKey(envKey);
    expect(afterRollback.kind).toBe("ExpandString");
    expect(afterRollback.valueBase64).toBe(Buffer.from(original, "utf8").toString("base64"));
  } finally {
    await removeWindowsEnvironmentTestKey(envKey);
  }
}, !onWindows);

installerCase("Windows Path installation is idempotent for an existing entry", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-windows-path-repeat-");
  const original = "existing-entry";
  const envKey = await createWindowsEnvironmentTestKey(original, "ExpandString");
  const binDir = join(home, ".forge614", NODE, "bin");
  try {
    expect((await runInstaller(home, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey })).code).toBe(0);
    expect((await runInstaller(home, server.baseUrl, ["--force"], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey })).code).toBe(0);
    const state = await readWindowsEnvironmentTestKey(envKey);
    expect(state.kind).toBe("ExpandString");
    expect(state.valueBase64).toBe(Buffer.from(`${original};${binDir}`, "utf8").toString("base64"));
  } finally {
    await removeWindowsEnvironmentTestKey(envKey);
  }
}, !onWindows);

installerCase("Windows Path without a value creates ExpandString with only the launcher folder", async () => {
  const server = await fakeReleaseServer();
  server.publish("1.0.0", { pathModify: true });
  const home = tempDir("forge614-install-windows-path-empty-");
  const envKey = await createWindowsEnvironmentTestKey();
  const binDir = join(home, ".forge614", NODE, "bin");
  try {
    const installed = await runInstaller(home, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: envKey });
    expect(installed.code, installed.stderr).toBe(0);
    const state = await readWindowsEnvironmentTestKey(envKey);
    expect(state.kind).toBe("ExpandString");
    expect(state.valueBase64).toBe(Buffer.from(binDir, "utf8").toString("base64"));

    const rollbackKey = await createWindowsEnvironmentTestKey();
    try {
      server.publish("1.1.0", { pathModify: true, failPublishedSmoke: true });
      server.setLatest("1.1.0");
      const rollbackHome = tempDir("forge614-install-windows-path-rollback-absent-");
      const failed = await runInstaller(rollbackHome, server.baseUrl, [], { FORGE614_TEST_WINDOWS_ENV_KEY: rollbackKey });
      expect(failed.code).toBe(65);
      expect(await readWindowsEnvironmentTestKey(rollbackKey)).toEqual({ kind: null, valueBase64: null });
    } finally {
      await removeWindowsEnvironmentTestKey(rollbackKey);
    }
  } finally {
    await removeWindowsEnvironmentTestKey(envKey);
  }
}, !onWindows);

installerCase("Windows test registry gate rejects an unsafe key and a missing loopback server", async () => {
  const server = await fakeReleaseServer();
  const home = tempDir("forge614-install-windows-path-gate-");
  const invalidKey = await runInstaller(home, server.baseUrl, ["--uninstall"], {
    FORGE614_TEST_WINDOWS_ENV_KEY: "Environment",
  });
  expect(invalidKey.code).toBe(64);
  expect(invalidKey.stderr).toContain("FORGE614_TEST_WINDOWS_ENV_KEY must name a key");

  const missingServer = await runInstaller(home, server.baseUrl, ["--uninstall"], {
    FORGE614_INSTALL_TEST_BASE_URL: "",
    FORGE614_TEST_WINDOWS_ENV_KEY: "Software\\Forge614-Test-not-created",
  });
  expect(missingServer.code).toBe(64);
  expect(missingServer.stderr).toContain("requires FORGE614_INSTALL_TEST_BASE_URL");
}, !onWindows);

installerCase("Windows Path keeps other nodes and stays idempotent across install and uninstall", async () => {
  const server = await fakeReleaseServer();
  const engramRepo = "jotredev/forge614-engram";
  const atlasRepo = "jotredev/forge614-atlas";
  server.publish("1.0.0", { pathModify: true }, engramRepo, "engram");
  server.publish("1.0.0", { pathModify: true }, atlasRepo, "atlas");
  const home = tempDir("forge614-install-windows-path-nodes-");
  const envKey = await createWindowsEnvironmentTestKey("existing-entry", "ExpandString");
  const sharedBinDir = join(home, "shared-bin");
  const installNode = async (node: string, repository: string, args: string[] = []) => runInstaller(home, server.baseUrl, [...args, "--bin-dir", sharedBinDir], {
    FORGE614_INSTALL_NODE: node,
    FORGE614_INSTALL_REPOSITORY: repository,
    FORGE614_TEST_WINDOWS_ENV_KEY: envKey,
  });
  const expectedPath = `existing-entry;${sharedBinDir}`;
  try {
    expect((await installNode("engram", engramRepo)).code).toBe(0);
    expect((await installNode("atlas", atlasRepo)).code).toBe(0);
    expect((await readWindowsEnvironmentTestKey(envKey)).valueBase64).toBe(Buffer.from(expectedPath, "utf8").toString("base64"));

    expect((await installNode("engram", engramRepo, ["--uninstall"])).code).toBe(0);
    expect((await readWindowsEnvironmentTestKey(envKey)).valueBase64).toBe(Buffer.from(expectedPath, "utf8").toString("base64"));
    expect(readdirSync(sharedBinDir).some((name) => /^forge614-.+\.(exe|cmd)$/i.test(name))).toBe(true);

    expect((await installNode("atlas", atlasRepo, ["--uninstall"])).code).toBe(0);
    expect((await readWindowsEnvironmentTestKey(envKey)).valueBase64).toBe(Buffer.from("existing-entry", "utf8").toString("base64"));
  } finally {
    await removeWindowsEnvironmentTestKey(envKey);
  }
}, !onWindows);
