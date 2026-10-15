import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { packStandard } from "./pack-standard";

export interface CheckStandardVersionLockOptions {
  root: string;
  standardVersion: string;
}

export type CheckStandardVersionLockResult =
  | { ok: true }
  | { ok: false; code: "STANDARD_VERSION_NOT_BUMPED" | "STANDARD_TAGS_UNAVAILABLE"; error: string };

/** Runs Git in the target repository and returns its stdout bytes. */
function git(root: string, ...args: string[]): Buffer {
  return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
}

/** Writes the regular files from a tagged standard tree into a temporary directory. */
function snapshotStandardFromTag(root: string, tag: string, standardDir: string): void {
  const entries = git(root, "ls-tree", "-r", "-z", "--full-tree", tag, "--", "standard").toString("utf8");
  for (const entry of entries.split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    const metadata = entry.slice(0, tab);
    const relativePath = entry.slice(tab + 1);
    const [mode, kind, object] = metadata.split(" ");
    if (!object || kind !== "blob" || (mode !== "100644" && mode !== "100755")) continue;
    const target = join(standardDir, relativePath.slice("standard/".length));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, git(root, "cat-file", "blob", object));
  }
}

/**
 * Compares the current standard package with the package at its release tag.
 * @param options Repository root and current standard version.
 * @returns Success, a missing-version-bump error, or an explicit missing-tag-history error.
 */
export function checkStandardVersionLock(options: CheckStandardVersionLockOptions): CheckStandardVersionLockResult {
  let tags: string;
  try {
    tags = git(options.root, "tag", "--list").toString("utf8").trim();
  } catch {
    return {
      ok: false,
      code: "STANDARD_TAGS_UNAVAILABLE",
      error: "No se pudieron leer las etiquetas de Git; trae el historial completo con `git fetch --tags` antes de ejecutar standard:check. Git tags are unavailable; fetch them with `git fetch --tags` before running standard:check.",
    };
  }
  if (!tags) {
    return {
      ok: false,
      code: "STANDARD_TAGS_UNAVAILABLE",
      error: "El repositorio no tiene etiquetas; trae el historial completo con `git fetch --tags` antes de ejecutar standard:check. The repository has no tags; fetch them with `git fetch --tags` before running standard:check.",
    };
  }

  const tag = `standard-v${options.standardVersion}`;
  try {
    git(options.root, "rev-parse", "--verify", "--quiet", `refs/tags/${tag}`);
  } catch {
    return { ok: true };
  }

  const snapshotRoot = mkdtempSync(join(tmpdir(), "standard-version-lock-snapshot-"));
  const packRoot = mkdtempSync(join(tmpdir(), "standard-version-lock-pack-"));
  try {
    snapshotStandardFromTag(options.root, tag, join(snapshotRoot, "standard"));
    const taggedPack = packStandard(snapshotRoot, packRoot);
    const currentPack = packStandard(options.root, packRoot);
    if (taggedPack.sha256 !== currentPack.sha256) {
      return {
        ok: false,
        code: "STANDARD_VERSION_NOT_BUMPED",
        error: `standard/ cambió desde ${tag}; sube standard/VERSION`,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "STANDARD_TAGS_UNAVAILABLE",
      error: `No se pudo leer ${tag}; trae el historial completo con git fetch --tags antes de ejecutar standard:check. Could not read ${tag}; fetch the full history with git fetch --tags before running standard:check.`,
    };
  } finally {
    rmSync(snapshotRoot, { recursive: true, force: true });
    rmSync(packRoot, { recursive: true, force: true });
  }
}
