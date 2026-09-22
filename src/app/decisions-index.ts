import { writeTextAtomic } from "../infrastructure/fs-write";
import { listUnder, read, type FileTree } from "../modules/standard/file-tree";
import type { DecisionsIndex } from "../modules/standard/schemas";

const DECISIONS_DIR = "docs/decisions/";
const FILE_RE = /^(\d{4})-([a-z0-9-]+)\.md$/;
const TITLE_RE = /^#\s*\d{4}\s*—\s*(.+)$/m;
const DATE_RE = /^\*\*Fecha:\*\*\s*(\d{4}-\d{2}-\d{2})\s*$/m;
const STATUS_RE = /^\*\*Estado:\*\*\s*(propuesta|aceptada|revocada|reemplazada por (\d{4}))(?:\s*\(.*\))?\s*$/m;
const SESSION_RE = /^\*\*Sesión:\*\*\s*(.+)$/m;

type Status = "propuesta" | "aceptada" | "revocada" | "reemplazada";

// The header line accepts "aceptada" optionally followed by a parenthesized
// date (e.g. "aceptada (2026-09-22)", acta 0013); that suffix is display-only
// and never lands in the index, whose schema enum has no room for it.
function normalizeStatus(rawStatus: string): Status {
  if (rawStatus.startsWith("reemplazada")) return "reemplazada";
  if (rawStatus === "revocada") return "revocada";
  if (rawStatus === "aceptada") return "aceptada";
  return "propuesta";
}

function decisionFrom(tree: FileTree, file: string): DecisionsIndex["decisions"][number] {
  const match = FILE_RE.exec(file);
  const number = match?.[1] ?? "";
  const slug = match?.[2] ?? "";
  const text = read(tree, `${DECISIONS_DIR}${file}`) ?? "";
  const title = TITLE_RE.exec(text)?.[1]?.trim() ?? "";
  const date = DATE_RE.exec(text)?.[1] ?? "";
  const session = SESSION_RE.exec(text)?.[1]?.trim();
  const statusMatch = STATUS_RE.exec(text);
  const status = normalizeStatus(statusMatch?.[1] ?? "");
  const replacedBy = statusMatch?.[2];

  return {
    number,
    slug,
    title,
    status,
    date,
    file,
    ...(session !== undefined ? { session } : {}),
    ...(replacedBy !== undefined ? { replacedBy } : {}),
  };
}

export function buildDecisionsIndex(tree: FileTree): DecisionsIndex {
  const files = listUnder(tree, DECISIONS_DIR)
    .map((path) => path.slice(DECISIONS_DIR.length))
    .filter((name) => FILE_RE.test(name))
    .sort();

  return { schemaVersion: 1, decisions: files.map((file) => decisionFrom(tree, file)) };
}

export function serializeDecisionsIndex(index: DecisionsIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function writeDecisionsIndex(index: DecisionsIndex, outPath: string): void {
  writeTextAtomic(outPath, serializeDecisionsIndex(index));
}
