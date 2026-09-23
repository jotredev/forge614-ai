import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { FileTree } from "../modules/standard/file-tree";

const DEFAULT_IGNORE = ["node_modules", "dist", ".git", ".superpowers", ".claude"];

// Extensions treated as text. A file with no extension (or a dotfile such as
// `.gitignore`) is treated as text too, so tooling artifacts without a suffix
// (e.g. `hooks/pre-push`) are still readable as part of the tree.
const TEXT_EXTENSIONS = new Set(["md", "json", "ts", "yml", "yaml", "sh", "ps1", "txt"]);

function isTextFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return true;
  const ext = name.slice(dot + 1).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export function readTree(root: string, options: { ignore?: readonly string[] } = {}): FileTree {
  const ignore = new Set([...DEFAULT_IGNORE, ...(options.ignore ?? [])]);
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (ignore.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (isTextFile(name)) {
        files.set(relative(root, full).split("\\").join("/"), readFileSync(full, "utf8"));
      }
    }
  };
  walk(root);
  return { files };
}
