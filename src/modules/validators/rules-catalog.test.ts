import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateRulesCatalog } from "./rules-catalog";

const manifest = (name: string, validator?: string) =>
  JSON.stringify({
    schemaVersion: 1,
    name,
    version: "1.0.0",
    level: "core",
    title: { es: "t", en: "t" },
    appliesWhen: [],
    ...(validator ? { validator } : {}),
    compensates: "structural",
    decisions: ["0016"],
  });

test("catalog: manifest valid, folder = manifest.name, RULE.md + RULE.en.md, validator known", () => {
  const good = treeFrom({
    "standard/rules/forge614-rule-package-naming/manifest.json": manifest("forge614-rule-package-naming", "package-naming"),
    "standard/rules/forge614-rule-package-naming/RULE.md": "# r",
    "standard/rules/forge614-rule-package-naming/RULE.en.md": "# r",
  });
  expect(validateRulesCatalog(good)[0]?.verdict).toBe("pass");

  const bad = treeFrom({
    "standard/rules/forge614-rule-x/manifest.json": manifest("forge614-rule-y", "nope"),
    "standard/rules/forge614-rule-x/RULE.md": "# r",
  });
  expect(validateRulesCatalog(bad)[0]?.evidence).toEqual(
    expect.arrayContaining([
      "forge614-rule-x: manifest.name 'forge614-rule-y' differs from folder",
      "forge614-rule-x: unknown validator 'nope'",
      "forge614-rule-x: missing RULE.en.md",
    ]),
  );
});

test("catalog: a manifest.json that is not valid JSON is a fail finding, not a throw", () => {
  const tree = treeFrom({
    "standard/rules/forge614-rule-x/manifest.json": "{ not json",
    "standard/rules/forge614-rule-x/RULE.md": "# r",
    "standard/rules/forge614-rule-x/RULE.en.md": "# r",
  });
  const findings = validateRulesCatalog(tree);
  const invalid = findings.find((f) => f.messageKey === "dataFileInvalidJson");
  expect(invalid?.verdict).toBe("fail");
  expect(invalid?.evidence).toHaveLength(1);
  expect(invalid?.evidence[0]).toStartWith("standard/rules/forge614-rule-x/manifest.json: invalid JSON: ");
});

test("catalog: missing manifest.json is reported", () => {
  const tree = treeFrom({ "standard/rules/forge614-rule-z/RULE.md": "# r" });
  const f = validateRulesCatalog(tree)[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual(["forge614-rule-z: missing manifest.json"]);
});
