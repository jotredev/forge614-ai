// Raw DEFLATE (no zlib or gzip container) at the maximum level through Bun's
// bundled zlib. Reproducibility assumption: the same Bun version yields the
// same compressed bytes for the same input on every operating system, because
// the compressor is the one shipped inside Bun rather than a system library.
// The cross-platform CI parity check (`standard:pack --check` on ubuntu,
// macOS and Windows) is the proof of that assumption; the backend and level
// are pinned explicitly so a change in Bun's defaults cannot silently move
// the published sha256.
export function deflateRaw(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  return Bun.deflateSync(bytes, { library: "zlib", level: 9 });
}
