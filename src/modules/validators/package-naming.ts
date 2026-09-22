import { PACKAGE_NAME_PATTERN } from "../standard/package-name";
import type { FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-package-naming";

// Obligatory everywhere the Hub distributes packages.
const STRICT_ROOTS = ["standard/rules/", "standard/packs/"];

// Under .agents/, only folders that carry a Hub manifest.json are checked:
// the person's own folders (e.g. .agents/skills/deploy/) are never touched.
const HUB_ROOTS = [".agents/rules/", ".agents/skills/", ".agents/policies/", ".agents/mcps/", ".agents/plugins/"];

export function validatePackageNaming(tree: FileTree, _options: ValidatorOptions): Finding[] {
  const bad = new Set<string>();
  for (const path of tree.files.keys()) {
    for (const root of STRICT_ROOTS) {
      if (path.startsWith(root)) {
        const dir = path.slice(root.length).split("/")[0] ?? "";
        if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir);
      }
    }
    for (const root of HUB_ROOTS) {
      if (path.startsWith(root) && path.endsWith("/manifest.json")) {
        const dir = path.slice(root.length).split("/")[0] ?? "";
        if (!PACKAGE_NAME_PATTERN.test(dir)) bad.add(root + dir);
      }
    }
  }
  return bad.size === 0 ? [pass(RULE, "packageNamesOk")] : [fail(RULE, [...bad].sort(), "packageNamesInvalid")];
}
