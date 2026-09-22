import { chmodSync } from "node:fs";
import { resolve } from "node:path";
import { writeTextAtomic } from "../infrastructure/fs-write";

const EXECUTABLE_PATHS = new Set(["install.sh", ".githooks/pre-push"]);

export function writeRenderedFiles(outDir: string, files: Readonly<Record<string, string>>): string[] {
  const written: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    const dest = resolve(outDir, path);
    writeTextAtomic(dest, content);
    if (EXECUTABLE_PATHS.has(path)) chmodSync(dest, 0o755);
    written.push(path);
  }
  return written.sort();
}
