import { describe, expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateDecisionRecords } from "./decision-records";

const opts = { forbiddenMentions: [], today: "2026-09-22" };

const rec = (n: string, estado: string) =>
  `# ${n} — t\n\n**Fecha:** 2026-09-22\n**Estado:** ${estado}\n**Sesión:** s\n\n## Contexto\nx\n## Decisión\nx\n## Alternativas descartadas\nx\n## Consecuencias\nx\n`;

const indexEntry = (number: string, file: string, status: string, replacedBy?: string) => ({
  number,
  slug: file.replace(/^\d{4}-/, "").replace(/\.md$/, ""),
  title: "t",
  status,
  date: "2026-09-22",
  session: "s",
  file,
  ...(replacedBy ? { replacedBy } : {}),
});

describe("forge614-rule-decision-records", () => {
  test("pass with consecutive numbering, valid states and INDEX.json listing all", () => {
    const tree = treeFrom({
      "docs/decisions/0001-a.md": rec("0001", "aceptada"),
      "docs/decisions/0002-b.md": rec("0002", "reemplazada por 0001"),
      "docs/decisions/INDEX.json": JSON.stringify({
        schemaVersion: 1,
        decisions: [
          indexEntry("0001", "0001-a.md", "aceptada"),
          indexEntry("0002", "0002-b.md", "reemplazada", "0001"),
        ],
      }),
    });
    expect(validateDecisionRecords(tree, opts)[0]?.verdict).toBe("pass");
  });

  test("fail on gap, bad state, missing section and record deleted vs INDEX", () => {
    const tree = treeFrom({
      "docs/decisions/0001-a.md": rec("0001", "cancelada"),
      "docs/decisions/0003-c.md": rec("0003", "aceptada").replace("## Consecuencias\nx\n", ""),
      "docs/decisions/INDEX.json": JSON.stringify({
        schemaVersion: 1,
        decisions: [
          indexEntry("0001", "0001-a.md", "revocada"),
          indexEntry("0002", "0002-b.md", "aceptada"),
          indexEntry("0003", "0003-c.md", "aceptada"),
        ],
      }),
    });
    const ev = validateDecisionRecords(tree, opts)[0]?.evidence ?? [];
    expect(ev).toEqual(
      expect.arrayContaining([
        "0001-a.md: invalid state 'cancelada'",
        "numbering gap before 0003",
        "0003-c.md: missing section '## Consecuencias'",
        "INDEX.json lists 0002-b.md but file is missing (records are never deleted)",
      ]),
    );
  });

  test("fails with a single decisionsIndexMissing finding when INDEX.json does not exist yet", () => {
    const tree = treeFrom({ "docs/decisions/0001-a.md": rec("0001", "aceptada") });
    const findings = validateDecisionRecords(tree, opts);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.verdict).toBe("fail");
    expect(findings[0]?.messageKey).toBe("decisionsIndexMissing");
  });
});
