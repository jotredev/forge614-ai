import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { readRepoTree, repoRoot } from "../../app/repo";
import { runCommand } from "../../app/run-command";
import { runValidators } from "../../app/run-validators";
import { issuesOf, parsePairs } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "verify [--locale es|en] [--today YYYY-MM-DD]";

const Args = z
  .object({
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
      .optional(),
    locale: z.enum(["es", "en"]).optional(),
  })
  .strict();

// Order matters: each step assumes the previous one already holds. Running
// the full suite first (typecheck, tests) before the drift/report checks
// keeps a broken build from producing a misleading verify report.
const STEPS: ReadonlyArray<readonly [string, string[]]> = [
  ["typecheck", ["bun", "run", "typecheck"]],
  ["test", ["bun", "test"]],
  ["decisions:index --check", ["bun", "run", "decisions:index", "--check"]],
  ["workflows:check", ["bun", "run", "workflows:check"]],
  ["schemas:generate --check", ["bun", "run", "schemas:generate", "--check"]],
  ["notion-map:build --check", ["bun", "run", "notion-map:build", "--check"]],
];

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

  const locale = parsed.data.locale ?? "es";
  const today = parsed.data.today ?? new Date().toISOString().slice(0, 10);

  for (const [label, cmd] of STEPS) {
    const result = runCommand(cmd, { cwd: repoRoot });
    process.stderr.write(`[verify] ${label}: exit ${result.exitCode}\n`);
    if (result.exitCode !== 0) {
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      printError("VERIFY_STEP_FAILED", `${label} failed`);
      return 1;
    }
  }

  const standardVersion = readFileSync(resolve(repoRoot, "standard/VERSION"), "utf8").trim();
  const report = runValidators(readRepoTree(), { standardVersion, today });

  for (const check of report.checks) {
    process.stderr.write(`[verify] ${check.ruleId}: ${check.verdict} — ${check.message[locale]}\n`);
    for (const line of check.evidence) process.stderr.write(`  - ${line}\n`);
  }
  process.stderr.write(`[verify] verdict: ${report.verdict}\n`);

  printJson({ ...report });
  return report.verdict === "pass" ? 0 : 1;
}

process.exit(runCli("VERIFY_FAILED", () => main(process.argv.slice(2))));
