import { resolve } from "node:path";
import { readTree } from "../infrastructure/fs-tree";
import type { FileTree } from "../modules/standard/file-tree";

// This file lives at <repo>/src/app/repo.ts, so two levels up is the repo root.
export const repoRoot = resolve(import.meta.dir, "../..");

export function readRepoTree(): FileTree {
  return readTree(repoRoot);
}
