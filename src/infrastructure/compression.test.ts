import { expect, test } from "bun:test";
import { inflateRawSync } from "node:zlib";
import { deflateRaw } from "./compression";

test("deflateRaw produces a raw DEFLATE stream (no zlib or gzip container) that inflates back to the input", () => {
  const input = new TextEncoder().encode("forge614 ".repeat(200));
  const out = deflateRaw(input);
  expect(out.length).toBeLessThan(input.length);
  expect(new Uint8Array(inflateRawSync(out))).toEqual(input);
});

test("deflateRaw is deterministic for the same input", () => {
  const input = new TextEncoder().encode("same bytes, same output\n".repeat(50));
  expect(deflateRaw(input)).toEqual(deflateRaw(input));
});
