import { resolve } from "node:path";
import { z } from "zod";
import { repoRoot } from "../../app/repo";
import { schemasDrift, writeJsonSchemas } from "../../app/write-json-schemas";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "schemas-generate [--check]";
const OUT_DIR = resolve(repoRoot, "standard/schemas");

const Args = z.object({ help: z.literal(true).optional(), check: z.literal(true).optional() }).strict();

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

  if (parsed.data.check) {
    const drifted = schemasDrift(OUT_DIR);
    if (drifted.length > 0) {
      printError("SCHEMAS_DRIFT", `standard/schemas is out of date; run 'bun run schemas:generate': ${drifted.join(", ")}`);
      return 1;
    }
    printJson({ schemaVersion: 1, ok: true });
    return 0;
  }

  printJson({ schemaVersion: 1, written: writeJsonSchemas(OUT_DIR) });
  return 0;
}

process.exit(runCli("SCHEMAS_GENERATE_FAILED", () => main(process.argv.slice(2))));
