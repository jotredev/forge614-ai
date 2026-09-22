export function printJson(payload: Record<string, unknown> & { schemaVersion: number }): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function printError(code: string, error: string, schemaVersion = 1): void {
  process.stderr.write(`${JSON.stringify({ schemaVersion, code, error })}\n`);
}
