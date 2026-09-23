import { expect, test } from "bun:test";
import { deflateRawSync, gunzipSync } from "node:zlib";
import { crc32, wrapGzip } from "./gzip";

const encoder = new TextEncoder();

test("crc32 matches the standard check vector", () => {
  expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
});

test("crc32 of empty input is 0", () => {
  expect(crc32(new Uint8Array())).toBe(0);
});

test("gzip header is the fixed 10 bytes (mtime 0, XFL 2, OS 3) on every platform", () => {
  const deflated = new Uint8Array([0x03, 0x00]);
  const out = wrapGzip(deflated, 0, 0);
  expect([...out.subarray(0, 10)]).toEqual([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x03]);
  expect(out.length).toBe(10 + deflated.length + 8);
});

test("gzip trailer carries CRC32 and ISIZE little-endian", () => {
  const deflated = new Uint8Array([0x03, 0x00]);
  const out = wrapGzip(deflated, 0xcbf43926, 9);
  const trailer = [...out.subarray(out.length - 8)];
  expect(trailer).toEqual([0x26, 0x39, 0xf4, 0xcb, 0x09, 0x00, 0x00, 0x00]);
});

test("wrapGzip over a raw deflate stream is a valid gzip member readable by node:zlib", () => {
  const input = encoder.encode("forge614 standard ".repeat(50));
  const raw = new Uint8Array(deflateRawSync(input));
  const gz = wrapGzip(raw, crc32(input), input.length);
  expect(new Uint8Array(gunzipSync(gz))).toEqual(input);
});
