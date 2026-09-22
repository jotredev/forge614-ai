import { expect, test } from "bun:test";
import { listUnder, treeFrom } from "./file-tree";

test("listUnder returns sorted relative paths under prefix", () => {
  const tree = treeFrom({ "docs/es/00-a.md": "", "docs/en/00-a.md": "", "README.md": "" });
  expect(listUnder(tree, "docs/es/")).toEqual(["docs/es/00-a.md"]);
  expect(listUnder(tree, "nope/")).toEqual([]);
});
