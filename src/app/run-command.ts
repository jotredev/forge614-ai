import { run, type RunOptions, type RunResult } from "../infrastructure/process";

// Thin re-export so `interfaces` (which may not import `infrastructure`
// directly, per the layering rule in tests/architecture/import-rules.test.ts)
// can execute a command through the app layer without a second process helper.
export function runCommand(cmd: string[], options: RunOptions = {}): RunResult {
  return run(cmd, options);
}
