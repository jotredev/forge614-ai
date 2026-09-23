import { expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { readTree } from "../infrastructure/fs-tree";
import { run } from "../infrastructure/process";
import { buildUstarArchive } from "../modules/standard/tar";
import { collectTarEntries, packStandard, PackManifestSchema } from "./pack-standard";

const REPO_ROOT = resolve(import.meta.dir, "../..");

function hasSystemTar(): boolean {
  try {
    return run(["tar", "--version"]).exitCode === 0;
  } catch {
    return false;
  }
}

// Members the archive must contain (standard/'s exact top-level set, acta
// 0025 / coordinator ruling #3). A "must" is matched either as an exact
// top-level entry ("VERSION") or as a directory anywhere in the archive
// ("rules/").
const REQUIRED_MEMBERS = [
  "VERSION",
  "STANDARD.md",
  "STANDARD.en.md",
  "rules/",
  "packs/",
  "templates/",
  "schemas/",
  "procedures/",
  "support-matrix.json",
  "forbidden-mentions.json",
  "FORGE614_ECOSYSTEM_CONTRACT.md",
  "FORGE614_ECOSYSTEM_CONTRACT.en.md",
];

const TOP_LEVEL = new Set([
  "VERSION",
  "STANDARD.md",
  "STANDARD.en.md",
  "FORGE614_ECOSYSTEM_CONTRACT.md",
  "FORGE614_ECOSYSTEM_CONTRACT.en.md",
  "rules/",
  "packs/",
  "templates/",
  "schemas/",
  "procedures/",
  "support-matrix.json",
  "forbidden-mentions.json",
]);

test("archive contains the standard tree and SHA256SUMS matches", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(REPO_ROOT, out);

  expect(r.archive).toBe(join(out, `standard-${r.version}.tar.gz`));

  for (const must of REQUIRED_MEMBERS) {
    expect(r.entries.some((l) => l === must || l.endsWith(`/${must}`)), must).toBe(true);
  }

  const sums = readFileSync(join(out, "SHA256SUMS"), "utf8");
  expect(sums).toContain(`${r.sha256}  standard-${r.version}.tar.gz`);
});

test("the archive's top-level set is exactly the standard's public surface, nothing else", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(REPO_ROOT, out);

  const topLevel = new Set(r.entries.filter((l) => l.split("/").filter(Boolean).length === 1));
  expect(topLevel).toEqual(TOP_LEVEL);

  // No test files, no .superpowers, no node_modules leak into the archive.
  for (const entry of r.entries) {
    expect(entry.includes(".test.")).toBe(false);
    expect(entry.includes(".superpowers")).toBe(false);
    expect(entry.includes("node_modules")).toBe(false);
  }
});

test("the archive bytes are a gzip member whose tar headers match the reported entries, in order", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(REPO_ROOT, out);
  const tar = new Uint8Array(gunzipSync(readFileSync(r.archive)));
  const decoder = new TextDecoder();
  const names: string[] = [];
  let offset = 0;
  while (offset + 512 <= tar.length && tar[offset] !== 0) {
    const header = tar.subarray(offset, offset + 512);
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, "");
    const size = parseInt(decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, ""), 8);
    names.push(name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  expect(names).toEqual(r.entries);
  expect(tar.length % 10240).toBe(0);
});

test.skipIf(!hasSystemTar())("the produced archive is readable by the system tar and lists exactly the reported entries", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(REPO_ROOT, out);
  const listed = run(["tar", "-tzf", r.archive]);
  expect(listed.exitCode).toBe(0);
  expect(listed.stdout.trim().split("\n")).toEqual(r.entries);
});

test("packing twice over the same tree produces a byte-identical archive (deterministic)", () => {
  const outA = mkdtempSync(join(tmpdir(), "pack-a-"));
  const outB = mkdtempSync(join(tmpdir(), "pack-b-"));

  const a = packStandard(REPO_ROOT, outA);
  const b = packStandard(REPO_ROOT, outB);

  expect(a.sha256).toBe(b.sha256);
  const bytesA = readFileSync(a.archive);
  const bytesB = readFileSync(b.archive);
  expect(Buffer.compare(bytesA, bytesB)).toBe(0);
});

test("packStandard does not mutate the source standard/ tree", () => {
  const standardDir = resolve(REPO_ROOT, "standard");
  const before = readTree(standardDir);
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  packStandard(REPO_ROOT, out);
  const after = readTree(standardDir);
  expect(Object.fromEntries(after.files)).toEqual(Object.fromEntries(before.files));
});

test("the archive is written atomically: no temp file is left next to it", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  const r = packStandard(REPO_ROOT, out);
  expect(readdirSync(out).sort()).toEqual(["SHA256SUMS", "pack-manifest.json", `standard-${r.version}.tar.gz`]);
});

// The header mode is derived from content (shebang → 0755, else 0644,
// directories 0755), never from the on-disk mode: Windows has no execute bit,
// so a checkout there must still produce the same header bytes. The test
// therefore runs on every platform and deliberately sets on-disk modes that
// CONTRADICT the expected header modes.
test("collectTarEntries gives a shebang file 0755 and a plain file 0644 regardless of their on-disk mode, and a directory 0755", () => {
  const dir = mkdtempSync(join(tmpdir(), "pack-modes-"));
  try {
    mkdirSync(join(dir, "hooks"), { mode: 0o700 });
    // shebang file written WITHOUT the execute bit on disk
    writeFileSync(join(dir, "hooks", "pre-push"), "#!/bin/sh\n", { mode: 0o644 });
    // plain file marked executable on disk (no-op on Windows, which has no execute bit)
    writeFileSync(join(dir, "VERSION"), "1.0.0\n");
    if (process.platform !== "win32") chmodSync(join(dir, "VERSION"), 0o755);

    const entries = collectTarEntries(dir);
    expect(entries.map((e) => e.path)).toEqual(["VERSION", "hooks/", "hooks/pre-push"]);

    const decoder = new TextDecoder();
    const tar = buildUstarArchive(entries);
    const modeAt = (block: number): string => decoder.decode(tar.subarray(block * 512 + 100, block * 512 + 108));
    expect(modeAt(0)).toBe("0000644\0"); // VERSION: plain content → 0644 even though 0755 on disk
    expect(modeAt(2)).toBe("0000755\0"); // hooks/: directory → 0755 even though 0700 on disk
    expect(modeAt(3)).toBe("0000755\0"); // hooks/pre-push: shebang → 0755 even though 0644 on disk
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writes a generated dist/pack-manifest.json with a per-rule token estimate (acta 0020) without touching standard/", () => {
  const out = mkdtempSync(join(tmpdir(), "pack-"));
  packStandard(REPO_ROOT, out);

  const manifestPath = join(out, "pack-manifest.json");
  expect(existsSync(manifestPath)).toBe(true);
  const manifest = PackManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));

  expect(manifest.schemaVersion).toBe(1);
  expect(manifest.rules.length).toBeGreaterThan(0);
  for (const rule of manifest.rules) {
    expect(rule.estimate).toBe(true);
    expect(rule.tokens).toBeGreaterThan(0);
  }
  expect(manifest.packIndex.estimate).toBe(true);
  expect(manifest.packIndex.tokens).toBeGreaterThan(0);

  // None of the source rule manifests gained a `tokens` field from packing.
  const additiveEvolutionManifest = readFileSync(resolve(REPO_ROOT, "standard/rules/forge614-rule-additive-evolution/manifest.json"), "utf8");
  expect(additiveEvolutionManifest.includes('"tokens"')).toBe(false);
});
