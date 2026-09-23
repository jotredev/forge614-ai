import { resolve } from "node:path";
import { z } from "zod";
import { buildNotionMapForTree, NOTION_MAP_PATH, writeNotionMap } from "../../app/build-notion-map";
import { readRepoTree, repoRoot } from "../../app/repo";
import { printError, printJson } from "./output";

const USAGE = "notion-map-build";

const Args = z.object({ help: z.literal(true).optional() }).strict();

// Every argument becomes a key so the strict schema rejects anything it does
// not know: a misspelled flag or a stray positional argument fails loudly
// instead of being ignored.
function parseArgs(argv: string[]): Record<string, true> {
  const out: Record<string, true> = {};
  for (const arg of argv) out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  return out;
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

  const map = buildNotionMapForTree(readRepoTree());
  writeNotionMap(map, resolve(repoRoot, NOTION_MAP_PATH));
  printJson({ schemaVersion: 1, path: NOTION_MAP_PATH, pages: map.pages.length });
  return 0;
}

// Any unexpected failure (invalid previous map, unreadable package.json,
// write error) leaves through the error envelope, never as a raw stack trace.
let exitCode: number;
try {
  exitCode = main(process.argv.slice(2));
} catch (error) {
  printError("NOTION_MAP_FAILED", error instanceof Error ? error.message : String(error));
  exitCode = 1;
}
process.exit(exitCode);
