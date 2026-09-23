import { z } from "zod";
import { checkWorkflows } from "../../app/check-workflows";
import { readRepoTree } from "../../app/repo";
import { worst } from "../../modules/standard/finding";
import { issuesOf, parseFlags } from "./args";
import { printError, printJson, runCli } from "./output";
import { printVersionIfRequested } from "./version";

const USAGE = "workflows-check";

const Args = z.object({ help: z.literal(true).optional() }).strict();

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

  const findings = checkWorkflows(readRepoTree());
  const verdict = worst(findings);
  printJson({ schemaVersion: 1, verdict, findings });
  return verdict === "pass" ? 0 : 1;
}

process.exit(runCli("WORKFLOWS_CHECK_FAILED", () => main(process.argv.slice(2))));
