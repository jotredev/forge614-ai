import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updateNodePointerSha256 } from "./update-node-pointer";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function writePointer(dir: string, sha256: string): string {
  const path = join(dir, "forge614.node.json");
  const pointer = { schemaVersion: 1, node: "ai", kind: "product", standard: { version: "1.0.0", sha256 }, ecosystem: "forge614" };
  writeFileSync(path, `${JSON.stringify(pointer, null, 2)}\n`, "utf8");
  return path;
}

test("rewrites only standard.sha256, keeping every other field", () => {
  const dir = mkdtempSync(join(tmpdir(), "node-pointer-"));
  const path = writePointer(dir, SHA_A);

  const updated = updateNodePointerSha256(path, SHA_B);

  expect(updated).toEqual({ schemaVersion: 1, node: "ai", kind: "product", standard: { version: "1.0.0", sha256: SHA_B }, ecosystem: "forge614" });
  const onDisk = JSON.parse(readFileSync(path, "utf8"));
  expect(onDisk).toEqual(updated);
});

test("refuses to write when the resulting pointer would be invalid", () => {
  const dir = mkdtempSync(join(tmpdir(), "node-pointer-"));
  const path = writePointer(dir, SHA_A);
  const before = readFileSync(path, "utf8");

  expect(() => updateNodePointerSha256(path, "not-a-sha")).toThrow();
  expect(readFileSync(path, "utf8")).toBe(before);
});

test("refuses to write when the existing pointer on disk is already invalid", () => {
  const dir = mkdtempSync(join(tmpdir(), "node-pointer-"));
  const path = join(dir, "forge614.node.json");
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, node: "AI", kind: "product", standard: { version: "1.0.0", sha256: SHA_A } })}\n`, "utf8");

  expect(() => updateNodePointerSha256(path, SHA_B)).toThrow();
});
