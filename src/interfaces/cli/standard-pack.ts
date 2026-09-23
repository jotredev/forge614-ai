import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { packStandard } from "../../app/pack-standard";
import { readRepoTree, repoRoot } from "../../app/repo";
import { runValidators } from "../../app/run-validators";
import { updateNodePointerSha256 } from "../../app/update-node-pointer";
import { NodePointerSchema } from "../../modules/standard/schemas";
import { printError, printJson } from "./output";

const USAGE = "standard-pack [--update-pointer] [--check]";

const Args = z
  .object({
    help: z.literal(true).optional(),
    check: z.literal(true).optional(),
    "update-pointer": z.literal(true).optional(),
  })
  .strict();

// Every argument becomes a key so the strict schema rejects anything it does
// not know: a misspelled flag or a stray positional argument fails loudly
// instead of being ignored.
function parseArgs(argv: string[]): Record<string, true> {
  const out: Record<string, true> = {};
  for (const arg of argv) out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  return out;
}

const POINTER_PATH = resolve(repoRoot, "forge614.node.json");

// Packs into a temp dir and compares the fresh sha256 against the committed
// truth (forge614.node.json) and, when present, dist/SHA256SUMS. Meaningful
// on a fresh checkout without dist/, which is how CI proves cross-platform
// parity of the archive bytes.
function check(): number {
  const tmpOut = mkdtempSync(join(tmpdir(), "standard-pack-check-"));
  try {
    const fresh = packStandard(repoRoot, tmpOut);
    const pointer = NodePointerSchema.parse(JSON.parse(readFileSync(POINTER_PATH, "utf8")));
    if (pointer.standard.sha256 !== fresh.sha256) {
      printError(
        "STANDARD_PACK_DRIFT",
        `forge614.node.json standard.sha256 (${pointer.standard.sha256}) does not match a fresh pack (${fresh.sha256}); run 'bun run standard:pack --update-pointer'`,
      );
      return 1;
    }

    const sumsPath = resolve(repoRoot, "dist/SHA256SUMS");
    let sumsChecked = false;
    if (existsSync(sumsPath)) {
      const expectedLine = `${fresh.sha256}  standard-${fresh.version}.tar.gz`;
      if (!readFileSync(sumsPath, "utf8").split("\n").includes(expectedLine)) {
        printError("STANDARD_PACK_DRIFT", `dist/SHA256SUMS does not match a fresh pack; run 'bun run standard:pack'. Fresh: ${expectedLine}`);
        return 1;
      }
      sumsChecked = true;
    }

    printJson({ schemaVersion: 1, ok: true, sha256: fresh.sha256, pointerChecked: true, sumsChecked });
    return 0;
  } finally {
    rmSync(tmpOut, { recursive: true, force: true });
  }
}

function main(argv: string[]): number {
  const parsed = Args.safeParse(parseArgs(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", parsed.error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message)).join("; "));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }

  // The standard must already be valid before it is shipped: pack refuses to
  // produce a tarball out of a tree that `bun run verify`'s own checks (the
  // same validators) would fail (coordinator ruling #5).
  const standardVersion = readFileSync(resolve(repoRoot, "standard/VERSION"), "utf8").trim();
  const today = new Date().toISOString().slice(0, 10);
  const report = runValidators(readRepoTree(), { standardVersion, today });
  if (report.verdict === "fail") {
    printError("STANDARD_INVALID", report.checks.filter((c) => c.verdict === "fail").map((c) => c.message.en).join("; "));
    return 1;
  }

  if (parsed.data.check) return check();

  const result = packStandard(repoRoot, resolve(repoRoot, "dist"));
  if (parsed.data["update-pointer"]) updateNodePointerSha256(POINTER_PATH, result.sha256);
  printJson({ ...result });
  return 0;
}

// Any unexpected failure leaves through the error envelope, never as a raw
// stack trace.
let exitCode: number;
try {
  exitCode = main(process.argv.slice(2));
} catch (error) {
  printError("STANDARD_PACK_FAILED", error instanceof Error ? error.message : String(error));
  exitCode = 1;
}
process.exit(exitCode);
