import { listUnder, read, type FileTree } from "../standard/file-tree";
import { fail, pass, type Finding } from "../standard/finding";

const RULE = "forge614-rule-bilingual-docs";

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["README.md", "README.en.md"],
  ["standard/STANDARD.md", "standard/STANDARD.en.md"],
  ["CONTRACT.md", "CONTRACT.en.md"],
  ["standard/FORGE614_ECOSYSTEM_CONTRACT.md", "standard/FORGE614_ECOSYSTEM_CONTRACT.en.md"],
];

function headingLines(text: string): string[] {
  return text.split("\n").filter((l) => /^#{1,6}\s/.test(l));
}

function headings(text: string): number {
  return headingLines(text).length;
}

// Extracts, in document order, the leading number (or Anexo/Appendix letter)
// of every heading that carries one. This is what lets the validator compare
// heading order and numbering between an es/en pair, not just their count.
function headingNumbering(text: string): string[] {
  const tokens: string[] = [];
  for (const line of headingLines(text)) {
    const body = line.replace(/^#{1,6}\s+/, "");
    const numbered = /^(\d+(?:\.\d+)*)\./.exec(body)?.[1];
    if (numbered) {
      tokens.push(numbered);
      continue;
    }
    const lettered = /^(?:Anexo|Appendix)\s+([A-Za-z0-9]+)/i.exec(body)?.[1];
    if (lettered) tokens.push(lettered.toUpperCase());
  }
  return tokens;
}

export function validateBilingualDocs(tree: FileTree): Finding[] {
  const evidence: string[] = [];

  for (const [es, en] of PAIRS) {
    const a = read(tree, es);
    const b = read(tree, en);
    if (a !== undefined && b === undefined) {
      evidence.push(`${es}: missing ${en}`);
      continue;
    }
    if (b !== undefined && a === undefined) {
      evidence.push(`${en}: missing ${es}`);
      continue;
    }
    if (a === undefined || b === undefined) continue;

    const ha = headings(a);
    const hb = headings(b);
    if (ha !== hb) evidence.push(`${es}: ${ha} headings vs ${en}: ${hb}`);

    const na = headingNumbering(a);
    const nb = headingNumbering(b);
    if (JSON.stringify(na) !== JSON.stringify(nb)) {
      evidence.push(`${es}: heading numbering [${na.join(", ")}] vs ${en}: [${nb.join(", ")}]`);
    }
  }

  for (const es of listUnder(tree, "docs/es/")) {
    const num = /docs\/es\/(\d{2})-/.exec(es)?.[1];
    if (!num) continue;
    const en = listUnder(tree, `docs/en/${num}-`)[0];
    if (!en) {
      evidence.push(`${es}: missing docs/en/${num}-*.md`);
      continue;
    }
    const ha = headings(read(tree, es) ?? "");
    const hb = headings(read(tree, en) ?? "");
    if (ha !== hb) evidence.push(`${es}: ${ha} headings vs ${en}: ${hb}`);
  }

  return evidence.length === 0 ? [pass(RULE, "docsParityOk")] : [fail(RULE, evidence, "docsParityBroken")];
}
