import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeJsonSchemas } from "./write-json-schemas";

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
