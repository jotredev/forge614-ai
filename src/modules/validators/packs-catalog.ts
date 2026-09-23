import { PackSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import { parseJsonData } from "./json-data";

const RULE = "forge614-rule-package-naming";

export function validatePacksCatalog(tree: FileTree): Finding[] {
  const evidence: string[] = [];
  const invalidJson: string[] = [];

  for (const path of listUnder(tree, "standard/packs/").filter((p) => p.endsWith("/pack.json"))) {
    const dir = path.split("/")[2] ?? "";
    const json = parseJsonData(path, read(tree, path) ?? "{}");
    if (!json.ok) {
      invalidJson.push(json.evidence);
      continue;
    }
    const parsed = PackSchema.safeParse(json.data);
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

  const packs = evidence.length === 0 ? pass(RULE, "packsOk") : fail(RULE, evidence, "packsInvalid");
  return invalidJson.length === 0 ? [packs] : [packs, fail(RULE, invalidJson, "dataFileInvalidJson")];
}
