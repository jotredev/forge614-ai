import { LINE_LENGTHS, TYPE_SPEED } from "./nodes/shell";

// One clock for the whole map, so what each node does happens in the order
// it does for real. It follows Shell's terminal, and the terminal waits for
// the answers it needs:
// 1. "forge614 status": Engram and Engines are ready.
// 2. "forge614 prepare": Shell asks Engram for its memories and Engines for
//    the AI engines installed. Engram sends the memories back; Engines
//    scans, finds the engines one by one and sends the list back.
// 3. Shell asks Engines for a preview of the change; Engines prepares it,
//    read-only, and sends it back. The terminal shows it.
// 4. The person confirms in the terminal; Shell tells Engines to apply it,
//    Engines applies only that and reports back (contract, section 5).
// 5. Shell saves what it did in Engram; Engram stores it (a pulse rises into
//    the hologram, which glows) and right after copies it to the cloud.

export const TRAVEL = 1.0; // seconds a message takes through a cable

// Lines of the terminal, by position in the session.
const LINE = { status: 0, prepare: 3, preparing: 4, preview: 5, confirm: 6, applied: 7 } as const;
const typing = (line: number): number => LINE_LENGTHS[line]! / TYPE_SPEED;
const GAP = 0.15; // pause between one line and the next

// Lines 0 to 4 follow one another from the start of the cycle.
const early: number[] = [];
for (let i = 0; i <= LINE.preparing; i++) early.push(i === 0 ? 0 : early[i - 1]! + typing(i - 1) + GAP);
const endOf = (starts: number[], line: number): number => starts[line]! + typing(line);

export const PREPARE_ENTERED_AT = endOf(early, LINE.prepare);

// Engram gives Shell its memories.
export const RECALL_LOOKUP = 0.8; // seconds Engram takes to find memories
export const RECALL_LEAVES = PREPARE_ENTERED_AT + RECALL_LOOKUP;

// Engines: detect the engines, then the preview, then apply.
export const ENGINES_ASK_LEAVES = PREPARE_ENTERED_AT;
export const ENGINES_ASK_ARRIVES = ENGINES_ASK_LEAVES + TRAVEL;
export const ENGINE_FOUND_AT = [0, 1, 2, 3].map((i) => ENGINES_ASK_ARRIVES + 0.3 + i * 0.4);
export const ENGINES_REPLY_LEAVES = ENGINE_FOUND_AT[3]! + 0.4;
const listArrives = ENGINES_REPLY_LEAVES + TRAVEL;

export const PREVIEW_ASK_LEAVES = Math.max(listArrives, endOf(early, LINE.preparing)) + 0.2;
export const PREVIEW_ASK_ARRIVES = PREVIEW_ASK_LEAVES + TRAVEL;
export const PREVIEW_REPLY_LEAVES = PREVIEW_ASK_ARRIVES + 0.6;
const previewArrives = PREVIEW_REPLY_LEAVES + TRAVEL;

const previewLine = previewArrives;
const confirmLine = previewLine + typing(LINE.preview) + 0.6;
export const APPLY_LEAVES = confirmLine + typing(LINE.confirm) + 0.1;
export const APPLY_ARRIVES = APPLY_LEAVES + TRAVEL;
export const APPLIED_AT = APPLY_ARRIVES + 0.6;
export const APPLY_REPLY_LEAVES = APPLIED_AT;
const appliedLine = APPLY_REPLY_LEAVES + TRAVEL;

// When each terminal line starts.
export const LINE_STARTS = [...early, previewLine, confirmLine, appliedLine];

// Shell saves in Engram, Engram stores it and copies it to the cloud.
export const SAVE_LEAVES = appliedLine + typing(LINE.applied) + 0.3;
export const SAVE_ARRIVES = SAVE_LEAVES + TRAVEL;
export const STORE_TIME = 1.4; // pulse rise plus hologram glow
export const COPY_LEAVES = SAVE_ARRIVES + STORE_TIME;

// The cycle ends a little after the copy reaches the cloud, then starts over.
export const CYCLE = COPY_LEAVES + TRAVEL + 3;

// Seconds since `start` in the current cycle, or -1 before it.
export function since(seconds: number, start: number): number {
  const t = seconds % CYCLE;
  return t >= start ? t - start : -1;
}
