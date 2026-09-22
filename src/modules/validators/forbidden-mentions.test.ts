import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
import { validateForbiddenMentions } from "./forbidden-mentions";

test("reports file:line for each forbidden term, case-insensitive, whole word", () => {
  const tree = treeFrom({
    "docs/es/01.md": "línea uno\nusa Zzzproduct aquí\n",
    "src/a.ts": "// zzzproductX no cuenta\n",
    "standard/forbidden-mentions.json": "{}",
  });
  const f = validateForbiddenMentions(tree, { forbiddenMentions: ["zzzproduct"] })[0];
  expect(f?.verdict).toBe("fail");
  expect(f?.evidence).toEqual(["docs/es/01.md:2: zzzproduct"]);
});

test("passes when there are no matches", () => {
  const tree = treeFrom({ "README.md": "todo bien aquí\n" });
  expect(validateForbiddenMentions(tree, { forbiddenMentions: ["zzzproduct"] })[0]?.verdict).toBe("pass");
});

test("never scans standard/forbidden-mentions.json itself or anything under .superpowers/", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": JSON.stringify({ schemaVersion: 1, terms: ["zzzproduct"], excludePaths: [] }),
    ".superpowers/notes/plan.md": "esto menciona zzzproduct en un borrador\n",
  });
  expect(validateForbiddenMentions(tree, { forbiddenMentions: ["zzzproduct"] })[0]?.verdict).toBe("pass");
});

test("excludePaths declared inside forbidden-mentions.json are also honored", () => {
  const tree = treeFrom({
    "standard/forbidden-mentions.json": JSON.stringify({
      schemaVersion: 1,
      terms: ["zzzproduct"],
      excludePaths: ["docs/historical/"],
    }),
    "docs/historical/old.md": "zzzproduct aparece aquí como registro histórico\n",
  });
  expect(validateForbiddenMentions(tree, { forbiddenMentions: ["zzzproduct"] })[0]?.verdict).toBe("pass");
});
