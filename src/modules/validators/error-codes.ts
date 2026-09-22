import { read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";
import type { ValidatorOptions } from "./types";

const RULE = "forge614-rule-machine-contracts";
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;
const CONTRACT_ROW = /^\|\s*`([^`]+)`\s*\|/;
const PRINT_ERROR = /printError\(\s*"([^"]+)"/g;

// Only inspects CONTRACT.md and `printError` calls under src/; codes of
// other nodes are validated when phase 0.2's verifier runs on their repos.
export function validateErrorCodes(tree: FileTree, _options: ValidatorOptions): Finding[] {
  const evidence: string[] = [];

  const contract = read(tree, "CONTRACT.md");
  if (contract !== undefined) {
    const section = contract.split(/^## /m).find((s) => s.startsWith("Códigos de error")) ?? "";
    for (const line of section.split("\n")) {
      const m = CONTRACT_ROW.exec(line);
      if (m?.[1] !== undefined && m[1] !== "Código" && !ERROR_CODE_PATTERN.test(m[1])) {
        evidence.push(`CONTRACT.md: ${m[1]}`);
      }
    }
  }

  for (const [path, text] of tree.files) {
    if (!path.startsWith("src/") || !path.endsWith(".ts") || path.endsWith(".test.ts")) continue;
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(PRINT_ERROR)) {
        const code = m[1] ?? "";
        if (!ERROR_CODE_PATTERN.test(code)) evidence.push(`${path}:${i + 1}: ${code}`);
      }
    });
  }

  return evidence.length === 0 ? [pass(RULE, "errorCodesOk")] : [fail(RULE, evidence, "errorCodesInvalid")];
}
