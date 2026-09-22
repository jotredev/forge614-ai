import { resolve } from "node:path";
import { buildDecisionsIndex, serializeDecisionsIndex, writeDecisionsIndex } from "../../app/decisions-index";
import { readRepoTree, repoRoot } from "../../app/repo";
import { read } from "../../modules/standard/file-tree";
import { DecisionsIndexSchema } from "../../modules/standard/schemas";
import { printError, printJson } from "./output";

const INDEX_PATH = "docs/decisions/INDEX.json";
const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  printJson({ schemaVersion: 1, usage: "decisions-index [--check]" });
  process.exit(0);
}

const tree = readRepoTree();
const index = buildDecisionsIndex(tree);
const parsed = DecisionsIndexSchema.safeParse(index);

if (!parsed.success) {
  printError("DECISIONS_INDEX_INVALID", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  process.exit(1);
}

const serialized = serializeDecisionsIndex(parsed.data);

if (argv.includes("--check")) {
  const committed = read(tree, INDEX_PATH);
  if (committed !== serialized) {
    printError("DECISIONS_INDEX_DRIFT", `${INDEX_PATH} is out of date; run 'bun run decisions:index'`);
    process.exit(1);
  }
  printJson({ schemaVersion: 1, ok: true, records: parsed.data.decisions.length });
  process.exit(0);
}

writeDecisionsIndex(parsed.data, resolve(repoRoot, INDEX_PATH));
printJson({ schemaVersion: 1, ok: true, records: parsed.data.decisions.length });
process.exit(0);
