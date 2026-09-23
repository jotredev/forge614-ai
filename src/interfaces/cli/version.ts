import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readProductVersion } from "../../app/build-notion-map";
import { repoRoot } from "../../app/repo";
import { treeFrom } from "../../modules/standard/file-tree";
import { printJson } from "./output";

export const PRODUCT_NAME = "forge614-ai";

// STANDARD §4: `--version` is always available and never blocking. Every CLI
// calls this first, before any other argument parsing, so a `--version`
// anywhere in argv prints `{ schemaVersion, name, version }` and exits 0.
export function printVersionIfRequested(argv: string[]): boolean {
  if (!argv.includes("--version")) return false;
  const tree = treeFrom({ "package.json": readFileSync(resolve(repoRoot, "package.json"), "utf8") });
  printJson({ schemaVersion: 1, name: PRODUCT_NAME, version: readProductVersion(tree) });
  return true;
}
