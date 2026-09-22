import { z } from "zod";
import { readRepoTree, repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { runWorkflow } from "../../app/run-workflows";
import { printError, printJson } from "./output";

const Args = z.object({ workflow: z.string().min(1).default("verify") }).strict();

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
  printJson({ schemaVersion: 1, usage: "workflows-run [--workflow <name>]" });
  process.exit(0);
}

const parsed = Args.safeParse(parseArgs(argv));
if (!parsed.success) {
  printError("INVALID_ARGUMENTS", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  process.exit(2);
}

const { workflow } = parsed.data;
const tree = readRepoTree();

let result;
try {
  result = runWorkflow(tree, workflow, (cmd) => {
    const r = runCommand(cmd, { cwd: repoRoot });
    process.stderr.write(`[${workflow}] ${cmd.join(" ")} … exit ${r.exitCode}\n`);
    return r;
  });
} catch (e) {
  printError("WORKFLOW_NOT_FOUND", e instanceof Error ? e.message : String(e));
  process.exit(1);
}

printJson({ ...result });
process.exit(result.ok ? 0 : 1);
