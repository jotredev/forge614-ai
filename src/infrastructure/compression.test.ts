import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { deflateRaw } from "./compression";

// 64 KB of pseudo-random bytes from a fixed-seed LCG, narrowed to a 32-symbol
// alphabet so the stream has real LZ77 matches and a skewed Huffman table:
// the compressor's whole code path is exercised, not only stored blocks.
function seededInput(): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(65536);
  let state = 0x12345678;
  for (let i = 0; i < out.length; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out[i] = (state >>> 24) & 0x1f;
  }
  return out;
}

// GOLDEN: sha256 of deflateRaw(seededInput()) with fflate 0.8.3 at level 9.
// A bump of fflate (or of its options) that moves a single output byte must
// fail here, because those bytes decide the published archive's sha256.
const GOLDEN_SHA256 = "b7caa6d97299543b4f1d12b75750bf0a583eca30d4b9944e6d9685a2e48732bf";

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

test("deflateRaw round-trips the seeded 64 KB input through Bun's own inflater", () => {
  const input = seededInput();
  const out = deflateRaw(input);
  expect(out.length).toBeLessThan(input.length);
  expect(Bun.inflateSync(out, { library: "zlib" })).toEqual(input);
});

test("GOLDEN: deflateRaw over the seeded 64 KB input has a fixed sha256 (fflate 0.8.3, level 9)", () => {
  const out = deflateRaw(seededInput());
  expect(createHash("sha256").update(out).digest("hex")).toBe(GOLDEN_SHA256);
});

// The reason fflate exists here (PR #1, run 35821106037): the same tar
// compressed by Bun's bundled zlib gave a different sha256 on Windows than on
// ubuntu and macOS. Pure-JavaScript DEFLATE does not depend on which zlib Bun
// links on a given platform, so its bytes are the ones the parity check pins.
test("deflateRaw does not delegate to Bun's bundled zlib", () => {
  const input = seededInput();
  const viaBunZlib = Bun.deflateSync(input, { library: "zlib", level: 9 });
  expect(Buffer.compare(deflateRaw(input), viaBunZlib)).not.toBe(0);
});
