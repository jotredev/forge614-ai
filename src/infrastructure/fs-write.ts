import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function writeTextAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, content, { encoding: "utf8", mode: 0o644 });
  renameSync(tmp, path);
}
