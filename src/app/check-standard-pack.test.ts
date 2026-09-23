import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkStandardPack } from "./check-standard-pack";
import { packStandard } from "./pack-standard";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const WRONG_SHA = "0".repeat(64);

function writePointer(dir: string, sha256: string): string {
  const path = join(dir, "forge614.node.json");
  const pointer = { schemaVersion: 1, node: "ai", kind: "product", standard: { version: "1.0.0", sha256 }, ecosystem: "forge614" };
  writeFileSync(path, `${JSON.stringify(pointer, null, 2)}\n`, "utf8");
  return path;
}

function freshPack(): { sha256: string; tarSha256: string; version: string } {
  const out = mkdtempSync(join(tmpdir(), "check-pack-fresh-"));
  return packStandard(REPO_ROOT, out);
}

test("ok when the pointer matches a fresh pack; reports both fingerprints and that no SHA256SUMS was checked", () => {
  const fresh = freshPack();
  const dir = mkdtempSync(join(tmpdir(), "check-pack-"));
  const result = checkStandardPack({ root: REPO_ROOT, pointerPath: writePointer(dir, fresh.sha256), sumsPath: join(dir, "SHA256SUMS") });
  expect(result).toEqual({ ok: true, sha256: fresh.sha256, tarSha256: fresh.tarSha256, pointerChecked: true, sumsChecked: false });
});

test("ok with sumsChecked: true when dist/SHA256SUMS carries the fresh line", () => {
  const fresh = freshPack();
  const dir = mkdtempSync(join(tmpdir(), "check-pack-"));
  const sumsPath = join(dir, "SHA256SUMS");
  writeFileSync(sumsPath, `${fresh.sha256}  standard-${fresh.version}.tar.gz\n`, "utf8");
  const result = checkStandardPack({ root: REPO_ROOT, pointerPath: writePointer(dir, fresh.sha256), sumsPath });
  expect(result).toEqual({ ok: true, sha256: fresh.sha256, tarSha256: fresh.tarSha256, pointerChecked: true, sumsChecked: true });
});

test("pointer drift names the pointer's sha256, the fresh sha256 and the fresh tar sha256", () => {
  const fresh = freshPack();
  const dir = mkdtempSync(join(tmpdir(), "check-pack-"));
  const result = checkStandardPack({ root: REPO_ROOT, pointerPath: writePointer(dir, WRONG_SHA), sumsPath: join(dir, "SHA256SUMS") });
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.code).toBe("STANDARD_PACK_DRIFT");
  expect(result.error).toContain(`standard.sha256 (${WRONG_SHA})`);
  expect(result.error).toContain(`fresh pack (${fresh.sha256})`);
  expect(result.error).toContain(`fresh tar sha256 ${fresh.tarSha256}`);
  expect(result.error).toContain("bun run standard:pack --update-pointer");
});

test("SHA256SUMS drift names the fresh line and the fresh tar sha256", () => {
  const fresh = freshPack();
  const dir = mkdtempSync(join(tmpdir(), "check-pack-"));
  const sumsPath = join(dir, "SHA256SUMS");
  writeFileSync(sumsPath, `${WRONG_SHA}  standard-${fresh.version}.tar.gz\n`, "utf8");
  const result = checkStandardPack({ root: REPO_ROOT, pointerPath: writePointer(dir, fresh.sha256), sumsPath });
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.code).toBe("STANDARD_PACK_DRIFT");
  expect(result.error).toContain(`Fresh: ${fresh.sha256}  standard-${fresh.version}.tar.gz`);
  expect(result.error).toContain(`fresh tar sha256 ${fresh.tarSha256}`);
});
