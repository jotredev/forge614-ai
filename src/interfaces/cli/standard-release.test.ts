import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "standard-release.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("an unknown flag fails with INVALID_ARGUMENTS and exit 2", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v1.0.0", "--dry-rn"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("without --tag and without GITHUB_REF_NAME it fails with INVALID_ARGUMENTS", () => {
  const r = run(["bun", "run", CLI, "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("--dry-run with --tag prints the plan and exits 0 without publishing", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v1.0.0", "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  const out: unknown = JSON.parse(r.stdout.trim());
  expect(out).toMatchObject({ schemaVersion: 1, ok: true, version: "1.0.0", published: false });
});

test("a mismatching tag exits 1 with STANDARD_RELEASE_TAG_MISMATCH", () => {
  const r = run(["bun", "run", CLI, "--tag", "standard-v9.9.9", "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(1);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "STANDARD_RELEASE_TAG_MISMATCH" });
});

test("--help prints the usage envelope and exits 0", () => {
  const r = run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  expect(JSON.parse(r.stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "standard-release [--tag standard-vX.Y.Z] [--dry-run]" });
});
