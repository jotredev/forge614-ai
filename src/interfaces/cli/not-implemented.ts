import { z } from "zod";
import { printError, printJson } from "./output";

const USAGE = "not-implemented <group>:<script>";

// Placeholder behind the release scripts (`build:target`, `smoke:target`,
// `release:publish`) that release.yml calls: they exist so the workflow is
// valid and `workflows:check` passes, but they fail on purpose with
// NOT_IMPLEMENTED until the shared `bun release` arrives in phase 0.4.
const Args = z.tuple([z.string().regex(/^[a-z]+:[a-z]+$/, "must be <group>:<script> in lowercase letters")]);

function main(argv: string[]): number {
  if (argv.includes("--help")) {
    printJson({ schemaVersion: 1, usage: USAGE });
    return 0;
  }

  if (argv.length !== 1) {
    printError("INVALID_ARGUMENTS", `expected exactly one argument <group>:<script>, got ${argv.length}`);
    return 2;
  }
  const parsed = Args.safeParse(argv);
  if (!parsed.success) {
    printError("INVALID_ARGUMENTS", parsed.error.issues.map((issue) => `argument ${issue.path.join(".")}: ${issue.message}`).join("; "));
    return 2;
  }

  const [script] = parsed.data;
  printError("NOT_IMPLEMENTED", `${script} arrives in phase 0.4 (shared bun release)`);
  return 1;
}

process.exit(main(process.argv.slice(2)));
