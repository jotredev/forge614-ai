import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { run } from "../../infrastructure/process";

const CLI = resolve(import.meta.dir, "not-implemented.ts");
const REPO_ROOT = resolve(import.meta.dir, "../../..");

test("a valid script name fails with NOT_IMPLEMENTED and exit 1", () => {
  const r = run(["bun", "run", CLI, "build:target"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(1);
  expect(r.stdout).toBe("");
  const envelope: unknown = JSON.parse(r.stderr.trim());
  expect(envelope).toEqual({ schemaVersion: 1, code: "NOT_IMPLEMENTED", error: "build:target arrives in phase 0.4 (shared bun release)" });
});

test("the error message names the script that was asked for", () => {
  const r = run(["bun", "run", CLI, "release:publish"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(1);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ code: "NOT_IMPLEMENTED", error: "release:publish arrives in phase 0.4 (shared bun release)" });
});

test("a missing script name fails with INVALID_ARGUMENTS and exit 2", () => {
  const r = run(["bun", "run", CLI], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(r.stdout).toBe("");
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("a name outside <group>:<name> is rejected the same way", () => {
  const r = run(["bun", "run", CLI, "build-target"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(2);
  expect(JSON.parse(r.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("a second positional argument or a flag is rejected the same way", () => {
  const extra = run(["bun", "run", CLI, "build:target", "smoke:target"], { cwd: REPO_ROOT });
  expect(extra.exitCode).toBe(2);
  expect(JSON.parse(extra.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
  const flag = run(["bun", "run", CLI, "build:target", "--force"], { cwd: REPO_ROOT });
  expect(flag.exitCode).toBe(2);
  expect(JSON.parse(flag.stderr.trim())).toMatchObject({ schemaVersion: 1, code: "INVALID_ARGUMENTS" });
});

test("--help prints the usage envelope and exits 0", () => {
  const r = run(["bun", "run", CLI, "--help"], { cwd: REPO_ROOT });
  expect(r.exitCode).toBe(0);
  expect(JSON.parse(r.stdout.trim())).toMatchObject({ schemaVersion: 1, usage: "not-implemented <group>:<script>" });
});
