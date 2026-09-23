import { readFileSync } from "node:fs";
import { writeTextAtomic } from "../infrastructure/fs-write";
import { NodePointerSchema, type NodePointer } from "../modules/standard/schemas";

// Rewrites forge614.node.json's `standard.sha256` to the freshly-packed
// archive's fingerprint. Both the pointer already on disk and the pointer
// about to be written are validated against NodePointerSchema before
// anything is written, so a malformed pointer (either one this function
// would produce, or one that was already broken) never gets committed to
// disk — the file on disk is left untouched.
export function updateNodePointerSha256(pointerPath: string, sha256: string): NodePointer {
  const raw = readFileSync(pointerPath, "utf8");
  const current = NodePointerSchema.parse(JSON.parse(raw));

  const updated = NodePointerSchema.parse({ ...current, standard: { ...current.standard, sha256 } });

  writeTextAtomic(pointerPath, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}
