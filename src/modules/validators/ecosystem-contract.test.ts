import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { treeFrom } from "../standard/file-tree";
import { validateEcosystemContract } from "./ecosystem-contract";

// This file lives at <repo>/src/modules/validators/ecosystem-contract.test.ts,
// so three levels up is the repo root.
const REPO_ROOT = resolve(import.meta.dir, "../../..");
const ES_PATH = resolve(REPO_ROOT, "standard/FORGE614_ECOSYSTEM_CONTRACT.md");
const EN_PATH = resolve(REPO_ROOT, "standard/FORGE614_ECOSYSTEM_CONTRACT.en.md");
const NODE_POINTER_PATH = resolve(REPO_ROOT, "forge614.node.json");

// The five products and two implementation packages named in the ecosystem
// hierarchy (section 1), besides forge614-ai itself.
const HIERARCHY_NODES = ["ai", "shell", "engines", "workers", "engram", "atlas", "hub", "sentinel"];

function headings(text: string): string[] {
  return text.split("\n").filter((l) => /^#{1,6}\s/.test(l));
}

// Extracts the first fenced ```text block that follows a given heading, so
// the "exactly once" check below looks only at the hierarchy diagram, not at
// every later mention of a product name in prose or tables.
function fencedBlockAfter(text: string, heading: string): string {
  const at = text.indexOf(heading);
  if (at < 0) throw new Error(`heading not found: ${heading}`);
  const rest = text.slice(at);
  const start = rest.indexOf("```text");
  const end = rest.indexOf("```", start + "```text".length);
  if (start < 0 || end < 0) throw new Error(`no fenced text block after: ${heading}`);
  return rest.slice(start, end);
}

test("root copy must be byte-identical to canonical; absent copy passes", () => {
  expect(validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "A\n" }), "A\n")[0]?.verdict).toBe("pass");
  expect(validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "A \n" }), "A\n")[0]?.evidence).toEqual([
    "FORGE614_ECOSYSTEM_CONTRACT.md differs from the published contract (sha256 mismatch)",
  ]);
  expect(validateEcosystemContract(treeFrom({}), "A\n")[0]?.verdict).toBe("pass");
});

test("validateEcosystemContract fails when the local copy diverges byte-for-byte from the canonical text", () => {
  const findings = validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": "B\n" }), "A\n");
  expect(findings[0]?.verdict).toBe("fail");
  expect(findings[0]?.ruleId).toBe("forge614-rule-machine-contracts");
});

describe("published contract v2 (standard/FORGE614_ECOSYSTEM_CONTRACT.md)", () => {
  const es = readFileSync(ES_PATH, "utf8");
  const en = readFileSync(EN_PATH, "utf8");

  test("both es/en contract files exist and are non-empty", () => {
    expect(es.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });

  test("es/en heading parity", () => {
    expect(headings(es).length).toBe(headings(en).length);
    expect(headings(es).length).toBeGreaterThan(0);
  });

  test("the hierarchy (section 1) names every product and package exactly once", () => {
    const esBlock = fencedBlockAfter(es, "## 1.");
    const enBlock = fencedBlockAfter(en, "## 1.");
    for (const node of HIERARCHY_NODES) {
      const esMatches = esBlock.match(new RegExp(`forge614-${node}\\b`, "g")) ?? [];
      const enMatches = enBlock.match(new RegExp(`forge614-${node}\\b`, "g")) ?? [];
      expect(esMatches, `es hierarchy should name forge614-${node} exactly once`).toHaveLength(1);
      expect(enMatches, `en hierarchy should name forge614-${node} exactly once`).toHaveLength(1);
    }
  });

  test("this repository's forge614.node.json references the standard version and ecosystem forge614", () => {
    const pointer: unknown = JSON.parse(readFileSync(NODE_POINTER_PATH, "utf8"));
    expect(pointer).toMatchObject({ ecosystem: "forge614" });
    const withStandard = pointer as { standard?: { version?: unknown } };
    expect(typeof withStandard.standard?.version).toBe("string");
    expect((withStandard.standard?.version as string).length).toBeGreaterThan(0);
  });

  test("validateEcosystemContract passes this repository's own copy against itself", () => {
    const findings = validateEcosystemContract(treeFrom({ "FORGE614_ECOSYSTEM_CONTRACT.md": es }), es);
    expect(findings[0]?.verdict).toBe("pass");
  });
});
