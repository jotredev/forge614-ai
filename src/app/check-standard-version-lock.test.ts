import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkStandardVersionLock } from "./check-standard-version-lock";

const REPO_ROOT = resolve(import.meta.dir, "../..");

function git(root: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "ignore" });
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "standard-version-lock-"));
  cpSync(join(REPO_ROOT, "standard"), join(root, "standard"), { recursive: true });
  writeFileSync(join(root, "standard/VERSION"), "9.9.9\n");
  git(root, "init", "--quiet");
  git(root, "config", "user.name", "Forge614 test");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "add", "standard");
  git(root, "commit", "--quiet", "-m", "baseline");
  git(root, "tag", "standard-v9.9.9");
  return root;
}

/**
 * Confirms a tagged standard cannot change while its VERSION remains fixed.
 * A temporary Git repository gives the test a real standard tree and tag lookup.
 */
test("fails with STANDARD_VERSION_NOT_BUMPED when standard changes under its version tag", () => {
  const root = fixture();
  try {
    writeFileSync(join(root, "standard/STANDARD.md"), "changed\n");
    const result = checkStandardVersionLock({ root, standardVersion: "9.9.9" });
    expect(result).toMatchObject({ ok: false, code: "STANDARD_VERSION_NOT_BUMPED" });
    if (result.ok) return;
    expect(result.error).toBe("standard/ cambió desde standard-v9.9.9; sube standard/VERSION");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Confirms a release check succeeds when the tagged standard matches the current tree byte for byte.
 * This is the success path used by the standard-release workflow after publishing a version tag.
 */
test("passes when the tagged standard matches the current tree", () => {
  const root = fixture();
  try {
    expect(checkStandardVersionLock({ root, standardVersion: "9.9.9" })).toEqual({ ok: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Confirms raising VERSION makes the current tree a new, unpublished release and allows it through.
 * The fixture keeps the previous release tag so the check also proves tag availability.
 */
test("passes with a new VERSION that has no release tag yet", () => {
  const root = fixture();
  try {
    writeFileSync(join(root, "standard/VERSION"), "9.9.10\n");
    writeFileSync(join(root, "standard/STANDARD.md"), "changed\n");
    expect(checkStandardVersionLock({ root, standardVersion: "9.9.10" })).toEqual({ ok: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Confirms an unpublished version passes when another standard tag proves the clone has tag history.
 * This distinguishes a genuinely new version from a shallow clone with no tags available at all.
 */
test("passes when the current VERSION has no tag and other tags are available", () => {
  const root = fixture();
  try {
    expect(checkStandardVersionLock({ root, standardVersion: "9.9.10" })).toEqual({ ok: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * Confirms a tagless clone fails clearly instead of silently skipping the version lock.
 * The error directs the caller to fetch the full tag history before checking the standard.
 */
test("fails clearly when the repository has no tags", () => {
  const root = mkdtempSync(join(tmpdir(), "standard-version-lock-no-tags-"));
  cpSync(join(REPO_ROOT, "standard"), join(root, "standard"), { recursive: true });
  writeFileSync(join(root, "standard/VERSION"), "9.9.9\n");
  git(root, "init", "--quiet");
  git(root, "config", "user.name", "Forge614 test");
  git(root, "config", "user.email", "test@example.invalid");
  git(root, "add", "standard");
  git(root, "commit", "--quiet", "-m", "baseline");
  try {
    const result = checkStandardVersionLock({ root, standardVersion: "9.9.9" });
    expect(result).toMatchObject({ ok: false, code: "STANDARD_TAGS_UNAVAILABLE" });
    if (result.ok) return;
    expect(result.error).toContain("git fetch --tags");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
