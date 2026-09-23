// A data file under standard/ that is not even valid JSON must surface as a
// finding with the file's path, never as an exception out of a validator
// (acta 0013: a verifier never leaks a stack trace).
export type JsonData = { ok: true; data: unknown } | { ok: false; evidence: string };

export function parseJsonData(path: string, raw: string): JsonData {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, evidence: `${path}: invalid JSON: ${message}` };
  }
}
