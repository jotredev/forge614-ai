import { describe, expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { DecisionsIndexSchema } from "../modules/standard/schemas";
import { buildDecisionsIndex, serializeDecisionsIndex } from "./decisions-index";

const rec = (n: string, title: string, estado: string, session = "forge614-ai-s1") =>
  `# ${n} — ${title}\n\n**Fecha:** 2026-09-22\n**Estado:** ${estado}\n**Sesión:** ${session}\n\n## Contexto\nx\n## Decisión\nx\n## Alternativas descartadas\nx\n## Consecuencias\nx\n`;

describe("buildDecisionsIndex", () => {
  test("lists only numbered acta files, sorted, ignoring README/TEMPLATE/INDEX.json", () => {
    const tree = treeFrom({
      "docs/decisions/0002-b.md": rec("0002", "B", "aceptada"),
      "docs/decisions/0001-a.md": rec("0001", "A", "aceptada"),
      "docs/decisions/README.md": "# Actas",
      "docs/decisions/TEMPLATE.md": "# NNNN — <título>",
      "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }),
    });
    const index = buildDecisionsIndex(tree);
    expect(index.decisions.map((d) => d.file)).toEqual(["0001-a.md", "0002-b.md"]);
  });

  test("parses number, slug, title, date, status and session from the acta header", () => {
    const tree = treeFrom({ "docs/decisions/0001-micronucleo.md": rec("0001", "Arquitectura de micronúcleo", "aceptada") });
    const [entry] = buildDecisionsIndex(tree).decisions;
    expect(entry).toEqual({
      number: "0001",
      slug: "micronucleo",
      title: "Arquitectura de micronúcleo",
      status: "aceptada",
      date: "2026-09-22",
      session: "forge614-ai-s1",
      file: "0001-micronucleo.md",
    });
  });

  test("normalizes 'aceptada (YYYY-MM-DD)' to 'aceptada' (acta 0013)", () => {
    const tree = treeFrom({ "docs/decisions/0013-contratos.md": rec("0013", "Contratos", "aceptada (2026-09-22)") });
    expect(buildDecisionsIndex(tree).decisions[0]?.status).toBe("aceptada");
  });

  test("maps 'reemplazada por NNNN' to status reemplazada with replacedBy", () => {
    const tree = treeFrom({ "docs/decisions/0002-vieja.md": rec("0002", "Vieja", "reemplazada por 0001") });
    expect(buildDecisionsIndex(tree).decisions[0]).toMatchObject({ status: "reemplazada", replacedBy: "0001" });
  });

  test("the built index always satisfies DecisionsIndexSchema", () => {
    const tree = treeFrom({
      "docs/decisions/0001-a.md": rec("0001", "A", "aceptada"),
      "docs/decisions/0002-b.md": rec("0002", "B", "revocada"),
    });
    const result = DecisionsIndexSchema.safeParse(buildDecisionsIndex(tree));
    expect(result.success).toBe(true);
  });
});

describe("serializeDecisionsIndex", () => {
  test("renders deterministic, pretty JSON ending in a newline", () => {
    const serialized = serializeDecisionsIndex({ schemaVersion: 1, decisions: [] });
    expect(serialized).toBe('{\n  "schemaVersion": 1,\n  "decisions": []\n}\n');
  });
});
