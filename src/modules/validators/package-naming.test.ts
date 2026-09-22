import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validatePackageNaming } from "./package-naming";

const opts = { forbiddenMentions: [], today: "2026-09-22" };

test("every folder under standard/rules, packs and .agents/{rules,skills,policies,mcps,plugins} is canonical", () => {
  const ok = treeFrom({
    "standard/rules/forge614-rule-x/manifest.json": "{}",
    ".agents/skills/deploy/SKILL.md": "",
    ".agents/skills/forge614-skill-pdf/SKILL.md": "",
  });
  expect(validatePackageNaming(ok, opts)[0]?.verdict).toBe("pass");

  const bad = treeFrom({ "standard/rules/package-naming/manifest.json": "{}" });
  expect(validatePackageNaming(bad, opts)[0]?.evidence).toEqual(["standard/rules/package-naming"]);
});

test("a Hub package under .agents/ with a manifest.json must be canonical too", () => {
  const bad = treeFrom({ ".agents/skills/pdf-tools/manifest.json": "{}" });
  const f = validatePackageNaming(bad, opts)[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual([".agents/skills/pdf-tools"]);
});
