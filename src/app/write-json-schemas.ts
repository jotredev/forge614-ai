import { resolve } from "node:path";
import { writeTextAtomic } from "../infrastructure/fs-write";
import { generateJsonSchemas } from "./generate-json-schemas";

export function writeJsonSchemas(outDir: string): string[] {
  const files = generateJsonSchemas();
  const written: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    writeTextAtomic(resolve(outDir, name), content);
    written.push(name);
  }
  return written.sort();
}
