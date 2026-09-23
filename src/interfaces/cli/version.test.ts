import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { run } from "../../infrastructure/process";
import { PRODUCT_NAME, printVersionIfRequested } from "./version";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const VersionEnvelope = z.object({ schemaVersion: z.literal(1), name: z.literal(PRODUCT_NAME), version: z.string().regex(/^\d+\.\d+\.\d+$/) }).strict();

describe("printVersionIfRequested", () => {
  let stdoutSpy: string[] = [];
  let stdoutWrite: typeof process.stdout.write;
  beforeEach(() => {
    stdoutSpy = [];
    stdoutWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      stdoutSpy.push(chunk);
      return true;
    }) as typeof process.stdout.write;
  });
  afterEach(() => {
    process.stdout.write = stdoutWrite;
  });

  test("prints the version envelope and reports true when --version is present anywhere in argv", () => {
    expect(printVersionIfRequested(["--check", "--version"])).toBe(true);
    expect(stdoutSpy).toHaveLength(1);
    expect(VersionEnvelope.safeParse(JSON.parse(stdoutSpy[0] ?? "")).success).toBe(true);
  });

  test("prints nothing and reports false otherwise", () => {
    expect(printVersionIfRequested(["--help"])).toBe(false);
    expect(stdoutSpy).toEqual([]);
  });
});

// STANDARD §4: `--version` is always available and never blocking, in every
// CLI. The helpers (output.ts, version.ts, args.ts) are not entry points.
const HELPERS = new Set(["output.ts", "version.ts", "args.ts"]);
const CLIS = readdirSync(import.meta.dir)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts") && !HELPERS.has(name))
  .sort();

describe("--version in every CLI", () => {
  test("there are entry points to check", () => {
    expect(CLIS.length).toBeGreaterThan(5);
  });
  for (const cli of CLIS) {
    test(`${cli} --version exits 0 with { schemaVersion, name, version } before any other parsing`, () => {
      const r = run(["bun", "run", resolve(import.meta.dir, cli), "--version"], { cwd: REPO_ROOT });
      expect(r.exitCode, r.stderr).toBe(0);
      expect(r.stderr).toBe("");
      expect(VersionEnvelope.safeParse(JSON.parse(r.stdout.trim())).success).toBe(true);
    });
  }
});
