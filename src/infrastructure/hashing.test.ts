import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256File, sha256Hex } from "./hashing";

test("sha256 of empty input", () => expect(sha256Hex(new Uint8Array())).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));

test("sha256 of known bytes matches a known digest", () => {
  const bytes = new TextEncoder().encode("forge614");
  expect(sha256Hex(bytes)).toBe("78ce873de4bc32d8f641c3de7a55df80b2ca8e2bcae899d4737b851deba28a79");
});

test("sha256File hashes the bytes on disk, matching sha256Hex", () => {
  const dir = mkdtempSync(join(tmpdir(), "hashing-"));
  const path = join(dir, "sample.txt");
  const content = "forge614 standard packaging\n";
  writeFileSync(path, content, "utf8");
  expect(sha256File(path)).toBe(sha256Hex(new TextEncoder().encode(content)));
});
