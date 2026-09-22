# Single machine contract convention

> Like a universal plug: whichever node it is, the same shape goes in and out.

**Rule.** Every machine command in the ecosystem follows a single convention: correct output is a single JSON object on **stdout** with an integer `schemaVersion` at the root; every error is a single JSON object on **stderr** shaped `{ "schemaVersion": n, "code": "STABLE_CODE", "error": "message for people" }`; exit codes are `0` success, `1` error, `2` invalid input, `75` recoverable pause; streams are NDJSON with a guaranteed terminal event; `--help` and `--version` answer immediately; external inputs are schema-validated (Zod) at the boundary. The `code` is a stable identifier in `UPPER_SNAKE_CASE`, regex `^[A-Z][A-Z0-9_]+$`, listed in the node's `CONTRACT.md`.

**Scope.** Every machine command of every node in the ecosystem.

**Why.** The audit showed each node spoke a different dialect of errors, outputs and exit codes; an orchestrator that consumes several nodes cannot know five formats (acta 0013).

**Verification.** `validator: error-codes` (checks the codes listed in `CONTRACT.md` and used in `src/`; the rest of the convention is reviewed by hand for now).
