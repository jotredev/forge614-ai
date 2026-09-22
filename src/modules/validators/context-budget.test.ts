import { describe, expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateContextBudget } from "./context-budget";

const opts = { forbiddenMentions: [], parseYaml: () => ({}), today: "2026-09-22" };

const pack = (rules: string[]) => JSON.stringify({ schemaVersion: 1, name: "forge614-pack-ecosystem-node", version: "1.0.0", title: { es: "t", en: "t" }, rules });

describe("forge614-rule-context-budget", () => {
  test("pass when the sum of index lines (name + first RULE.md line) is within budget", () => {
    const tree = treeFrom({
      "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["origin-rule-one"]),
      "standard/rules/origin-rule-one/RULE.md": "# A short rule\n\nmore text that is not counted\n",
    });
    const [finding] = validateContextBudget(tree, opts);
    expect(finding?.verdict).toBe("pass");
    expect(finding?.messageKey).toBe("contextBudgetOk");
  });

  test("fails when the estimated total exceeds 3000 tokens", () => {
    const longLine = `# ${"x".repeat(20_000)}`;
    const tree = treeFrom({
      "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["origin-rule-one"]),
      "standard/rules/origin-rule-one/RULE.md": `${longLine}\n`,
    });
    const [finding] = validateContextBudget(tree, opts);
    expect(finding?.verdict).toBe("fail");
    expect(finding?.messageKey).toBe("contextBudgetOverBudget");
  });

  test("fails with contextBudgetInvalid when the ecosystem pack.json is missing", () => {
    const [finding] = validateContextBudget(treeFrom({}), opts);
    expect(finding?.verdict).toBe("fail");
    expect(finding?.messageKey).toBe("contextBudgetInvalid");
  });

  test("pins the exact boundary: total === 3000 still passes (only strictly over budget fails)", () => {
    const rule = "origin-rule-one";
    const prefixLen = `${rule}: `.length;
    const targetLen = 3000 * 4; // a length that is a multiple of 4 makes ceil(len / 4) exact
    const firstLine = "x".repeat(targetLen - prefixLen);
    const tree = treeFrom({
      "standard/packs/forge614-pack-ecosystem-node/pack.json": pack([rule]),
      [`standard/rules/${rule}/RULE.md`]: `${firstLine}\n`,
    });
    const [finding] = validateContextBudget(tree, opts);
    expect(finding?.params.tokens).toBe("3000");
    expect(finding?.verdict).toBe("pass");
    expect(finding?.messageKey).toBe("contextBudgetOk");
  });
});
