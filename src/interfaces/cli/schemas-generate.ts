import { resolve } from "node:path";
import { writeJsonSchemas } from "../../app/write-json-schemas";
import { printJson } from "./output";

const outDir = resolve(import.meta.dir, "../../../standard/schemas");
const written = writeJsonSchemas(outDir);
printJson({ schemaVersion: 1, written });
