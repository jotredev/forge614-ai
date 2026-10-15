#!/usr/bin/env node

// Stage the release installer set and create a single GNU SHA256SUMS file.

import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Compute a lowercase SHA-256 digest for release bytes. */
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Read the node pointer and require the identity used to validate its program assets. */
async function readNodePointer(root) {
  let pointer;
  try {
    pointer = JSON.parse(await readFile(join(root, "forge614.node.json"), "utf8"));
  } catch {
    throw new Error("forge614.node.json could not be read");
  }
  if (typeof pointer.node !== "string" || !/^[a-z0-9-]+$/.test(pointer.node)) throw new Error("forge614.node.json has an invalid node");
  if (typeof pointer.install?.repository !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(pointer.install.repository)) {
    throw new Error("forge614.node.json has an invalid install.repository");
  }
  return pointer;
}

/** Copy the rendered installer files and pointer into the release directory unchanged. */
async function copyInstallerSet(root, releaseDir) {
  for (const name of ["install.sh", "install.ps1", "install.mjs", "forge614.node.json"]) {
    await copyFile(join(root, name), join(releaseDir, name));
  }
  await chmod(join(releaseDir, "install.sh"), 0o755);
}

/** Resolve a node asset pattern to its concrete release filename for one declared system. */
function resolveProgramAsset(pattern, nodeName, version, os, arch) {
  return pattern
    .replaceAll("<node>", nodeName)
    .replaceAll("<ver>", version)
    .replaceAll("<plat>", os)
    .replaceAll("<arch>", arch)
    .replace("[.exe]", os === "windows" ? ".exe" : "")
    .replace(/\.tar\.gz\|\.zip$/, os === "windows" ? ".zip" : ".tar.gz");
}

/** List release files and require every program asset declared by install.systems. */
async function releaseFiles(releaseDir, pointer, version) {
  const entries = await readdir(releaseDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name !== "SHA256SUMS").map((entry) => entry.name).sort();
  const install = pointer.install;
  if (!Array.isArray(install?.systems) || typeof install?.asset?.pattern !== "string") {
    throw new Error("forge614.node.json has no install.systems asset pattern");
  }
  for (const system of install.systems) {
    for (const arch of system.architectures ?? []) {
      const expected = resolveProgramAsset(install.asset.pattern, pointer.node, version, system.os, arch);
      if (!files.includes(expected)) throw new Error(`release is missing declared program asset: ${expected}`);
    }
  }
  return files;
}

/** Write one GNU-format SHA256SUMS file over every regular file in dist/release. */
async function writeManifest(releaseDir, files) {
  const lines = [];
  for (const name of files) lines.push(`${sha256(await readFile(join(releaseDir, name)))}  ${name}`);
  const target = join(releaseDir, "SHA256SUMS");
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${lines.join("\n")}\n`, { mode: 0o644 });
  await rename(temporary, target);
}

/** Prepare the exact file set consumed by the release publishing step. */
async function main() {
  const root = process.cwd();
  const releaseDir = join(root, "dist", "release");
  const pointer = await readNodePointer(root);
  const version = (await readFile(join(root, "VERSION"), "utf8")).trim().replace(/^v/, "");
  await mkdir(releaseDir, { recursive: true });
  await copyInstallerSet(root, releaseDir);
  const files = await releaseFiles(releaseDir, pointer, version);
  await writeManifest(releaseDir, files);
  process.stdout.write(`Prepared ${files.length} release files for forge614-${pointer.node}.\n`);
}

await main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "release preparation failed"}\n`);
  process.exitCode = 1;
});
