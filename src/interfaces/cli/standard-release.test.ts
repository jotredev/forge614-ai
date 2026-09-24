import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "standard-release.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");
const VERSION = readFileSync(resolve(REPO_ROOT, "standard/VERSION"), "utf8").trim();
const TAG = `standard-v${VERSION}`;

// The CLI reads GITHUB_REF_NAME from the environment, which `run` otherwise
// inherits from the test runner's own process. A CI runner sets that
// variable (to the branch or the merge ref), so tests that need it absent or
// pinned to a specific value must build their own env instead of relying on
// whatever happens to be inherited.
function envWithout(...omit: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || omit.includes(key)) continue;
    env[key] = value;
  }
  return env;
}

test("an unknown flag fails with INVALID_ARGUMENTS and exit 2", () => {
  const r = run(["bun", "run", CLI, "--tag", TAG, "--dry-rn"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("without --tag and without GITHUB_REF_NAME it fails with INVALID_ARGUMENTS", () => {
  const r = run(["bun", "run", CLI, "--dry-run"], { cwd: REPO_ROOT, env: envWithout("GITHUB_REF_NAME") });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("--tag overrides GITHUB_REF_NAME when both are present", () => {
  const env = { ...envWithout("GITHUB_REF_NAME"), GITHUB_REF_NAME: "standard-v9.9.9" };
  const r = run(["bun", "run", CLI, "--tag", TAG, "--dry-run"], { cwd: REPO_ROOT, env });
  expect(r.exitCode).toBe(0);
  const out: unknown = JSON.parse(r.stdout.trim());
  expect(out).toMatchObject({ schemaVersion: 1, ok: true, version: VERSION, published: false });
});

test("--dry-run with --tag prints the plan and exits 0 without publishing", () => {
  const r = run(["bun", "run", CLI, "--tag", TAG, "--dry-run"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  const out: unknown = JSON.parse(r.stdout.trim());
  expect(out).toMatchObject({ schemaVersion: 1, ok: true, version: VERSION, published: false });
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
