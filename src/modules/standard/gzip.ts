// Pure gzip container (RFC 1952) around a raw DEFLATE stream. The 10-byte
// header is a constant — mtime 0, XFL 2 (maximum compression), OS 3 (Unix) —
// so it never depends on the clock or the platform that runs the pack.

const HEADER = [0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x03];

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

// Standard CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320).
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function wrapGzip(rawDeflate: Uint8Array, crc: number, inputSize: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(HEADER.length + rawDeflate.length + 8);
  out.set(HEADER, 0);
  out.set(rawDeflate, HEADER.length);
  const view = new DataView(out.buffer);
  const trailer = HEADER.length + rawDeflate.length;
  view.setUint32(trailer, crc >>> 0, true); // CRC32, little-endian
  view.setUint32(trailer + 4, inputSize >>> 0, true); // ISIZE = input length mod 2^32
  return out;
}
