import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { treeFrom } from "../modules/standard/file-tree";
import { NotionMapSchema, buildNotionMap, buildNotionMapForTree, serializeNotionMap, writeNotionMap, type NotionMap } from "./build-notion-map";

const SHA256_OF_HOLA = "b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79";

describe("buildNotionMap", () => {
  test("pairs es/en by number and hashes both", () => {
    const map = buildNotionMap(treeFrom({ "docs/es/00-a.md": "hola", "docs/en/00-b.md": "hello" }), "0.1.0");
    expect(map.schemaVersion).toBe(1);
    expect(map.productVersion).toBe("0.1.0");
    expect(map.pages).toHaveLength(1);
    expect(map.pages[0]?.es).toBe("docs/es/00-a.md");
    expect(map.pages[0]?.en).toBe("docs/en/00-b.md");
    expect(map.pages[0]?.sha256Es).toBe(SHA256_OF_HOLA);
    expect(map.pages[0]?.sha256En).toHaveLength(64);
    expect(map.pages[0]?.notionPageId).toBeNull();
  });

  test("throws when a pair is incomplete", () => {
    expect(() => buildNotionMap(treeFrom({ "docs/es/01-x.md": "x" }), "0.1.0")).toThrow("docs/es/01-x.md has no en twin");
  });

  test("ignores files under docs/es/ that do not carry a two-digit number", () => {
    const map = buildNotionMap(treeFrom({ "docs/es/README.md": "índice", "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" }), "0.1.0");
    expect(map.pages.map((p) => p.es)).toEqual(["docs/es/00-a.md"]);
  });

  test("lists pages in number order", () => {
    const tree = treeFrom({
      "docs/es/01-b.md": "b",
      "docs/en/01-b.md": "b",
      "docs/es/00-a.md": "a",
      "docs/en/00-a.md": "a",
    });
    expect(buildNotionMap(tree, "0.1.0").pages.map((p) => p.es)).toEqual(["docs/es/00-a.md", "docs/es/01-b.md"]);
  });

  test("keeps notionPageId from a previous map for pages that still exist", () => {
    const tree = treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" });
    const previous: NotionMap = {
      schemaVersion: 1,
      productVersion: "0.0.9",
      pages: [{ es: "docs/es/00-a.md", en: "docs/en/00-a.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId: "page-123" }],
    };
    const map = buildNotionMap(tree, "0.1.0", previous);
    expect(map.pages[0]?.notionPageId).toBe("page-123");
    // Fingerprints always come from the current content, never from the previous map.
    expect(map.pages[0]?.sha256Es).not.toBe("0".repeat(64));
  });

  test("drops previous pages whose files are gone", () => {
    const tree = treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" });
    const previous: NotionMap = {
      schemaVersion: 1,
      productVersion: "0.1.0",
      pages: [
        { es: "docs/es/00-a.md", en: "docs/en/00-a.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId: null },
        { es: "docs/es/09-gone.md", en: "docs/en/09-gone.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId: "page-gone" },
      ],
    };
    expect(buildNotionMap(tree, "0.1.0", previous).pages.map((p) => p.es)).toEqual(["docs/es/00-a.md"]);
  });

  test("the result validates against NotionMapSchema", () => {
    const map = buildNotionMap(treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" }), "0.1.0");
    expect(NotionMapSchema.safeParse(map).success).toBe(true);
  });
});

describe("NotionMapSchema", () => {
  test("rejects unknown keys, a non-semver productVersion and a bad fingerprint", () => {
    const page = { es: "docs/es/00-a.md", en: "docs/en/00-a.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId: null };
    expect(NotionMapSchema.safeParse({ schemaVersion: 1, productVersion: "0.1.0", pages: [page], extra: true }).success).toBe(false);
    expect(NotionMapSchema.safeParse({ schemaVersion: 1, productVersion: "v1", pages: [page] }).success).toBe(false);
    expect(NotionMapSchema.safeParse({ schemaVersion: 1, productVersion: "0.1.0", pages: [{ ...page, sha256Es: "xyz" }] }).success).toBe(false);
    expect(NotionMapSchema.safeParse({ schemaVersion: 1, productVersion: "0.1.0", pages: [{ ...page, other: 1 }] }).success).toBe(false);
    expect(NotionMapSchema.safeParse({ schemaVersion: 2, productVersion: "0.1.0", pages: [] }).success).toBe(false);
  });
});

// The CLI is bound to the real repository root (readRepoTree/repoRoot), so
// an invalid previous map and the write cycle are exercised here, at the app
// level, with an in-memory tree and a temp dir; the CLI only wraps these
// throws into the NOTION_MAP_FAILED envelope.
describe("buildNotionMapForTree", () => {
  const docs = { "docs/es/00-a.md": "a", "docs/en/00-a.md": "a", "package.json": JSON.stringify({ version: "0.1.0" }) };

  test("reads productVersion from package.json and starts every notionPageId at null when no previous map exists", () => {
    const map = buildNotionMapForTree(treeFrom(docs));
    expect(map.productVersion).toBe("0.1.0");
    expect(map.pages.map((p) => p.notionPageId)).toEqual([null]);
  });

  test("carries notionPageId over from a valid previous docs/notion-map.json", () => {
    const previous: NotionMap = {
      schemaVersion: 1,
      productVersion: "0.0.9",
      pages: [{ es: "docs/es/00-a.md", en: "docs/en/00-a.md", sha256Es: "0".repeat(64), sha256En: "0".repeat(64), notionPageId: "page-123" }],
    };
    const map = buildNotionMapForTree(treeFrom({ ...docs, "docs/notion-map.json": serializeNotionMap(previous) }));
    expect(map.pages[0]?.notionPageId).toBe("page-123");
    expect(map.productVersion).toBe("0.1.0");
  });

  test("throws (the CLI's NOTION_MAP_FAILED) when the previous docs/notion-map.json is invalid", () => {
    const invalid = JSON.stringify({ schemaVersion: 2, productVersion: "0.1.0", pages: [] });
    expect(() => buildNotionMapForTree(treeFrom({ ...docs, "docs/notion-map.json": invalid }))).toThrow("docs/notion-map.json is not a valid notion map");
  });

  test("throws when package.json is missing or has no semver version", () => {
    expect(() => buildNotionMapForTree(treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" }))).toThrow("package.json not found");
    expect(() => buildNotionMapForTree(treeFrom({ ...docs, "package.json": JSON.stringify({ version: "v1" }) }))).toThrow("package.json: version");
  });
});

describe("writeNotionMap", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "notion-map-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("writes the file and a second run leaves it byte-identical", () => {
    const tree = treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a", "package.json": JSON.stringify({ version: "0.1.0" }) });
    const out = join(dir, "docs", "notion-map.json");
    writeNotionMap(buildNotionMapForTree(tree), out);
    const first = readFileSync(out);
    // Second run: the file just written is now the "previous" map of the tree.
    writeNotionMap(buildNotionMapForTree(treeFrom({ ...Object.fromEntries(tree.files), "docs/notion-map.json": first.toString("utf8") })), out);
    const second = readFileSync(out);
    expect(Buffer.compare(first, second)).toBe(0);
    expect(NotionMapSchema.parse(JSON.parse(second.toString("utf8"))).pages).toHaveLength(1);
  });
});

describe("serializeNotionMap", () => {
  test("is stable: the same map serializes to the same text, ending in a newline", () => {
    const tree = treeFrom({ "docs/es/00-a.md": "a", "docs/en/00-a.md": "a" });
    const first = serializeNotionMap(buildNotionMap(tree, "0.1.0"));
    const second = serializeNotionMap(buildNotionMap(tree, "0.1.0"));
    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(true);
    expect(NotionMapSchema.parse(JSON.parse(first)).pages).toHaveLength(1);
  });
});
