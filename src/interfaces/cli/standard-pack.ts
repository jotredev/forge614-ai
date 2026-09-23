import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { checkStandardPack } from "../../app/check-standard-pack";
import { packStandard } from "../../app/pack-standard";
import { readRepoTree, repoRoot } from "../../app/repo";
import { runValidators } from "../../app/run-validators";
import { updateNodePointerSha256 } from "../../app/update-node-pointer";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "standard-pack [--update-pointer] [--check]";

const Args = z
  .object({
    help: z.literal(true).optional(),
    check: z.literal(true).optional(),
    "update-pointer": z.literal(true).optional(),
  })
  .strict();

const POINTER_PATH = resolve(repoRoot, "forge614.node.json");

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseFlags(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
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

  if (parsed.data.check) {
    const result = checkStandardPack({ root: repoRoot, pointerPath: POINTER_PATH, sumsPath: resolve(repoRoot, "dist/SHA256SUMS") });
    if (!result.ok) {
      printError("STANDARD_PACK_DRIFT", result.error);
      return 1;
    }
    printJson({ schemaVersion: 1, ...result });
    return 0;
  }

  const result = packStandard(repoRoot, resolve(repoRoot, "dist"));
  if (parsed.data["update-pointer"]) updateNodePointerSha256(POINTER_PATH, result.sha256);
  printJson({ ...result });
  return 0;
}

process.exit(runCli("STANDARD_PACK_FAILED", () => main(process.argv.slice(2))));
