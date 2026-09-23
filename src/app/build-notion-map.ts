import { z } from "zod";
import { writeTextAtomic } from "../infrastructure/fs-write";
import { sha256Hex } from "../infrastructure/hashing";
import { listUnder, read, type FileTree } from "../modules/standard/file-tree";
import { SemVer, Sha256 } from "../modules/standard/schemas/common";

// docs/notion-map.json: one row per es/en documentation pair with the
// sha256 of each side, so a mirror (a page kept outside the repository) can
// tell whether the source it copied is still the current one. This schema
// lives in `app`, not in `modules/standard/schemas`, on purpose: the map is
// forge614-ai's own bookkeeping, not part of the standard's content, and
// adding it there would change the standard archive and its committed sha256.
const NotionPageSchema = z
  .object({
    es: z.string().min(1),
    en: z.string().min(1),
    sha256Es: Sha256,
    sha256En: Sha256,
    notionPageId: z.string().nullable(),
  })
  .strict();

export const NotionMapSchema = z
  .object({
    schemaVersion: z.literal(1),
    productVersion: SemVer,
    pages: z.array(NotionPageSchema),
  })
  .strict();

export type NotionMap = z.infer<typeof NotionMapSchema>;

const ES_NUMBERED = /^docs\/es\/(\d{2})-/;
const encoder = new TextEncoder();

function fingerprint(text: string): string {
  return sha256Hex(encoder.encode(text));
}

// Pairs every numbered docs/es/NN-*.md with its docs/en/NN-*.md twin (the
// same pairing rule the bilingual-docs validator applies) and fingerprints
// both. A page's notionPageId is the only thing carried over from the
// previous map, and only while its es file still exists; fingerprints are
// always recomputed from the current content.
export function buildNotionMap(tree: FileTree, productVersion: string, previous?: NotionMap): NotionMap {
  const pages: NotionMap["pages"] = [];
  for (const es of listUnder(tree, "docs/es/")) {
    const num = ES_NUMBERED.exec(es)?.[1];
    if (num === undefined) continue;
    const en = listUnder(tree, `docs/en/${num}-`)[0];
    if (en === undefined) throw new Error(`${es} has no en twin`);
    const prev = previous?.pages.find((p) => p.es === es);
    pages.push({
      es,
      en,
      sha256Es: fingerprint(read(tree, es) ?? ""),
      sha256En: fingerprint(read(tree, en) ?? ""),
      notionPageId: prev?.notionPageId ?? null,
    });
  }
  return { schemaVersion: 1, productVersion, pages };
}

// package.json is an external file: only the field this use case needs is
// validated, and anything else it carries is left alone.
const PackageVersion = z.object({ version: SemVer }).passthrough();

export const NOTION_MAP_PATH = "docs/notion-map.json";

function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message)).join("; ");
}

// The previous map is read through the same strict schema that the new one
// satisfies: a map that does not parse is an error, never silently ignored,
// because ignoring it would drop every notionPageId a person had recorded.
function previousMapOf(tree: FileTree): NotionMap | undefined {
  const raw = read(tree, NOTION_MAP_PATH);
  if (raw === undefined) return undefined;
  const parsed = NotionMapSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error(`${NOTION_MAP_PATH} is not a valid notion map: ${issuesOf(parsed.error)}`);
  return parsed.data;
}

function productVersionOf(tree: FileTree): string {
  const raw = read(tree, "package.json");
  if (raw === undefined) throw new Error("package.json not found");
  const parsed = PackageVersion.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error(`package.json: ${issuesOf(parsed.error)}`);
  return parsed.data.version;
}

// Builds the map for a whole repository tree: productVersion from its
// package.json and notionPageId carried over from its current
// docs/notion-map.json when one exists. Throws on any invalid input; the CLI
// turns that into the NOTION_MAP_FAILED envelope.
export function buildNotionMapForTree(tree: FileTree): NotionMap {
  const previous = previousMapOf(tree);
  const productVersion = productVersionOf(tree);
  return previous === undefined ? buildNotionMap(tree, productVersion) : buildNotionMap(tree, productVersion, previous);
}

export function serializeNotionMap(map: NotionMap): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

export function writeNotionMap(map: NotionMap, outPath: string): void {
  writeTextAtomic(outPath, serializeNotionMap(map));
}
