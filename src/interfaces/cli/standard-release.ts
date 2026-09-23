import { resolve } from "node:path";
import { z } from "zod";
import { releaseStandard } from "../../app/release-standard";
import { repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { issuesOf } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "standard-release [--tag standard-vX.Y.Z] [--dry-run]";

// argv is a mix: `--tag <value>` pairs and bare flags. Every token becomes a
// key so the strict schema rejects anything unknown.
const Args = z
  .object({
    help: z.literal(true).optional(),
    "dry-run": z.literal(true).optional(),
    tag: z.string().regex(/^standard-v\d+\.\d+\.\d+$/, "must be standard-vX.Y.Z").optional(),
  })
  .strict();

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--tag") {
      const value = argv[i + 1];
      out.tag = value === undefined ? true : value;
      i += 1;
      continue;
    }
    out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  }
  return out;
}

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  const parsed = Args.safeParse(parseArgs(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }
  if (parsed.data.help) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }

  const envTag = process.env.GITHUB_REF_NAME;
  const tag = parsed.data.tag ?? (envTag !== undefined && envTag !== "" ? envTag : undefined);
  if (tag === undefined) {
    printError("INVALID_ARGUMENTS", "no tag: pass --tag standard-vX.Y.Z or run inside a tag workflow (GITHUB_REF_NAME)");
    return 2;
  }

  const result = releaseStandard({
    root: repoRoot,
    tag,
    outDir: resolve(repoRoot, "dist"),
    exec: (cmd, options) => runCommand(cmd, options === undefined || options.cwd === undefined ? {} : { cwd: options.cwd }),
    dryRun: parsed.data["dry-run"] === true,
  });
  if (!result.ok) {
    printError(result.code, result.error);
    return 1;
  }
  printJson({ schemaVersion: 1, ...result });
  return 0;
}

process.exit(runCli("STANDARD_RELEASE_FAILED", () => main(process.argv.slice(2))));
