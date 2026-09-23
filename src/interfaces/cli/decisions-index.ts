import { resolve } from "node:path";
import { z } from "zod";
import { buildDecisionsIndex, serializeDecisionsIndex, writeDecisionsIndex } from "../../app/decisions-index";
import { readRepoTree, repoRoot } from "../../app/repo";
import { read } from "../../modules/standard/file-tree";
import { DecisionsIndexSchema } from "../../modules/standard/schemas";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "decisions-index [--check]";
const INDEX_PATH = "docs/decisions/INDEX.json";

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

  const tree = readRepoTree();
  const index = DecisionsIndexSchema.safeParse(buildDecisionsIndex(tree));
  if (!index.success) {
    printError("DECISIONS_INDEX_INVALID", issuesOf(index.error));
    return 1;
  }

  const serialized = serializeDecisionsIndex(index.data);
  if (parsed.data.check) {
    if (read(tree, INDEX_PATH) !== serialized) {
      printError("DECISIONS_INDEX_DRIFT", `${INDEX_PATH} is out of date; run 'bun run decisions:index'`);
      return 1;
    }
    printJson({ schemaVersion: 1, ok: true, records: index.data.decisions.length });
    return 0;
  }

  writeDecisionsIndex(index.data, resolve(repoRoot, INDEX_PATH));
  printJson({ schemaVersion: 1, ok: true, records: index.data.decisions.length });
  return 0;
}

process.exit(runCli("DECISIONS_INDEX_FAILED", () => main(process.argv.slice(2))));
