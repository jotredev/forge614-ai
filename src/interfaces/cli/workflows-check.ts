import { checkWorkflows } from "../../app/check-workflows";
import { readRepoTree } from "../../app/repo";
import { worst } from "../../modules/standard/finding";
import { printJson } from "./output";

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  printJson({ schemaVersion: 1, usage: "workflows-check" });
  process.exit(0);
}

const tree = readRepoTree();
const findings = checkWorkflows(tree);
const verdict = worst(findings);

printJson({ schemaVersion: 1, verdict, findings });
process.exit(verdict === "pass" ? 0 : 1);
