import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

const SRC = resolve(import.meta.dir, "../../src");
type Layer = "modules" | "app" | "infrastructure" | "interfaces";
const ALLOWED: Record<Layer, readonly Layer[]> = {
  modules: ["modules"],
  infrastructure: ["infrastructure", "modules"],
  app: ["app", "modules", "infrastructure"],
  interfaces: ["interfaces", "app", "modules"],
};
const MODULES_EXTERNAL_ALLOWLIST = new Set(["node:crypto", "node:util", "zod"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

function layerOf(file: string): Layer {
  const first = relative(SRC, file).split("/")[0];
  if (first === "modules" || first === "app" || first === "infrastructure" || first === "interfaces") return first;
  throw new Error(`file outside a known layer: ${file}`);
}

const IMPORT_RE = /^\s*(?:import|export)\s[^'"]*from\s+["']([^"']+)["']/gm;

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1] ?? "");
}

describe("layer import rules (spec §4.2)", () => {
  const files = walk(SRC);
  test("src has at least one file per layer", () => {
    const layers: Layer[] = ["modules", "app", "infrastructure", "interfaces"];
    for (const layer of layers) {
      const hasFile = files.some((file) => layerOf(file) === layer);
      expect(hasFile, `expected at least one .ts file in src/${layer}`).toBe(true);
    }
  });
  for (const file of files) {
    test(relative(SRC, file), () => {
      const from = layerOf(file);
      for (const spec of importsOf(file)) {
        if (spec.startsWith(".")) {
          const target = resolve(dirname(file), spec.replace(/\.js$/, "") + ".ts");
          const to = layerOf(target.endsWith(".ts") ? target : target + ".ts");
          expect(ALLOWED[from], `${from} → ${to} in ${relative(SRC, file)}`).toContain(to);
        } else if (from === "modules") {
          expect(MODULES_EXTERNAL_ALLOWLIST.has(spec), `modules imports external ${spec}`).toBe(true);
        }
      }
    });
  }
});
