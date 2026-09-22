import { expect, test } from "bun:test";
import { treeFrom } from "../modules/standard/file-tree";
import { runValidators } from "./run-validators";

test("aggregates every validator and computes worst verdict", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: ["zzz"], excludePaths: [] }),
    "docs/es/01-a.md": "zzz\n",
    "README.md": "",
    "README.en.md": "",
    "standard/support-matrix.json": JSON.stringify({ schemaVersion: 1, nodes: ["a"], agents: ["b"], cells: [] }),
    "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }),
  });
  const report = runValidators(tree, { standardVersion: "1.0.0", today: "2026-09-22" });
  expect(report.schemaVersion).toBe(1);
  expect(report.standard).toBe("1.0.0");
  expect(report.verdict).toBe("fail");
  expect(report.checks.map((c) => c.ruleId)).toEqual(
    expect.arrayContaining([
      "forge614-rule-no-external-product-mentions",
      "forge614-rule-bilingual-docs",
      "forge614-rule-package-naming",
      "forge614-rule-decision-records",
      "forge614-rule-agent-checklist-impact",
      "forge614-rule-thin-workflows",
      "forge614-rule-context-budget",
    ]),
  );
  const forbidden = report.checks.find((c) => c.ruleId === "forge614-rule-no-external-product-mentions");
  expect(forbidden?.verdict).toBe("fail");
  expect(forbidden?.message).toEqual({ es: "Menciones a productos externos.", en: "External product mentions." });
});

test("a malformed forbidden-mentions.json yields no terms and a fail finding, without throwing", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: [] }),
    "standard/support-matrix.json": JSON.stringify({ schemaVersion: 1, nodes: [], agents: [], cells: [] }),
    "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }),
  });
  const report = runValidators(tree, { standardVersion: "1.0.0", today: "2026-09-22" });
  const dataInvalid = report.checks.find((c) => c.messageKey === "forbiddenMentionsDataInvalid");
  expect(dataInvalid?.verdict).toBe("fail");
  expect(dataInvalid?.ruleId).toBe("forge614-rule-no-external-product-mentions");
  expect(report.verdict).toBe("fail");
});

test("invalid JSON in forbidden-mentions.json is handled without throwing", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": "not json",
    "standard/support-matrix.json": JSON.stringify({ schemaVersion: 1, nodes: [], agents: [], cells: [] }),
    "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }),
  });
  const report = runValidators(tree, { standardVersion: "1.0.0", today: "2026-09-22" });
  const dataInvalid = report.checks.find((c) => c.messageKey === "forbiddenMentionsDataInvalid");
  expect(dataInvalid?.verdict).toBe("fail");
});

test("passes clean when the real-shaped tree has no violations", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: ["not-present-anywhere"], excludePaths: [] }),
    "standard/support-matrix.json": JSON.stringify({ schemaVersion: 1, nodes: [], agents: [], cells: [] }),
    "docs/decisions/INDEX.json": JSON.stringify({ schemaVersion: 1, decisions: [] }),
  });
  const report = runValidators(tree, { standardVersion: "1.0.0", today: "2026-09-22" });
  expect(report.checks.every((c) => c.message.es.length > 0 && c.message.en.length > 0)).toBe(true);
});
