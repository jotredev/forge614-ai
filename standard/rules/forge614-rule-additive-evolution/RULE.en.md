# Additive evolution of data and contracts

> Like extending a house without tearing down a load-bearing wall: a room gets added, never one that is already lived in gets knocked down.

**Rule.** In persisted data and public contracts (database schemas, configuration and identity files, the memory protocol, SDK, MCP, JSON outputs, error codes, command names) only additions happen: tables, columns that are nullable or have a default, optional JSON fields, commands, tools, protocol versions and new codes. Nothing existing is ever renamed, removed, or has its type or meaning changed. What falls out of use is marked obsolete, not deleted: it keeps working, its replacement is documented, and it carries a mandatory `sunset` (a verifiable retirement condition and a review date); its actual retirement only happens with a major version, a migration tool with backup, and an acta. Migrations are forward-only, idempotent, with an automatic backup before they apply and verification afterward; none rewrites, deletes or "cleans up" a person's data. Every node keeps fixtures of data written by earlier versions and a test that opens them with the current version without error or loss. A new field bumps `schemaVersion`/`format` when the shape changes; the consumer rejects unknown versions with `SCHEMA_UNSUPPORTED` (acta 0013), never interpreting them blindly.

**Scope.** Every node with persisted data or public contracts: database schemas, configuration and identity files, the memory protocol, SDK, MCP, JSON outputs, error codes and command names.

**Why.** When a change renames a table, a column, a `topicKey` or a field, every person with prior data breaks on update; changes must always be additive, like the `ecosystem` scope from acta 0022 (acta 0024).

**Verification.** No automated validator yet; the `schema-evolution` check (rejecting `DROP`/`RENAME`/type changes in migrations) arrives with Sentinel phase 0.2. Human review for now.
