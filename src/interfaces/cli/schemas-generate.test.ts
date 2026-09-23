import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "schemas-generate.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("an unknown flag (typo) fails with INVALID_ARGUMENTS and exit 2 instead of running", () => {
  const r = run(["bun", "run", CLI, "--chekc"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(r.stdout).toBe("");
  const envelope: unknown = JSON.parse(r.stderr.trim());
  expect(envelope).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("a positional argument is rejected the same way", () => {
  const r = run(["bun", "run", CLI, "docs"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("--help prints the usage envelope and exits 0", () => {
  const r = run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  expect(JSON.parse(r.stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "schemas-generate [--check]" });
});
