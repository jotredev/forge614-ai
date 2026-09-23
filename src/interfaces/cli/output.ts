export function printJson(payload: Record<string, unknown> & { schemaVersion: number }): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function printError(code: string, error: string, schemaVersion = 1): void {
  process.stderr.write(`${JSON.stringify({ schemaVersion, code, error })}\n`);
}

// Every CLI ends with `process.exit(runCli(CODE, main))`: whatever `main`
// throws leaves through the error envelope with that code and exit 1, never
// as a raw stack trace (acta 0013). A normal return is passed through.
export function runCli(failureCode: string, main: () => number): number {
  try {
    return main();
  } catch (error) {
    printError(failureCode, error instanceof Error ? error.message : String(error));
    return 1;
  }
}
