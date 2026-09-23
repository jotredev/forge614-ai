import { RuleManifestSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import { VALIDATORS } from "./index";
import { parseJsonData } from "./json-data";

const RULE = "forge614-rule-package-naming";

export function validateRulesCatalog(tree: FileTree): Finding[] {
  const evidence: string[] = [];
  const invalidJson: string[] = [];
  const dirs = new Set(listUnder(tree, "standard/rules/").map((p) => p.split("/")[2] ?? ""));

  for (const dir of [...dirs].sort()) {
    const base = `standard/rules/${dir}/`;
    const raw = read(tree, `${base}manifest.json`);
    if (raw === undefined) {
      evidence.push(`${dir}: missing manifest.json`);
      continue;
    }
    const json = parseJsonData(`${base}manifest.json`, raw);
    if (!json.ok) {
      invalidJson.push(json.evidence);
      continue;
    }
    const parsed = RuleManifestSchema.safeParse(json.data);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
      evidence.push(`${dir}: invalid manifest: ${issues}`);
      continue;
    }
    if (parsed.data.name !== dir) evidence.push(`${dir}: manifest.name '${parsed.data.name}' differs from folder`);
    if (parsed.data.validator !== undefined && !(parsed.data.validator in VALIDATORS)) {
      evidence.push(`${dir}: unknown validator '${parsed.data.validator}'`);
    }
    if (read(tree, `${base}RULE.md`) === undefined) evidence.push(`${dir}: missing RULE.md`);
    if (read(tree, `${base}RULE.en.md`) === undefined) evidence.push(`${dir}: missing RULE.en.md`);
  }

  const catalog = evidence.length === 0 ? pass(RULE, "rulesCatalogOk") : fail(RULE, evidence, "rulesCatalogInvalid");
  return invalidJson.length === 0 ? [catalog] : [catalog, fail(RULE, invalidJson, "dataFileInvalidJson")];
}
