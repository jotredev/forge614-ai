#!/usr/bin/env node

// Shared Forge614 installer. Node-specific values come from forge614.node.json.

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, copyFile, lstat, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { gunzipSync, inflateRawSync } from "node:zlib";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

const EXIT = Object.freeze({ OK: 0, USAGE: 64, REQUIREMENT: 65, DOWNLOAD: 66, DEPENDENCY: 69 });
const MIN_NODE = [22, 19, 0];
const TEST_BASE_ENV = "FORGE614_INSTALL_TEST_BASE_URL";

/** Raise an installer error with its public exit code. */
class InstallerError extends Error {
  /** Construct a localized installer error. */
  constructor(code, message) {
    super(message);
    this.name = "InstallerError";
    this.code = code;
  }
}

/** Select Spanish or English from the current and legacy locale variables. */
function locale() {
  const selected = process.env.FORGE614_LOCALE ?? process.env.FORGE614_SHELL_LOCALE ?? "es";
  return selected.toLowerCase().startsWith("en") ? "en" : "es";
}

/** Return a localized message for a known installer message key. */
function message(key, values = {}) {
  const messages = {
    installed: { es: "forge614-{node} quedó instalado en {version}.", en: "forge614-{node} was installed at {version}." },
    current: { es: "forge614-{node} ya está al día ({version}).", en: "forge614-{node} is already up to date ({version})." },
    updated: { es: "forge614-{node} se actualizó de {previous} a {version}.", en: "forge614-{node} was updated from {previous} to {version}." },
    removed: { es: "forge614-{node} se desinstaló.", en: "forge614-{node} was uninstalled." },
    help: { es: "Uso: install.mjs [--latest] [--force] [--version ETIQUETA] [--archive RUTA] [--uninstall] [--bin-dir RUTA]", en: "Usage: install.mjs [--latest] [--force] [--version TAG] [--archive PATH] [--uninstall] [--bin-dir PATH]" },
  };
  let text = messages[key]?.[locale()] ?? key;
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

/** Compare two numeric semantic versions, ignoring a leading v and prerelease suffix. */
function compareVersions(left, right) {
  const parse = (value) => value.replace(/^v/, "").split(/[+-]/, 1)[0].split(".").map((part) => Number(part));
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

/** Parse supported arguments without changing their values. */
function parseArguments(argv) {
  const options = { version: "", archive: "", force: false, uninstall: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--latest") continue;
    if (arg === "--force") options.force = true;
    else if (arg === "--uninstall") options.uninstall = true;
    else if (arg === "--help") options.help = true;
    else if (arg === "--version" || arg === "--archive" || arg === "--bin-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new InstallerError(EXIT.USAGE, `invalid value for ${arg}`);
      if (arg === "--version") options.version = value;
      if (arg === "--archive") options.archive = value;
      if (arg === "--bin-dir") options.binDir = value;
      index += 1;
    } else throw new InstallerError(EXIT.USAGE, `unknown argument: ${arg}`);
  }
  if (options.version && !/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(options.version)) {
    throw new InstallerError(EXIT.USAGE, "invalid version tag");
  }
  return options;
}

/** Ensure the running Node version meets the installer's declared minimum. */
function checkNodeVersion() {
  if (compareVersions(process.versions.node, MIN_NODE.join(".")) < 0) {
    throw new InstallerError(EXIT.REQUIREMENT, "Node.js 22.19.0 or later is required.");
  }
}

/** Resolve and validate an absolute Forge614 home directory. */
function forgeHome() {
  const configured = process.env.FORGE614_HOME ?? join(process.env.HOME ?? process.env.USERPROFILE ?? "", ".forge614");
  if (!configured || !isAbsolute(configured)) throw new InstallerError(EXIT.USAGE, "INVALID_FORGE614_HOME");
  return resolve(configured);
}

/** Validate the test-only local HTTP base URL and return it when enabled. */
function testBaseUrl() {
  const candidate = process.env[TEST_BASE_ENV];
  if (!candidate) return undefined;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new InstallerError(EXIT.USAGE, `invalid ${TEST_BASE_ENV}`);
  }
  const localHost = url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1";
  if (url.protocol !== "http:" || !localHost || !url.port || url.username || url.password || url.pathname !== "/") {
    throw new InstallerError(EXIT.USAGE, `${TEST_BASE_ENV} only accepts a loopback HTTP origin`);
  }
  if (url.search || url.hash) throw new InstallerError(EXIT.USAGE, `${TEST_BASE_ENV} only accepts a loopback HTTP origin`);
  return url.origin;
}

/** Build the release API URL for a repository and optional local test origin. */
function latestUrl(repository, testBase) {
  return testBase ? `${testBase}/repos/${repository}/releases/latest` : `https://api.github.com/repos/${repository}/releases/latest`;
}

/** Build the URL of a named asset from one immutable release tag. */
function assetUrl(repository, tag, name, testBase) {
  const encoded = name.split("/").map(encodeURIComponent).join("/");
  return testBase
    ? `${testBase}/repos/${repository}/releases/download/${encodeURIComponent(tag)}/${encoded}`
    : `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${encoded}`;
}

/** Download a response body and map network or HTTP failures to installer code 66. */
async function download(url) {
  let response;
  try {
    response = await fetch(url, { headers: { "User-Agent": "forge614-installer" }, signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new InstallerError(EXIT.DOWNLOAD, `download failed: ${error instanceof Error ? error.message : "network error"}`);
  }
  if (!response.ok) throw new InstallerError(EXIT.DOWNLOAD, `download failed with HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Download and parse latest-release metadata. */
async function latestTag(repository, testBase) {
  const bytes = await download(latestUrl(repository, testBase));
  let release;
  try {
    release = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new InstallerError(EXIT.DOWNLOAD, "release metadata is invalid");
  }
  if (typeof release.tag_name !== "string" || !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(release.tag_name)) {
    throw new InstallerError(EXIT.DOWNLOAD, "release tag is invalid");
  }
  return release.tag_name;
}

/** Fetch an asset and verify the exact GNU SHA256SUMS entry before returning it. */
async function verifiedAsset(repository, tag, name, sums, testBase) {
  const lines = sums.toString("utf8").split(/\r?\n/).filter((line) => line.endsWith(`  ${name}`));
  if (lines.length !== 1 || !/^([0-9a-f]{64})  /.test(lines[0] ?? "")) {
    throw new InstallerError(EXIT.DOWNLOAD, `SHA256SUMS has no unique entry for ${name}`);
  }
  const bytes = await download(assetUrl(repository, tag, name, testBase));
  const expected = lines[0].slice(0, 64);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new InstallerError(EXIT.DOWNLOAD, `SHA-256 mismatch for ${name}`);
  return bytes;
}

/** Read and validate the install block in a node pointer. */
function parsePointer(bytes) {
  let pointer;
  try {
    pointer = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new InstallerError(EXIT.DOWNLOAD, "forge614.node.json is invalid JSON");
  }
  const install = pointer?.install;
  if (typeof pointer?.node !== "string" || !/^[a-z0-9-]+$/.test(pointer.node) || !install || typeof install !== "object") {
    throw new InstallerError(EXIT.REQUIREMENT, "forge614.node.json has no valid install block");
  }
  if (typeof install.repository !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(install.repository)) {
    throw new InstallerError(EXIT.REQUIREMENT, "install.repository is invalid");
  }
  if (typeof install.minimumNodeVersion !== "string" || compareVersions(process.versions.node, install.minimumNodeVersion) < 0) {
    throw new InstallerError(EXIT.REQUIREMENT, "Node.js does not meet install.minimumNodeVersion");
  }
  if (!Array.isArray(install.systems) || !Array.isArray(install.dependencies) || !install.asset || typeof install.asset.pattern !== "string") {
    throw new InstallerError(EXIT.REQUIREMENT, "install block is incomplete");
  }
  return { node: pointer.node, install };
}

/** Return the current OS and supported Node architecture names. */
function currentPlatform() {
  const os = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : process.platform === "linux" ? "linux" : "unknown";
  const arch = process.arch === "arm64" ? "arm64" : process.arch === "x64" ? "x64" : "unknown";
  return { os, arch, platform: `${os}-${arch}` };
}

/** Confirm the current platform and architecture are declared in the pointer. */
function requireSupportedSystem(install, platform) {
  const supported = install.systems.some((system) => system.os === platform.os && Array.isArray(system.architectures) && system.architectures.includes(platform.arch));
  if (!supported) throw new InstallerError(EXIT.REQUIREMENT, `unsupported system: ${platform.platform}`);
}

/** Resolve the concrete release asset name from the ficha's pattern and asset type. */
function assetName(install, version, platform) {
  let pattern = install.asset.pattern.replaceAll("<ver>", version).replaceAll("<plat>", platform.os).replaceAll("<arch>", platform.arch);
  if (install.asset.type === "binary-tar-gzip-or-zip") pattern = pattern.replace(/\.tar\.gz\|\.zip$/, platform.os === "windows" ? ".zip" : ".tar.gz");
  pattern = pattern.replace("[.exe]", platform.os === "windows" ? ".exe" : "");
  if (!pattern || pattern.includes("<") || pattern.includes("|")) throw new InstallerError(EXIT.REQUIREMENT, "install.asset.pattern cannot resolve this platform");
  return pattern;
}

/** Read a SemVer-like version from a launcher's human or JSON output. */
async function installedVersion(launcher) {
  const result = await run(launcher, ["--version"], { allowFailure: true });
  if (result.code !== 0) return undefined;
  const match = /(?:forge614-[a-z0-9-]+\s+)?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/.exec(result.stdout.trim());
  return match?.[1];
}

/** Run an executable with bounded time and capture its output. */
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { windowsHide: true, shell: process.platform === "win32" && /\.cmd$/i.test(command), stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGKILL"), options.timeout ?? 15_000);
    child.stdout?.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
    child.stderr?.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !options.allowFailure) reject(new Error(stderr || `process exited with ${code}`));
      else resolvePromise({ code, stdout, stderr });
    });
  });
}

/** Check a dependency's installed version and required capabilities. */
async function dependencyCompatible(dependency, home) {
  const dir = join(home, dependency.node);
  const candidates = [`forge614-${dependency.node}`, `forge614-${dependency.node}.exe`, `forge614-${dependency.node}.cmd`];
  let launcher;
  for (const candidate of candidates) {
    try {
      await lstat(join(dir, "bin", candidate));
      launcher = join(dir, "bin", candidate);
      break;
    } catch {}
  }
  if (!launcher) return false;
  const version = await installedVersion(launcher);
  if (!version) return false;
  if (dependency.minimumVersion && compareVersions(version, dependency.minimumVersion) < 0) return false;
  if (Array.isArray(dependency.requiredCapabilities) && dependency.requiredCapabilities.length > 0) {
    const result = await run(launcher, ["--capabilities", "--json"], { allowFailure: true });
    if (result.code !== 0) return false;
    try {
      const capabilities = JSON.parse(result.stdout).capabilities;
      if (!dependency.requiredCapabilities.every((item) => capabilities.includes(item))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Download and run a dependency's verified common installer if it is incompatible. */
async function ensureDependencies(install, home, testBase) {
  if (install.dependencies.length > 0) await mkdir(home, { recursive: true });
  for (const dependency of install.dependencies) {
    if (await dependencyCompatible(dependency, home)) continue;
    if (dependency.compatibility === "installed" && !dependency.minimumVersion && !dependency.requiredCapabilities?.length) {
      // An absent node still needs its release metadata, fetched below.
    } else if (dependency.minimumVersion && !dependency.requiredCapabilities?.length && await dependencyCompatible(dependency, home)) continue;
    const repository = `jotredev/forge614-${dependency.node}`;
    const dependencyTag = await latestTag(repository, testBase);
    const sums = await download(assetUrl(repository, dependencyTag, "SHA256SUMS", testBase));
    const installer = await verifiedAsset(repository, dependencyTag, "install.mjs", sums, testBase);
    const pointerBytes = await verifiedAsset(repository, dependencyTag, "forge614.node.json", sums, testBase);
    parsePointer(pointerBytes);
    const temp = join(home, `.dependency-${dependency.node}-${randomUUID()}.mjs`);
    await writeFile(temp, installer, { mode: 0o600 });
    try {
      const args = [temp, "--latest", "--force"];
      const child = await run(process.execPath, args, {
        env: { ...process.env, FORGE614_HOME: home, FORGE614_INSTALL_REPOSITORY: repository, FORGE614_INSTALL_NODE: dependency.node },
        timeout: 120_000,
        allowFailure: true,
      });
      if (child.code === EXIT.DOWNLOAD) throw new InstallerError(EXIT.DOWNLOAD, child.stderr || `dependency ${dependency.node} download failed`);
      if (child.code !== 0 || !(await dependencyCompatible(dependency, home))) {
        throw new InstallerError(EXIT.DEPENDENCY, `dependency ${dependency.node} is incompatible`);
      }
    } catch (error) {
      if (error instanceof InstallerError) throw error;
      throw new InstallerError(EXIT.DEPENDENCY, `dependency ${dependency.node} could not be installed`);
    } finally {
      await rm(temp, { force: true });
    }
  }
}

/** Write bytes through a temporary sibling and atomic rename. */
async function atomicWrite(path, bytes, mode) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, bytes, mode === undefined ? undefined : { mode });
  await rename(temp, path);
}

/** Remove a legacy marked PATH block and append the current block once. */
async function updatePath(home, nodeName, binDir, platform) {
  const begin = `# >>> forge614-${nodeName} PATH >>>`;
  const end = `# <<< forge614-${nodeName} PATH <<<`;
  const profiles = platform.os === "windows"
    ? [join(home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"), join(home, "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1")]
    : [join(home, ".zshrc"), join(home, ".bash_profile"), join(home, ".bashrc"), join(home, ".profile")];
  for (const profile of profiles) {
    let content = "";
    try { content = await readFile(profile, "utf8"); } catch {}
    const lines = content.split(/\r?\n/);
    const kept = [];
    let skip = false;
    for (const line of lines) {
      if (line === begin) { skip = true; continue; }
      if (line === end) { skip = false; continue; }
      if (!skip) kept.push(line);
    }
    const pathLine = platform.os === "windows" ? `$env:Path = "${binDir};$env:Path"` : `export PATH="${binDir}:$PATH"`;
    const next = `${kept.join("\n").replace(/\n+$/, "")}${kept.join("").length ? "\n" : ""}${begin}\n${pathLine}\n${end}\n`;
    if (next !== content) await atomicWrite(profile, Buffer.from(next), 0o600);
  }
}

/** Return true if a path exists without following a missing path error. */
async function pathExists(path) {
  try { await lstat(path); return true; } catch { return false; }
}

/** Extract a gzip-compressed tar archive while rejecting paths outside the destination. */
async function extractTarGzip(bytes, destination) {
  const tar = gunzipSync(bytes);
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const entry = prefix ? `${prefix}/${name}` : name;
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
    const type = String.fromCharCode(header[156] ?? 48);
    const target = resolve(destination, entry);
    if (target !== destination && !target.startsWith(`${destination}${sep}`)) throw new InstallerError(EXIT.DOWNLOAD, "archive contains an unsafe path");
    const dataStart = offset + 512;
    const data = tar.subarray(dataStart, dataStart + size);
    if (type === "5") await mkdir(target, { recursive: true });
    else if (type === "0" || type === "\0") {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data, { mode: Number.parseInt(header.subarray(100, 108).toString("ascii").trim() || "644", 8) & 0o777 });
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
}

/** Extract a ZIP archive using its central directory and Node's built-in inflater. */
async function extractZip(bytes, destination) {
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new InstallerError(EXIT.DOWNLOAD, "ZIP archive is invalid");
  const entries = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  for (let index = 0; index < entries; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new InstallerError(EXIT.DOWNLOAD, "ZIP directory is invalid");
    const method = bytes.readUInt16LE(offset + 10);
    const compressed = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const dataOffset = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    const compressedBytes = bytes.subarray(dataOffset, dataOffset + compressed);
    const data = method === 0 ? compressedBytes : method === 8 ? inflateRawSync(compressedBytes) : undefined;
    if (!data) throw new InstallerError(EXIT.DOWNLOAD, "ZIP compression is unsupported");
    const target = resolve(destination, name);
    if (target !== destination && !target.startsWith(`${destination}${sep}`)) throw new InstallerError(EXIT.DOWNLOAD, "archive contains an unsafe path");
    if (name.endsWith("/")) await mkdir(target, { recursive: true });
    else { await mkdir(dirname(target), { recursive: true }); await writeFile(target, data); }
    offset += 46 + nameLength + extraLength + commentLength;
  }
}

/** Extract a verified asset according to its declared format and return its launcher file. */
async function prepareAsset(install, asset, name, nodeName, directory, platform) {
  if (install.asset.type === "raw-binary") {
    const extension = platform.os === "windows" ? (name.endsWith(".exe") ? ".exe" : name.endsWith(".cmd") ? ".cmd" : ".exe") : "";
    const file = join(directory, `forge614-${nodeName}${extension}`);
    await writeFile(file, asset, { mode: 0o755 });
    return file;
  }
  if (install.asset.type === "binary-tar-gzip" || install.asset.type === "binary-tar-gzip-or-zip" || install.asset.type === "node-package-tar-gzip") {
    if (name.endsWith(".zip")) await extractZip(asset, directory);
    else await extractTarGzip(asset, directory);
    const wanted = platform.os === "windows" ? [`forge614-${nodeName}.exe`, `forge614-${nodeName}.cmd`] : [`forge614-${nodeName}`];
    const found = await findFile(directory, wanted);
    if (!found) throw new InstallerError(EXIT.DOWNLOAD, `archive has no forge614-${nodeName} launcher`);
    if (platform.os !== "windows") await chmod(found, 0o755);
    return found;
  }
  throw new InstallerError(EXIT.REQUIREMENT, `unsupported asset type: ${install.asset.type}`);
}

/** Find one of the expected launcher names under an extracted directory. */
async function findFile(directory, names) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isFile() && names.includes(entry.name)) return path;
    if (entry.isDirectory()) {
      const nested = await findFile(path, names);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Migrate an unversioned regular launcher into a retained legacy folder. */
async function migrateFlatInstall(nodeHome, launcher) {
  if (!(await pathExists(launcher))) return;
  const info = await lstat(launcher);
  if (info.isSymbolicLink()) return;
  const active = join(nodeHome, `legacy-${Date.now()}`);
  await mkdir(active, { recursive: true });
  await rename(launcher, join(active, info.isFile() ? launcher.split(/[\\/]/).at(-1) : "launcher"));
}

/** Publish the new version and stable launcher with rollback on every failed write. */
async function activate(nodeName, version, nodeHome, stagedDir, stagedLauncher, binDir, platform, pathModify, home) {
  const versionDir = join(nodeHome, version);
  const activeFile = join(nodeHome, ".active-version");
  const launcherName = `forge614-${nodeName}${platform.os === "windows" && stagedLauncher.endsWith(".cmd") ? ".cmd" : platform.os === "windows" ? ".exe" : ""}`;
  const launcher = join(binDir, launcherName);
  const previousVersion = await readFile(activeFile, "utf8").then((value) => value.trim()).catch(() => "");
  const previousLauncher = await pathExists(launcher) ? join(nodeHome, `.launcher-backup-${randomUUID()}`) : "";
  const previousVersionDir = await pathExists(versionDir) ? join(nodeHome, `.version-backup-${randomUUID()}`) : "";
  await mkdir(nodeHome, { recursive: true });
  await mkdir(binDir, { recursive: true });
  if (previousLauncher) await rename(launcher, previousLauncher);
  try {
    if (previousVersionDir) await rename(versionDir, previousVersionDir);
    await rename(stagedDir, versionDir);
    const relativeTarget = join(versionDir, stagedLauncher.slice(stagedDir.length + 1));
    if (platform.os === "windows") await copyFile(relativeTarget, launcher);
    else {
      const tempLink = `${launcher}.${randomUUID()}.tmp`;
      await symlink(relativeTarget, tempLink);
      await rename(tempLink, launcher);
    }
    await atomicWrite(activeFile, Buffer.from(`${version}\n`));
    if (pathModify) await updatePath(home, nodeName, binDir, platform);
    if (previousLauncher) await rm(previousLauncher, { force: true });
    if (previousVersionDir) await rm(previousVersionDir, { recursive: true, force: true });
  } catch (error) {
    await rm(launcher, { force: true }).catch(() => {});
    if (previousLauncher && await pathExists(previousLauncher)) await rename(previousLauncher, launcher).catch(() => {});
    if (previousVersion) await atomicWrite(activeFile, Buffer.from(`${previousVersion}\n`)).catch(() => {});
    await rm(versionDir, { recursive: true, force: true }).catch(() => {});
    if (previousVersionDir && await pathExists(previousVersionDir)) await rename(previousVersionDir, versionDir).catch(() => {});
    throw error;
  }
}

/** Execute installation arguments and convert failures to the documented exit codes. */
async function main(argv) {
  const options = parseArguments(argv);
  if (options.help) { process.stdout.write(`${message("help")}\n`); return EXIT.OK; }
  checkNodeVersion();
  const home = forgeHome();
  const testBase = testBaseUrl();
  const repositoryHint = process.env.FORGE614_INSTALL_REPOSITORY;
  if (!repositoryHint) throw new InstallerError(EXIT.REQUIREMENT, "install repository is not available");
  const tag = options.version ? (options.version.startsWith("v") ? options.version : `v${options.version}`) : await latestTag(repositoryHint, testBase);
  const sums = await download(assetUrl(repositoryHint, tag, "SHA256SUMS", testBase));
  const pointerBytes = await verifiedAsset(repositoryHint, tag, "forge614.node.json", sums, testBase);
  const { node, install } = parsePointer(pointerBytes);
  if (install.repository !== repositoryHint) throw new InstallerError(EXIT.REQUIREMENT, "release repository does not match install.repository");
  if (process.env.FORGE614_INSTALL_NODE && process.env.FORGE614_INSTALL_NODE !== node) throw new InstallerError(EXIT.REQUIREMENT, "release node does not match the gatekeeper");
  if (options.uninstall) return await uninstallNode(node, home, options.binDir);
  const platform = currentPlatform();
  requireSupportedSystem(install, platform);
  await ensureDependencies(install, home, testBase);
  const nodeHome = join(home, node);
  const activeFile = join(nodeHome, ".active-version");
  const previousVersion = await readFile(activeFile, "utf8").then((value) => value.trim()).catch(() => "");
  const version = tag.replace(/^v/, "");
  if (previousVersion === version && !options.force) {
    process.stdout.write(`${message("current", { node, version })}\n`);
    return EXIT.OK;
  }
  const name = assetName(install, version, platform);
  let asset;
  if (options.archive) {
    asset = await readFile(resolve(options.archive)).catch(() => { throw new InstallerError(EXIT.DOWNLOAD, "archive could not be read"); });
    const expected = sums.toString("utf8").split(/\r?\n/).find((line) => line.endsWith(`  ${name}`))?.slice(0, 64);
    if (!expected || createHash("sha256").update(asset).digest("hex") !== expected) throw new InstallerError(EXIT.DOWNLOAD, `SHA-256 mismatch for ${name}`);
  } else asset = await verifiedAsset(install.repository, tag, name, sums, testBase);
  const stage = join(nodeHome, `.install-${randomUUID()}`);
  await mkdir(stage, { recursive: true });
  try {
    const stagedLauncher = await prepareAsset(install, asset, name, node, stage, platform);
    const smoke = await run(stagedLauncher, install.smokeTest ?? ["--version"], { allowFailure: true });
    if (smoke.code !== 0 || !smoke.stdout.trim()) throw new Error("smoke test failed");
    await migrateFlatInstall(nodeHome, join(options.binDir ? resolve(options.binDir) : join(nodeHome, "bin"), `forge614-${node}${platform.os === "windows" ? ".exe" : ""}`));
    await activate(node, version, nodeHome, stage, stagedLauncher, options.binDir ? resolve(options.binDir) : join(nodeHome, "bin"), platform, install.path?.modify === true, process.env.HOME ?? process.env.USERPROFILE ?? "");
    process.stdout.write(`${message(previousVersion ? "updated" : "installed", { node, previous: previousVersion, version })}\n`);
    return EXIT.OK;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

/** Run the node's self-uninstall hook, then delete only its Forge614 home. */
async function uninstallNode(node, home, binDirOverride) {
  const nodeHome = join(home, node);
  const binDir = binDirOverride ? resolve(binDirOverride) : join(nodeHome, "bin");
  const launcherCandidates = [`forge614-${node}`, `forge614-${node}.exe`, `forge614-${node}.cmd`];
  for (const name of launcherCandidates) {
    const launcher = join(binDir, name);
    if (!(await pathExists(launcher))) continue;
    const result = await run(launcher, ["uninstall", "--self"], { allowFailure: true });
    if (result.code !== 0) throw new InstallerError(EXIT.REQUIREMENT, result.stderr || "node refused to remove its integrations");
    break;
  }
  await rm(nodeHome, { recursive: true, force: true });
  process.stdout.write(`${message("removed", { node })}\n`);
  return EXIT.OK;
}

/** Print one stable error to stderr and return its documented process code. */
function reportError(error) {
  const known = error instanceof InstallerError ? error : new InstallerError(EXIT.REQUIREMENT, error instanceof Error ? error.message : "installation failed");
  let text = known.message;
  if (locale() === "es" && text !== "INVALID_FORGE614_HOME") {
    text = known.code === EXIT.USAGE ? "Uso inválido del instalador Forge614." :
      known.code === EXIT.REQUIREMENT ? "No se cumple un requisito local para instalar Forge614." :
        known.code === EXIT.DOWNLOAD ? "No se pudo descargar o verificar la release de Forge614." :
          known.code === EXIT.DEPENDENCY ? "Una dependencia de Forge614 no es compatible." : text;
  }
  process.stderr.write(`${text}\n`);
  return known.code;
}

const exitCode = await main(process.argv.slice(2)).catch(reportError);
process.exitCode = exitCode;
