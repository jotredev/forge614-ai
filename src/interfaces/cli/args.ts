import type { z } from "zod";

// Flag-only CLIs: every argument becomes a key so a `.strict()` schema
// rejects anything it does not know. A misspelled flag or a stray positional
// argument fails loudly (INVALID_ARGUMENTS, exit 2) instead of being ignored.
export function parseFlags(argv: string[]): Record<string, true> {
  const out: Record<string, true> = {};
  for (const arg of argv) out[arg.startsWith("--") ? arg.slice(2) : arg] = true;
  return out;
}

// `--key value` CLIs (verify, standard-render, workflows-run): pairs only; a
// key without a value at the end is dropped, and the strict schema on top
// rejects unknown keys.
export function parsePairs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith("--") && value !== undefined) out[key.slice(2)] = value;
  }
  return out;
}

export function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => (issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message)).join("; ");
}
