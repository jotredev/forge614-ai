import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTree } from "./fs-tree";

test("readTree skips node_modules and binaries", () => {
  const root = mkdtempSync(join(tmpdir(), "tree-"));
  mkdirSync(join(root, "node_modules/x"), { recursive: true });
  writeFileSync(join(root, "node_modules/x/a.md"), "no");
  writeFileSync(join(root, "a.md"), "yes");
  writeFileSync(join(root, "img.png"), "bin");
  expect([...readTree(root).files.keys()]).toEqual(["a.md"]);
});

test("readTree includes extensionless text files and ignores .superpowers by default", () => {
  const root = mkdtempSync(join(tmpdir(), "tree-"));
  mkdirSync(join(root, "hooks"), { recursive: true });
  mkdirSync(join(root, ".superpowers"), { recursive: true });
  writeFileSync(join(root, "hooks/pre-push"), "#!/bin/sh\n");
  writeFileSync(join(root, ".superpowers/x.md"), "ignored");
  const keys = [...readTree(root).files.keys()].sort();
  expect(keys).toEqual(["hooks/pre-push"]);
});
