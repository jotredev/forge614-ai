import { mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { deflateRaw } from "../infrastructure/compression";
import { writeBytesAtomic, writeTextAtomic } from "../infrastructure/fs-write";
import { sha256Hex } from "../infrastructure/hashing";
import { crc32, wrapGzip } from "../modules/standard/gzip";
import { PackSchema } from "../modules/standard/schemas";
import { buildUstarArchive, tarMode, type TarEntry } from "../modules/standard/tar";

// sha256 is the archive's fingerprint (the one forge614.node.json pins);
// tarSha256 is the fingerprint of the uncompressed tar inside it. Together
// they tell a parity failure apart: the same tarSha256 with a different
// sha256 means the compressor moved bytes, a different tarSha256 means the
// content or the tar headers did (line endings, member order, modes).
export interface PackResult {
  schemaVersion: 1;
  version: string;
  archive: string;
  sha256: string;
  tarSha256: string;
  entries: string[];
}

// acta 0020: at pack time, estimate how many tokens each rule package would
// cost a session, both by its full RULE.md content and by the one-line
// index entry the ecosystem pack would show. This lives only in the
// generated dist/pack-manifest.json — it never edits standard/rules/*/manifest.json,
// and it is independent of the context-budget validator's own estimate.
export const PackManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver X.Y.Z"),
    rules: z.array(z.object({ name: z.string().min(1), tokens: z.number().int().positive(), estimate: z.literal(true) }).strict()),
    packIndex: z.object({ tokens: z.number().int().positive(), estimate: z.literal(true) }).strict(),
  })
  .strict();

export type PackManifest = z.infer<typeof PackManifestSchema>;

const PACK_JSON_PATH = "packs/forge614-pack-ecosystem-node/pack.json";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildPackManifest(standardDir: string, version: string): PackManifest {
  const packRaw = readFileSync(join(standardDir, PACK_JSON_PATH), "utf8");
  const pack = PackSchema.parse(JSON.parse(packRaw));

  let packIndexTokens = 0;
  const rules: PackManifest["rules"] = pack.rules.map((name) => {
    const ruleMd = readFileSync(join(standardDir, "rules", name, "RULE.md"), "utf8");
    const firstLine = ruleMd.split("\n")[0]?.trim() ?? "";
    packIndexTokens += estimateTokens(`${name}: ${firstLine}`);
    return { name, tokens: estimateTokens(ruleMd), estimate: true };
  });

  return PackManifestSchema.parse({ schemaVersion: 1, version, rules, packIndex: { tokens: packIndexTokens, estimate: true } });
}

// Every entry under `dir` as a tar member, files and directories alike
// (directories carry a trailing "/"), depth-first with each directory's
// children sorted by name and a directory listed before its descendants.
// The order is deterministic and independent of the filesystem's own
// directory-read order, which is what member order needs; it is not a
// lexicographic sort of full paths and does not need to be. Hidden files
// (dotfiles) are skipped defensively even though standard/ has none today.
// Modes are derived from content by tarMode (directory → 0755, shebang file
// → 0755, else 0644); the on-disk mode is never read, so a Windows checkout
// packs the same bytes. statSync only tells directories from files. Content
// is read straight from the source tree, which is never written to.
export function collectTarEntries(dir: string, prefix = ""): TarEntry[] {
  const out: TarEntry[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const rel = `${prefix}${name}`;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push({ path: `${rel}/`, mode: tarMode(undefined) });
      out.push(...collectTarEntries(full, `${rel}/`));
    } else {
      const content = readFileSync(full);
      out.push({ path: rel, mode: tarMode(content), content });
    }
  }
  return out;
}

export function packStandard(root: string, outDir: string): PackResult {
  const standardDir = resolve(root, "standard");
  const version = readFileSync(join(standardDir, "VERSION"), "utf8").trim();

  // Archive built entirely in memory: ustar headers with pinned metadata,
  // raw DEFLATE from a pure-JavaScript compressor (fflate, exact version),
  // and a constant gzip header, so the bytes (and the sha256) are the same
  // on every operating system.
  const tarEntries = collectTarEntries(standardDir);
  const tar = buildUstarArchive(tarEntries);
  const tarSha256 = sha256Hex(tar);
  const archiveBytes = wrapGzip(deflateRaw(tar), crc32(tar), tar.length);

  mkdirSync(outDir, { recursive: true });
  const archive = join(outDir, `standard-${version}.tar.gz`);
  writeBytesAtomic(archive, archiveBytes);

  const sha256 = sha256Hex(archiveBytes);
  writeTextAtomic(join(outDir, "SHA256SUMS"), `${sha256}  standard-${version}.tar.gz\n`);

  const manifest = buildPackManifest(standardDir, version);
  writeTextAtomic(join(outDir, "pack-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  return { schemaVersion: 1, version, archive, sha256, tarSha256, entries: tarEntries.map((entry) => entry.path) };
}
