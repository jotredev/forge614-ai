import { expect, test } from "bun:test";
import { z } from "zod";
import { issuesOf, parseFlags, parsePairs } from "./args";

test("parseFlags turns every argument into a key, with or without the -- prefix", () => {
  expect(parseFlags(["--check", "--update-pointer", "dist"])).toEqual({ check: true, "update-pointer": true, dist: true });
  expect(parseFlags([])).toEqual({});
});

test("a strict schema over parseFlags rejects a misspelled flag and a stray positional", () => {
  const Args = z.object({ check: z.literal(true).optional() }).strict();
  expect(Args.safeParse(parseFlags(["--check"])).success).toBe(true);
  expect(Args.safeParse(parseFlags(["--chekc"])).success).toBe(false);
  expect(Args.safeParse(parseFlags(["docs"])).success).toBe(false);
});

test("parsePairs reads --key value pairs and ignores a trailing key without value", () => {
  expect(parsePairs(["--node", "demo", "--out", "/tmp/x"])).toEqual({ node: "demo", out: "/tmp/x" });
  expect(parsePairs(["--node"])).toEqual({});
});

test("issuesOf joins zod issues with their path, or the bare message at the root", () => {
  const Args = z.object({ node: z.string().regex(/^[a-z]+$/, "lowercase") }).strict();
  const result = Args.safeParse({ node: "X1", extra: true });
  expect(result.success).toBe(false);
  if (result.success) return;
  const text = issuesOf(result.error);
  expect(text).toContain("node: ");
  expect(text).toContain("extra");
});
