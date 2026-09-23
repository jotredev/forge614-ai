import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodePointerSchema } from "../modules/standard/schemas";
import { packStandard } from "./pack-standard";

export interface CheckStandardPackOptions {
  root: string;
  pointerPath: string;
  sumsPath: string;
}

export type CheckStandardPackResult =
  | { ok: true; sha256: string; tarSha256: string; pointerChecked: true; sumsChecked: boolean }
  | { ok: false; code: "STANDARD_PACK_DRIFT"; error: string };

// Packs into a temp dir and compares the fresh sha256 against the committed
// truth (forge614.node.json) and, when present, dist/SHA256SUMS. Meaningful
// on a fresh checkout without dist/, which is how CI proves cross-platform
// parity of the archive bytes. Every outcome carries the fresh tar sha256 so
// a drift can be told apart: same tar, different archive means the
// compressor moved bytes; a different tar means the content did.
export function checkStandardPack(options: CheckStandardPackOptions): CheckStandardPackResult {
  const tmpOut = mkdtempSync(join(tmpdir(), "standard-pack-check-"));
  try {
    const fresh = packStandard(options.root, tmpOut);
    const pointer = NodePointerSchema.parse(JSON.parse(readFileSync(options.pointerPath, "utf8")));
    if (pointer.standard.sha256 !== fresh.sha256) {
      return {
        ok: false,
        code: "STANDARD_PACK_DRIFT",
        error: `forge614.node.json standard.sha256 (${pointer.standard.sha256}) does not match a fresh pack (${fresh.sha256}); fresh tar sha256 ${fresh.tarSha256}; run 'bun run standard:pack --update-pointer'`,
      };
    }

    let sumsChecked = false;
    if (existsSync(options.sumsPath)) {
      const expectedLine = `${fresh.sha256}  standard-${fresh.version}.tar.gz`;
      if (!readFileSync(options.sumsPath, "utf8").split("\n").includes(expectedLine)) {
        return {
          ok: false,
          code: "STANDARD_PACK_DRIFT",
          error: `dist/SHA256SUMS does not match a fresh pack; run 'bun run standard:pack'. Fresh: ${expectedLine}; fresh tar sha256 ${fresh.tarSha256}`,
        };
      }
      sumsChecked = true;
    }

    return { ok: true, sha256: fresh.sha256, tarSha256: fresh.tarSha256, pointerChecked: true, sumsChecked };
  } finally {
    rmSync(tmpOut, { recursive: true, force: true });
  }
}
