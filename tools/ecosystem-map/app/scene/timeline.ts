import { PREPARE_ENTERED_AT, SHELL_CYCLE, TYPED_AT } from "./nodes/shell";

// One clock for the whole map, so what each node does happens in the order
// it does for real. It follows Shell's terminal:
// 1. Shell enters "forge614 prepare" and asks Engram for its memories.
// 2. Engram looks them up (a pulse goes down from the hologram) and sends
//    them back through the cable to Shell.
// 3. When Shell finishes preparing, it saves what it did in Engram.
// 4. Engram stores it (a pulse rises into the hologram, which glows).
// 5. Right after, Engram copies it to the cloud (PostgreSQL).

export const CYCLE = SHELL_CYCLE;
export const TRAVEL = 1.4; // seconds a memory takes through a cable

export const RECALL_LOOKUP = 0.8; // seconds Engram takes to find memories
export const RECALL_LEAVES = PREPARE_ENTERED_AT + RECALL_LOOKUP;
export const SAVE_LEAVES = TYPED_AT + 0.4;
export const SAVE_ARRIVES = SAVE_LEAVES + TRAVEL;
export const STORE_TIME = 1.4; // pulse rise plus hologram glow
export const COPY_LEAVES = SAVE_ARRIVES + STORE_TIME;

// Seconds since `start` in the current cycle, or -1 before it.
export function since(seconds: number, start: number): number {
  const t = seconds % CYCLE;
  return t >= start ? t - start : -1;
}
