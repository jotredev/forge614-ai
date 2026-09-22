import { SupportMatrixSchema } from "../standard/schemas";
import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-agent-checklist-impact";
const DAY = 86_400_000;

export function validateSupportMatrix(tree: FileTree, options: ValidatorOptions): Finding[] {
  const raw = read(tree, "standard/support-matrix.json");
  if (raw === undefined) return [fail(RULE, ["standard/support-matrix.json missing"], "supportMatrixMissing")];

  const parsed = SupportMatrixSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return [fail(RULE, issues, "supportMatrixInvalid")];
  }

  const evidence: string[] = [];
  for (const cell of parsed.data.cells) {
    if (cell.status !== "revalidate" || cell.revalidateSince === undefined) continue;
    if (Date.parse(options.today) - Date.parse(cell.revalidateSince) > 30 * DAY) {
      evidence.push(`${cell.node}/${cell.agent}: in revalidate since ${cell.revalidateSince} (> 30 days)`);
    }
  }

  return evidence.length === 0 ? [pass(RULE, "supportMatrixCurrent")] : [fail(RULE, evidence, "supportMatrixStale", { days: "30" })];
}
