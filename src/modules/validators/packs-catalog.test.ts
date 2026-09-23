import { expect, test } from "bun:test";
import { treeFrom } from "../standard/file-tree";
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

test("a pack.json that is not valid JSON is a fail finding, not a throw", () => {
  const tree = treeFrom({ "standard/packs/forge614-pack-ecosystem-node/pack.json": "{ not json" });
  const invalid = validatePacksCatalog(tree).find((f) => f.messageKey === "dataFileInvalidJson");
  expect(invalid?.verdict).toBe("fail");
  expect(invalid?.evidence).toHaveLength(1);
  expect(invalid?.evidence[0]).toStartWith("standard/packs/forge614-pack-ecosystem-node/pack.json: invalid JSON: ");
});

test("invalid pack.json is reported", () => {
  const tree = treeFrom({
    "standard/packs/forge614-pack-ecosystem-node/pack.json": JSON.stringify({ not: "a pack" }),
  });
  expect(validatePacksCatalog(tree)[0]?.evidence).toEqual([
    "forge614-pack-ecosystem-node: invalid pack.json",
  ]);
});
