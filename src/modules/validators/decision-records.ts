import { DecisionsIndexSchema } from "../standard/schemas";
import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-decision-records";
const DECISIONS_DIR = "docs/decisions/";
const INDEX_PATH = "docs/decisions/INDEX.json";
const FILE_RE = /^docs\/decisions\/(\d{4})-[a-z0-9-]+\.md$/;
const STATE_RE = /^\*\*Estado:\*\*\s*(propuesta|aceptada|revocada|reemplazada por \d{4})(\s*\(.*\))?\s*$/m;
const RAW_STATE_RE = /^\*\*Estado:\*\*\s*(.+)$/m;
const SECTIONS = ["## Contexto", "## Decisión", "## Alternativas descartadas", "## Consecuencias"];

// docs/decisions/INDEX.json is produced by a later task (`bun run
// decisions:index`). Until it exists, there is nothing to cross-check
// records against, so this reports a single, unambiguous finding instead of
// a pile of misleading numbering/state evidence.
export function validateDecisionRecords(tree: FileTree, _options: ValidatorOptions): Finding[] {
  const indexRaw = read(tree, INDEX_PATH);
  if (indexRaw === undefined) return [fail(RULE, [`${INDEX_PATH} missing`], "decisionsIndexMissing")];

  const evidence: string[] = [];
  const files = listUnder(tree, DECISIONS_DIR).filter((p) => FILE_RE.test(p));

  let expected = 1;
  for (const path of files) {
    const name = path.slice(DECISIONS_DIR.length);
    const num = Number(FILE_RE.exec(path)?.[1]);
    if (num !== expected) evidence.push(`numbering gap before ${String(num).padStart(4, "0")}`);
    expected = num + 1;

    const text = read(tree, path) ?? "";
    if (!STATE_RE.test(text)) {
      const raw = RAW_STATE_RE.exec(text)?.[1]?.trim() ?? "?";
      evidence.push(`${name}: invalid state '${raw}'`);
    }
    for (const section of SECTIONS) {
      if (!text.includes(`${section}\n`)) evidence.push(`${name}: missing section '${section}'`);
    }
  }

  let parsedIndex: unknown;
  try {
    parsedIndex = JSON.parse(indexRaw);
  } catch {
    return [fail(RULE, [...evidence, `${INDEX_PATH}: invalid JSON`], "decisionRecordsInvalid")];
  }

  const result = DecisionsIndexSchema.safeParse(parsedIndex);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ");
    evidence.push(`${INDEX_PATH}: invalid index: ${issues}`);
  } else {
    const indexedFiles = new Set(result.data.decisions.map((d) => d.file));
    for (const f of indexedFiles) {
      if (!tree.files.has(`${DECISIONS_DIR}${f}`)) {
        evidence.push(`INDEX.json lists ${f} but file is missing (records are never deleted)`);
      }
    }
    for (const path of files) {
      const name = path.slice(DECISIONS_DIR.length);
      if (!indexedFiles.has(name)) evidence.push(`INDEX.json does not list ${name}`);
    }
  }

  return evidence.length === 0 ? [pass(RULE, "decisionRecordsOk")] : [fail(RULE, evidence, "decisionRecordsInvalid")];
}
