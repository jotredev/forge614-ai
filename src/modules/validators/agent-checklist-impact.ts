import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-agent-checklist-impact";
const SECTION = "## Impacto en el procedimiento de agentes";

// `\b` cannot be used after "Sí": JS's ASCII-only \w does not recognize "í"
// as a word character, so the boundary between "í" and the following space
// never fires and the regex silently rejects every valid "Sí" answer.
// A Unicode-aware separator (whitespace or punctuation) is used instead.
const IMPACT_RE = /^(Sí|No)[\s\p{P}].{10,}/su;

export function validateAgentChecklistImpact(tree: FileTree, _options: ValidatorOptions): Finding[] {
  const evidence: string[] = [];
  for (const path of listUnder(tree, ".agents/plans/")) {
    const text = read(tree, path) ?? "";
    if (!/^\*\*Status:\*\*\s*completed\s*$/m.test(text)) continue;
    const start = text.indexOf(SECTION);
    const body = start < 0 ? "" : (text.slice(start + SECTION.length).split(/\n## /)[0]?.trim() ?? "");
    if (!IMPACT_RE.test(body)) {
      evidence.push(`${path}: section '${SECTION}' must start with 'Sí' or 'No' and explain`);
    }
  }
  return evidence.length === 0 ? [pass(RULE, "agentImpactDeclared")] : [fail(RULE, evidence, "agentImpactMissing")];
}
