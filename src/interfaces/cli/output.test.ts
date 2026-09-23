import { afterEach, beforeEach, expect, test } from "bun:test";
import { printError, printJson, runCli } from "./output";

let stdoutSpy: string[] = [];
let stderrSpy: string[] = [];
let stdoutWrite: typeof process.stdout.write;
let stderrWrite: typeof process.stderr.write;

beforeEach(() => {
  stdoutSpy = [];
  stderrSpy = [];
  stdoutWrite = process.stdout.write.bind(process.stdout);
  stderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = ((chunk: string) => {
    stdoutSpy.push(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    stderrSpy.push(chunk);
    return true;
  }) as typeof process.stderr.write;
});

afterEach(() => {
  process.stdout.write = stdoutWrite;
  process.stderr.write = stderrWrite;
});

test("printJson writes a single JSON line to stdout", () => {
  printJson({ schemaVersion: 1, written: ["a"] });
  expect(stdoutSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, written: ["a"] })}\n`]);
});

test("printError writes an error envelope to stderr with default schemaVersion", () => {
  printError("SCHEMA_UNSUPPORTED", "boom");
  expect(stderrSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, code: "SCHEMA_UNSUPPORTED", error: "boom" })}\n`]);
});

test("printError accepts an explicit schemaVersion", () => {
  printError("SCHEMA_UNSUPPORTED", "boom", 2);
  expect(stderrSpy).toEqual([`${JSON.stringify({ schemaVersion: 2, code: "SCHEMA_UNSUPPORTED", error: "boom" })}\n`]);
});

test("runCli returns main's exit code untouched and writes nothing of its own", () => {
  expect(runCli("X_FAILED", () => 3)).toBe(3);
  expect(stdoutSpy).toEqual([]);
  expect(stderrSpy).toEqual([]);
});

test("runCli turns a throw into the error envelope with the given code and exit 1 (never a stack trace)", () => {
  const code = runCli("X_FAILED", () => {
    throw new Error("disk is full");
  });
  expect(code).toBe(1);
  expect(stdoutSpy).toEqual([]);
  expect(stderrSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, code: "X_FAILED", error: "disk is full" })}\n`]);
});

test("runCli stringifies a thrown non-Error value", () => {
  expect(
    runCli("X_FAILED", () => {
      throw "plain string";
    }),
  ).toBe(1);
  expect(stderrSpy).toEqual([`${JSON.stringify({ schemaVersion: 1, code: "X_FAILED", error: "plain string" })}\n`]);
});
