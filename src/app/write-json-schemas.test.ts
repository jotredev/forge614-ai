import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { schemasDrift, writeJsonSchemas } from "./write-json-schemas";

let dir: string | undefined;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

test("generates and writes every schema file, returning their names sorted", () => {
  dir = mkdtempSync(join(tmpdir(), "write-json-schemas-"));
  const written = writeJsonSchemas(dir);
  expect(written).toEqual([...written].sort());
  expect(written).toContain("node-pointer.schema.json");
  const content = readFileSync(join(dir, "node-pointer.schema.json"), "utf8");
  expect(JSON.parse(content).$id).toContain("node-pointer");
});

test("schemasDrift reports every generated file as drifted when outDir is empty", () => {
  dir = mkdtempSync(join(tmpdir(), "write-json-schemas-"));
  const drifted = schemasDrift(dir);
  expect(drifted).toContain("node-pointer.schema.json");
  expect(drifted.length).toBeGreaterThan(0);
});

test("schemasDrift is empty right after writing, and reports a file that changed underneath", () => {
  dir = mkdtempSync(join(tmpdir(), "write-json-schemas-"));
  writeJsonSchemas(dir);
  expect(schemasDrift(dir)).toEqual([]);

  writeFileSync(join(dir, "node-pointer.schema.json"), "{}");
  expect(schemasDrift(dir)).toEqual(["node-pointer.schema.json"]);
});
