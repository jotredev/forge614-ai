import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkStandardPack } from "./check-standard-pack";
import { packStandard } from "./pack-standard";

export const STANDARD_TAG_PATTERN = /^standard-v(\d+\.\d+\.\d+)$/;

export interface ReleaseStandardOptions {
  root: string;
  tag: string;
  outDir: string;
  exec: (cmd: string[], options?: { cwd?: string }) => { exitCode: number; stdout: string; stderr: string };
  dryRun: boolean;
}

export type ReleaseStandardResult =
  | { ok: true; version: string; sha256: string; tarSha256: string; assets: string[]; command: string[]; published: boolean }
  | { ok: false; code: "STANDARD_RELEASE_TAG_MISMATCH" | "STANDARD_PACK_DRIFT" | "STANDARD_RELEASE_FAILED"; error: string };

// Publishes the packaged standard as a GitHub release. Order matters: the tag
// must name the version the tree declares, the committed pointer must match a
// fresh pack (no silent drift ships), and only then the archive is built into
// outDir and handed to `gh`. Nothing is published on any failure.
export function releaseStandard(options: ReleaseStandardOptions): ReleaseStandardResult {
  const match = STANDARD_TAG_PATTERN.exec(options.tag);
  const declared = readFileSync(resolve(options.root, "standard/VERSION"), "utf8").trim();
  if (match === null || match[1] !== declared) {
    return {
      ok: false,
      code: "STANDARD_RELEASE_TAG_MISMATCH",
      error: `tag '${options.tag}' does not name standard/VERSION '${declared}' (expected 'standard-v${declared}')`,
    };
  }

  const check = checkStandardPack({
    root: options.root,
    pointerPath: resolve(options.root, "forge614.node.json"),
    sumsPath: resolve(options.root, "dist/SHA256SUMS"),
  });
  if (!check.ok) return { ok: false, code: "STANDARD_PACK_DRIFT", error: check.error };

  const result = packStandard(options.root, options.outDir);
  if (result.sha256 !== check.sha256) {
    return { ok: false, code: "STANDARD_PACK_DRIFT", error: "fresh pack differs from the checked pack" };
  }
  const assets = [
    join(options.outDir, `standard-${result.version}.tar.gz`),
    join(options.outDir, "SHA256SUMS"),
    join(options.outDir, "pack-manifest.json"),
  ];
  const command = [
    "gh", "release", "create", options.tag,
    ...assets,
    "--title", `Estándar de Nodo ${result.version}`,
    "--notes", `Estándar de Nodo Forge614 ${result.version}. sha256 ${result.sha256}. Instalación y verificación: forge614-sentinel.`,
    "--verify-tag",
  ];

  if (options.dryRun) {
    return { ok: true, version: result.version, sha256: result.sha256, tarSha256: result.tarSha256, assets, command, published: false };
  }

  let run: { exitCode: number; stdout: string; stderr: string };
  try {
    run = options.exec(command, { cwd: options.root });
  } catch (error) {
    return { ok: false, code: "STANDARD_RELEASE_FAILED", error: `gh could not be executed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (run.exitCode !== 0) {
    return { ok: false, code: "STANDARD_RELEASE_FAILED", error: `gh release create exited ${run.exitCode}: ${run.stderr.trim()}` };
  }
  return { ok: true, version: result.version, sha256: result.sha256, tarSha256: result.tarSha256, assets, command, published: true };
}
