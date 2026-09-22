import { resolve } from "node:path";
import { schemasDrift, writeJsonSchemas } from "../../app/write-json-schemas";
import { printError, printJson } from "./output";

const argv = process.argv.slice(2);
const outDir = resolve(import.meta.dir, "../../../standard/schemas");

if (argv.includes("--help")) {
  printJson({ schemaVersion: 1, usage: "schemas-generate [--check]" });
  process.exit(0);
}

if (argv.includes("--check")) {
  const drifted = schemasDrift(outDir);
  if (drifted.length > 0) {
    printError("SCHEMAS_DRIFT", `standard/schemas is out of date; run 'bun run schemas:generate': ${drifted.join(", ")}`);
    process.exit(1);
  }
  printJson({ schemaVersion: 1, ok: true });
  process.exit(0);
}

const written = writeJsonSchemas(outDir);
printJson({ schemaVersion: 1, written });
