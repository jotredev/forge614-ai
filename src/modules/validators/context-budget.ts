import { PackSchema } from "../standard/schemas";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import { parseJsonData } from "./json-data";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-context-budget";
const PACK_PATH = "standard/packs/forge614-pack-ecosystem-node/pack.json";
const BUDGET = 3000;

// Coarse token estimate (acta 0020 asks only for an estimate, labeled as
// such in the finding message): ~4 characters per token.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// The index line Forge614 would show at session start for a rule: its
// package name plus the first line of its RULE.md (its one-line summary).
function indexLine(tree: FileTree, rule: string): string {
  const ruleMd = read(tree, `standard/rules/${rule}/RULE.md`) ?? "";
  const firstLine = ruleMd.split("\n")[0]?.trim() ?? "";
  return `${rule}: ${firstLine}`;
}

export function validateContextBudget(tree: FileTree, _options: ValidatorOptions): Finding[] {
  const raw = read(tree, PACK_PATH);
  if (raw === undefined) return [fail(RULE, [`${PACK_PATH} missing`], "contextBudgetInvalid")];

  const json = parseJsonData(PACK_PATH, raw);
  if (!json.ok) return [fail(RULE, [json.evidence], "dataFileInvalidJson")];
  const parsed = PackSchema.safeParse(json.data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return [fail(RULE, issues, "contextBudgetInvalid")];
  }

  const evidence: string[] = [];
  let total = 0;
  for (const rule of parsed.data.rules) {
    const line = indexLine(tree, rule);
    const tokens = estimateTokens(line);
    total += tokens;
    evidence.push(`${rule}: ~${tokens} tokens (estimate)`);
  }

  const params = { tokens: String(total), budget: String(BUDGET) };
  return total > BUDGET
    ? [fail(RULE, evidence, "contextBudgetOverBudget", params)]
    : [pass(RULE, "contextBudgetOk", params)];
}
