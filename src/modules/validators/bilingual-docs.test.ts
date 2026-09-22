import { describe, expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateBilingualDocs } from "./bilingual-docs";

describe("forge614-rule-bilingual-docs", () => {
  test("pass when every numbered es doc has an en twin with same number and headings count", () => {
    const tree = treeFrom({
      "docs/es/00-resumen.md": "# T\n\n## A\n## B\n",
      "docs/en/00-summary.md": "# T\n\n## A\n## B\n",
      "standard/STANDARD.md": "# S\n## 1\n",
      "standard/STANDARD.en.md": "# S\n## 1\n",
      "README.md": "x",
      "README.en.md": "x",
    });
    expect(validateBilingualDocs(tree).every((f) => f.verdict === "pass")).toBe(true);
  });

  test("fail on missing twin or heading count mismatch", () => {
    const tree = treeFrom({
      "docs/es/01-x.md": "# T\n## A\n## B\n",
      "docs/en/01-x.md": "# T\n## A\n",
      "docs/es/02-y.md": "# T\n",
      "README.md": "x",
      "README.en.md": "x",
    });
    const fails = validateBilingualDocs(tree).filter((f) => f.verdict === "fail");
    expect(fails.map((f) => f.evidence).flat()).toEqual(
      expect.arrayContaining([
        "docs/es/01-x.md: 3 headings vs docs/en/01-x.md: 2",
        "docs/es/02-y.md: missing docs/en/02-*.md",
      ]),
    );
  });

  test("fail when STANDARD.md and STANDARD.en.md headings differ in order or numbering", () => {
    const tree = treeFrom({
      "README.md": "x",
      "README.en.md": "x",
      "standard/STANDARD.md":
        "# Estándar de Nodo Forge614 — versión 1.0.0\n## 1. Identidad y contrato del nodo\n## 2. Estructura del repositorio y capas\n## Anexo A. Patrones canónicos por elemento\n",
      "standard/STANDARD.en.md":
        "# Forge614 Node Standard — version 1.0.0\n## 1. Node identity and contract\n## 3. Repository structure and layers\n## Appendix A. Canonical patterns by element\n",
    });
    const fails = validateBilingualDocs(tree).filter((f) => f.verdict === "fail");
    expect(fails).toHaveLength(1);
    expect(fails[0]?.evidence.some((e) => e.includes("heading numbering"))).toBe(true);
  });

  test("fail when a heading is missing on one side of a bilingual pair", () => {
    const tree = treeFrom({
      "README.md": "x",
      "README.en.md": "x",
      "standard/STANDARD.md": "# T\n## 1. A\n## 2. B\n## 3. C\n",
      "standard/STANDARD.en.md": "# T\n## 1. A\n## 2. B\n",
    });
    const fails = validateBilingualDocs(tree).filter((f) => f.verdict === "fail");
    expect(fails).toHaveLength(1);
    expect(fails[0]?.evidence).toEqual(expect.arrayContaining([expect.stringContaining("headings vs")]));
  });
});
