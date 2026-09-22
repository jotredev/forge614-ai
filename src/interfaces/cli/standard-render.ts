import { resolve } from "node:path";
import { z } from "zod";
import { readTemplatesTree, renderNodeFiles } from "../../app/render-templates";
import { writeRenderedFiles } from "../../app/write-rendered-files";
import { printError, printJson } from "./output";

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

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith("--") && value !== undefined) out[key.slice(2)] = value;
  }
  return out;
}

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  printJson({ schemaVersion: 1, usage: "standard-render --node <name> --out <dir> [--repo owner/repo] [--title Title]" });
  process.exit(0);
}

const parsed = Args.safeParse(parseArgs(argv));
if (!parsed.success) {
  printError("INVALID_ARGUMENTS", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(2);
}

const { node, out, repo, title } = parsed.data;
const templatesRoot = resolve(import.meta.dir, "../../../standard/templates");
const standardVersion = (await Bun.file(resolve(import.meta.dir, "../../../standard/VERSION")).text()).trim();

const files = renderNodeFiles(readTemplatesTree(templatesRoot), {
  NODE_NAME: node,
  NODE_TITLE: title ?? node,
  REPO: repo ?? `jotredev/forge614-${node}`,
  ASSET_PREFIX: `forge614-${node}`,
  STANDARD_VERSION: standardVersion,
});

const written = writeRenderedFiles(out, files);
printJson({ schemaVersion: 1, node, out, written });
