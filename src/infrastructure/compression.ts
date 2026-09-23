import { deflateSync } from "fflate";

// Raw DEFLATE (no zlib or gzip container) at the maximum level through
// fflate, a DEFLATE compressor written in pure JavaScript and pinned to the
// exact version 0.8.3. The output of DEFLATE depends on the compressor's
// implementation, not only on the input: PR #1 (run 35821106037) proved that
// the zlib Bun links on Windows produced a different sha256 for the same tar
// than the one on ubuntu and macOS, and locally Bun's "zlib" and "libdeflate"
// backends already disagree on the same input. A single JavaScript
// implementation, run by the same runtime everywhere, is the only way the
// same bytes come out on every operating system; the cross-platform CI
// parity check (`standard:pack --check` on ubuntu, macOS and Windows) and
// the golden test next to this file are the proof.
export function deflateRaw(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  return deflateSync(bytes, { level: 9 });
}
