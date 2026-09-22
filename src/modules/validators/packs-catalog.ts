import { PackSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";

const RULE = "forge614-rule-package-naming";

export function validatePacksCatalog(tree: FileTree): Finding[] {
  const evidence: string[] = [];

  for (const path of listUnder(tree, "standard/packs/").filter((p) => p.endsWith("/pack.json"))) {
    const dir = path.split("/")[2] ?? "";
    const raw = read(tree, path) ?? "{}";
    const parsed = PackSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      evidence.push(`${dir}: invalid pack.json`);
      continue;
    }
    if (parsed.data.name !== dir) {
      evidence.push(`${dir}: pack name '${parsed.data.name}' differs from folder`);
    }
    for (const rule of parsed.data.rules) {
      if (!tree.files.has(`standard/rules/${rule}/manifest.json`)) {
        evidence.push(`${dir}: rule '${rule}' not found in standard/rules`);
      }
    }
  }

  return evidence.length === 0 ? [pass(RULE, "packsOk")] : [fail(RULE, evidence, "packsInvalid")];
}
