import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { readTree } from "../../src/infrastructure/fs-tree";
import { listUnder, read } from "../../src/modules/standard/file-tree";
import { PackSchema } from "../../src/modules/standard/schemas";
import { validatePacksCatalog } from "../../src/modules/validators/packs-catalog";

// This test reads the real repository from disk, so it lives here and not
// next to the validator: a modules test must not depend on infrastructure.
// On-disk consistency: the ecosystem node pack must list every core rule
// package present under standard/rules/, in both directions, so adding a
// rule without updating the pack fails this test.
test("forge614-pack-ecosystem-node lists exactly the core rules present on disk", () => {
  const root = resolve(import.meta.dir, "../..");
  const tree = readTree(root);

  const findings = validatePacksCatalog(tree);
  expect(findings[0]?.verdict).toBe("pass");

  const onDisk = new Set(
    listUnder(tree, "standard/rules/")
      .map((p) => p.split("/")[2] ?? "")
      .filter((dir) => dir.length > 0),
  );

  const raw = read(tree, "standard/packs/forge614-pack-ecosystem-node/pack.json");
  expect(raw).toBeDefined();
  const pack = PackSchema.parse(JSON.parse(raw ?? "{}"));
  const listed = new Set(pack.rules);

  for (const rule of listed) {
    expect(onDisk.has(rule), `pack lists '${rule}' but it is not present under standard/rules/`).toBe(true);
  }
  for (const rule of onDisk) {
    expect(listed.has(rule), `core rule '${rule}' on disk is missing from the ecosystem node pack`).toBe(true);
  }
});
