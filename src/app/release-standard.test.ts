import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NodePointerSchema } from "../modules/standard/schemas";
import { releaseStandard, STANDARD_TAG_PATTERN } from "./release-standard";

const REPO_ROOT = resolve(import.meta.dir, "../..");
// The tree's own version: these tests pack the real standard/, so the tag
// must name whatever standard/VERSION declares today.
const VERSION = readFileSync(join(REPO_ROOT, "standard/VERSION"), "utf8").trim();
const TAG = `standard-v${VERSION}`;

type Call = { cmd: string[]; cwd?: string };
function fakeExec(calls: Call[], result = { exitCode: 0, stdout: `https://github.com/jotredev/forge614-ai/releases/tag/${TAG}\n`, stderr: "" }) {
  return (cmd: string[], options?: { cwd?: string }) => {
    calls.push({ cmd, ...(options?.cwd === undefined ? {} : { cwd: options.cwd }) });
    return result;
  };
}

test("the tag pattern accepts standard-vX.Y.Z only", () => {
  expect(STANDARD_TAG_PATTERN.test("standard-v1.0.0")).toBe(true);
  expect(STANDARD_TAG_PATTERN.test("v1.0.0")).toBe(false);
  expect(STANDARD_TAG_PATTERN.test("standard-v1.0")).toBe(false);
});

test("dry run packs, verifies the pointer and returns the gh command without executing it", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: TAG, outDir: out, exec: fakeExec(calls), dryRun: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.version).toBe(VERSION);
    expect(r.published).toBe(false);
    expect(calls).toHaveLength(0);
    expect(r.command.slice(0, 4)).toEqual(["gh", "release", "create", TAG]);
    expect(r.assets).toEqual([join(out, `standard-${VERSION}.tar.gz`), join(out, "SHA256SUMS"), join(out, "pack-manifest.json")]);
    expect(readFileSync(join(out, "SHA256SUMS"), "utf8")).toContain(r.sha256);
    const pointer = NodePointerSchema.parse(JSON.parse(readFileSync(join(REPO_ROOT, "forge614.node.json"), "utf8")));
    expect(r.sha256).toBe(pointer.standard.sha256);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a tag whose version differs from standard/VERSION fails with STANDARD_RELEASE_TAG_MISMATCH and calls nothing", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: "standard-v9.9.9", outDir: out, exec: fakeExec(calls), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_TAG_MISMATCH" });
    expect(calls).toHaveLength(0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a pointer that does not match the tree fails with STANDARD_PACK_DRIFT before publishing", () => {
  // Minimal copy of the repo with the pointer altered: only standard/ and forge614.node.json are needed.
  const root = mkdtempSync(join(tmpdir(), "standard-release-root-"));
  const calls: Call[] = [];
  try {
    cpSync(join(REPO_ROOT, "standard"), join(root, "standard"), { recursive: true });
    const pointer = NodePointerSchema.parse(JSON.parse(readFileSync(join(REPO_ROOT, "forge614.node.json"), "utf8")));
    pointer.standard.sha256 = "0".repeat(64);
    writeFileSync(join(root, "forge614.node.json"), `${JSON.stringify(pointer, null, 2)}\n`);
    const r = releaseStandard({ root, tag: TAG, outDir: join(root, "dist"), exec: fakeExec(calls), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_PACK_DRIFT" });
    expect(calls).toHaveLength(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failing gh (release already exists) surfaces STANDARD_RELEASE_FAILED with gh's stderr", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  const calls: Call[] = [];
  try {
    const r = releaseStandard({ root: REPO_ROOT, tag: TAG, outDir: out, exec: fakeExec(calls, { exitCode: 1, stdout: "", stderr: `release ${TAG} already exists` }), dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_FAILED" });
    if (r.ok) return;
    expect(r.error).toContain("already exists");
    expect(calls).toHaveLength(1);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("a missing gh binary is reported as STANDARD_RELEASE_FAILED, not thrown", () => {
  const out = mkdtempSync(join(tmpdir(), "standard-release-"));
  try {
    const exec = () => { throw new Error("spawn gh ENOENT"); };
    const r = releaseStandard({ root: REPO_ROOT, tag: TAG, outDir: out, exec, dryRun: false });
    expect(r).toMatchObject({ ok: false, code: "STANDARD_RELEASE_FAILED" });
    if (r.ok) return;
    expect(r.error).toContain("gh");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
