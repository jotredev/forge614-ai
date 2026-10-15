import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { readTemplatesTree, renderNodeFiles } from "../../app/render-templates";
import { repoRoot } from "../../app/repo";
import { NodePointerSchema } from "../../modules/standard/schemas/node-pointer";
import { writeRenderedFiles } from "../../app/write-rendered-files";
import { issuesOf, parsePairs } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "standard-render --out <dir> [--pointer <forge614.node.json>] [--title Title]";

const Args = z
  .object({
    out: z.string().min(1),
    pointer: z.string().min(1).optional(),
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

  const { out, pointer: pointerPath, title } = parsed.data;
  const templatesRoot = resolve(repoRoot, "standard/templates");
  const standardVersion = readFileSync(resolve(repoRoot, "standard/VERSION"), "utf8").trim();
  const pointerFile = resolve(pointerPath ?? resolve(out, "forge614.node.json"));
  const result = NodePointerSchema.safeParse(JSON.parse(readFileSync(pointerFile, "utf8")));
  if (!result.success) throw new Error("forge614.node.json is invalid: " + result.error.issues.map((issue) => issue.message).join("; "));
  const pointer = result.data;
  if (!pointer.install) throw new Error("forge614.node.json is missing install configuration");

  const files = renderNodeFiles(readTemplatesTree(templatesRoot), {
    pointer: { node: pointer.node, install: { repository: pointer.install.repository } },
    NODE_TITLE: title ?? pointer.node,
    STANDARD_VERSION: standardVersion,
  });

  const written = writeRenderedFiles(out, files);
  printJson({ schemaVersion: 1, node: pointer.node, out, written });
  return 0;
}

process.exit(runCli("STANDARD_RENDER_FAILED", () => main(process.argv.slice(2))));
