import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTextAtomic } from "./fs-write";

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

test("writes content and creates missing parent directories", () => {
  dir = mkdtempSync(join(tmpdir(), "fs-write-"));
  const target = join(dir, "nested", "file.txt");
  writeTextAtomic(target, "hello");
  expect(readFileSync(target, "utf8")).toBe("hello");
});

test("leaves no temp file behind after a successful write", () => {
  dir = mkdtempSync(join(tmpdir(), "fs-write-"));
  const target = join(dir, "file.txt");
  writeTextAtomic(target, "content");
  const entries = readdirSync(dir);
  expect(entries).toEqual(["file.txt"]);
});

test("overwrites an existing file atomically", () => {
  dir = mkdtempSync(join(tmpdir(), "fs-write-"));
  const target = join(dir, "file.txt");
  writeTextAtomic(target, "first");
  writeTextAtomic(target, "second");
  expect(existsSync(target)).toBe(true);
  expect(readFileSync(target, "utf8")).toBe("second");
});
