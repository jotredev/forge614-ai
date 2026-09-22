import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { readTree } from "../../infrastructure/fs-tree";
import { PackSchema } from "../standard/schemas";
import { listUnder, read, treeFrom } from "../standard/file-tree";
import { validatePacksCatalog } from "./packs-catalog";

const pack = (rules: string[]) =>
  JSON.stringify({
    schemaVersion: 1,
    name: "forge614-pack-ecosystem-node",
    version: "1.0.0",
    title: { es: "n", en: "n" },
    rules,
  });

test("pack rules must exist", () => {
  const ok = treeFrom({
    "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["forge614-rule-a"]),
    "standard/rules/forge614-rule-a/manifest.json": "{}",
  });
  expect(validatePacksCatalog(ok)[0]?.verdict).toBe("pass");

  const bad = treeFrom({
    "standard/packs/forge614-pack-ecosystem-node/pack.json": pack(["forge614-rule-zzz"]),
  });
  expect(validatePacksCatalog(bad)[0]?.evidence).toEqual([
    "forge614-pack-ecosystem-node: rule 'forge614-rule-zzz' not found in standard/rules",
  ]);
});

test("pack name must match its folder", () => {
  const tree = treeFrom({
    "standard/packs/forge614-pack-ecosystem-node/pack.json": JSON.stringify({
      schemaVersion: 1,
      name: "forge614-pack-other",
      version: "1.0.0",
      title: { es: "n", en: "n" },
      rules: ["forge614-rule-a"],
    }),
    "standard/rules/forge614-rule-a/manifest.json": "{}",
  });
  expect(validatePacksCatalog(tree)[0]?.evidence).toEqual([
    "forge614-pack-ecosystem-node: pack name 'forge614-pack-other' differs from folder",
  ]);
});

test("invalid pack.json is reported", () => {
  const tree = treeFrom({
    "standard/packs/forge614-pack-ecosystem-node/pack.json": JSON.stringify({ not: "a pack" }),
  });
  expect(validatePacksCatalog(tree)[0]?.evidence).toEqual([
    "forge614-pack-ecosystem-node: invalid pack.json",
  ]);
});

// On-disk consistency: the ecosystem node pack must list every core rule
// package present under standard/rules/, in both directions, so adding a
// rule without updating the pack fails this test.
test("forge614-pack-ecosystem-node lists exactly the core rules present on disk", () => {
  const root = resolve(import.meta.dir, "../../..");
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
