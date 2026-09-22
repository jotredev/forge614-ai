import { readTree } from "../infrastructure/fs-tree";
import { read, type FileTree } from "../modules/standard/file-tree";
import { renderTemplate } from "../modules/standard/template";

export interface NodeVars {
  NODE_NAME: string;
  NODE_TITLE: string;
  REPO: string;
  ASSET_PREFIX: string;
  STANDARD_VERSION: string;
}

// Source path inside `standard/templates/` -> destination path relative to
// the node repository root.
const DESTINATIONS: ReadonlyArray<readonly [string, string]> = [
  ["install.sh", "install.sh"],
  ["install.ps1", "install.ps1"],
  ["verify.yml", ".github/workflows/verify.yml"],
  ["release.yml", ".github/workflows/release.yml"],
  ["CONTRACT.md", "CONTRACT.md"],
  ["CONTRACT.en.md", "CONTRACT.en.md"],
  ["README.md", "README.md"],
  ["README.en.md", "README.en.md"],
  ["decision.md", "docs/decisions/TEMPLATE.md"],
  ["plan.md", ".agents/templates/plan.md"],
  ["hooks/pre-push", ".githooks/pre-push"],
  ["BRANCH_PROTECTION.md", "BRANCH_PROTECTION.md"],
  ["BRANCH_PROTECTION.en.md", "BRANCH_PROTECTION.en.md"],
  ["docs-workflows.md", "docs/es/NN-workflows.md"],
  ["docs-workflows.en.md", "docs/en/NN-workflows.md"],
];

// Reads the templates tree from disk. Kept in `app/` (not called directly
// from `interfaces/`) so the CLI only depends on `app`, respecting the
// `interfaces -> app -> infrastructure` layering: `infrastructure/fs-tree`
// itself is not imported outside this module and `infrastructure/process`.
export function readTemplatesTree(root: string): FileTree {
  return readTree(root);
}

export function renderNodeFiles(templates: FileTree, vars: NodeVars): Record<string, string> {
  const varsRecord: Record<string, string> = { ...vars };
  const out: Record<string, string> = {};
  for (const [src, dest] of DESTINATIONS) {
    const content = read(templates, src);
    if (content === undefined) throw new Error(`template missing: ${src}`);
    out[dest] = renderTemplate(content, varsRecord);
  }
  return out;
}
