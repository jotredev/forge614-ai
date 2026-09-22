import { resolve } from "node:path";
import { z } from "zod";
import { readRepoTree, repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { runValidators } from "../../app/run-validators";
import { printError, printJson } from "./output";

const Args = z
  .object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
      .optional(),
    locale: z.enum(["es", "en"]).optional(),
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
  printJson({ schemaVersion: 1, usage: "verify [--locale es|en] [--today YYYY-MM-DD]" });
  process.exit(0);
}

const parsed = Args.safeParse(parseArgs(argv));
if (!parsed.success) {
  printError("INVALID_ARGS", parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  process.exit(2);
}

const locale = parsed.data.locale ?? "es";
const today = parsed.data.today ?? new Date().toISOString().slice(0, 10);

// Order matters: each step assumes the previous one already holds. Running
// the full suite first (typecheck, tests) before the drift/report checks
// keeps a broken build from producing a misleading verify report.
const STEPS: ReadonlyArray<readonly [string, string[]]> = [
  ["typecheck", ["bun", "run", "typecheck"]],
  ["test", ["bun", "test"]],
  ["decisions:index --check", ["bun", "run", "decisions:index", "--check"]],
  ["workflows:check", ["bun", "run", "workflows:check"]],
  ["schemas:generate --check", ["bun", "run", "schemas:generate", "--check"]],
];

for (const [label, cmd] of STEPS) {
  const result = runCommand(cmd, { cwd: repoRoot });
  process.stderr.write(`[verify] ${label}: exit ${result.exitCode}\n`);
  if (result.exitCode !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    printError("VERIFY_STEP_FAILED", `${label} failed`);
    process.exit(1);
  }
}

const standardVersion = (await Bun.file(resolve(repoRoot, "standard/VERSION")).text()).trim();
const tree = readRepoTree();
const report = runValidators(tree, { standardVersion, today });

for (const check of report.checks) {
  process.stderr.write(`[verify] ${check.ruleId}: ${check.verdict} — ${check.message[locale]}\n`);
  for (const line of check.evidence) process.stderr.write(`  - ${line}\n`);
}
process.stderr.write(`[verify] verdict: ${report.verdict}\n`);

printJson({ ...report });
process.exit(report.verdict === "pass" ? 0 : 1);
