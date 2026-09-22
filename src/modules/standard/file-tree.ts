export interface FileTree {
  readonly files: ReadonlyMap<string, string>;
}

export function treeFrom(entries: Record<string, string>): FileTree {
  return { files: new Map(Object.entries(entries)) };
}

export function listUnder(tree: FileTree, prefix: string): string[] {
  return [...tree.files.keys()].filter((p) => p.startsWith(prefix)).sort();
}

export function read(tree: FileTree, path: string): string | undefined {
  return tree.files.get(path);
}
