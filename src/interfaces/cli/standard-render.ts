import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { readTemplatesTree, renderNodeFiles } from "../../app/render-templates";
import { repoRoot } from "../../app/repo";
import { writeRenderedFiles } from "../../app/write-rendered-files";
import { issuesOf, parsePairs } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "standard-render --node <name> --out <dir> [--repo owner/repo] [--title Title]";

const Args = z
  .object({
    node: z.string().regex(/^[a-z0-9-]+$/),
    out: z.string().min(1),
    repo: z
      .string()
      .regex(/^[\w.-]+\/[\w.-]+$/)
      .optional(),
    title: z.string().optional(),
  })
  .strict();

function main(argv: string[]): number {
  if (printVersionIfRequested(argv)) return 0;
  if (argv.includes("--help")) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }
  const parsed = Args.safeParse(parsePairs(argv));
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", issuesOf(parsed.error));
    return 2;
  }

  const { node, out, repo, title } = parsed.data;
  const templatesRoot = resolve(repoRoot, "standard/templates");
  const standardVersion = readFileSync(resolve(repoRoot, "standard/VERSION"), "utf8").trim();

  const files = renderNodeFiles(readTemplatesTree(templatesRoot), {
    NODE_NAME: node,
    NODE_TITLE: title ?? node,
    REPO: repo ?? `jotredev/forge614-${node}`,
    ASSET_PREFIX: `forge614-${node}`,
    STANDARD_VERSION: standardVersion,
  });

  const written = writeRenderedFiles(out, files);
  printJson({ schemaVersion: 1, node, out, written });
  return 0;
}

process.exit(runCli("STANDARD_RENDER_FAILED", () => main(process.argv.slice(2))));
