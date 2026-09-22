import { existsSync, readFileSync } from "node:fs";
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

// Names of the generated schema files that are missing from `outDir` or
// whose on-disk content no longer matches what would be (re)generated.
// Empty means `bun run schemas:generate` was already run after every schema
// change: no drift between the zod schemas and their committed JSON copies.
export function schemasDrift(outDir: string): string[] {
  const files = generateJsonSchemas();
  const drifted: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const path = resolve(outDir, name);
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) drifted.push(name);
  }
  return drifted.sort();
}
