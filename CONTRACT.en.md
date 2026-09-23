# Contract of Forge614 AI (`forge614-ai`)

> One-sentence analogy: like the bureau of weights and measures: it manufactures nothing, it keeps the reference every other node calibrates against.

## Purpose
Publish the Node Standard and the contracts of the Forge614 ecosystem, and verify that this very repository complies with them.

## What it does
- Publishes the Node Standard (`standard/STANDARD.md`, rules, packs, templates and procedures) as a reproducible `standard-<VERSION>.tar.gz` archive whose sha256 fingerprint lives in `forge614.node.json`.
- Publishes the ecosystem contract (`standard/FORGE614_ECOSYSTEM_CONTRACT.md`) and the JSON schemas in `standard/schemas/`, generated from the Zod schemas in `src/modules/standard/schemas/`.
- Renders the repository templates (workflows, `pre-push` hook, `CONTRACT.md`, `BRANCH_PROTECTION.md`, installers, plan) for any node with `standard:render`.
- Verifies this repository with `verify`: typecheck, tests, decisions index, thin workflows, schemas and the standard's validators (document 04).
- Maintains the derived indexes: `docs/decisions/INDEX.json` and `docs/notion-map.json`.

## What it does not do
- It does not install nodes or distribute binaries: it publishes no `install.sh` or `install.ps1` of its own (the template installers are for nodes that do ship binaries).
- It does not orchestrate or run work of other nodes: that capability arrives with Deliveries 1 and 2.
- It does not verify other repositories: `forge614-sentinel check` (phase 0.2) will run these validators on any node; today they run only here.
- It does not publish releases yet: `build:target`, `smoke:target` and `release:publish` fail on purpose with `NOT_IMPLEMENTED` until the shared `bun release` arrives in phase 0.4.

## Dependencies
| Node or binary | How it is consumed | Minimum version |
| --- | --- | --- |
| Bun | Runtime and script runner (`bun run`, `bun test`); pinned in `.github/workflows/*.yml` | 1.3.8 |
| TypeScript | `devDependency`; `bun run typecheck` (`tsc --noEmit`) in strict mode | 5.9.3 |
| zod | Dependency; schemas for arguments, contracts and data files | 4.6.5 |
| yaml | Dependency; reading `.github/workflows/*.yml` | 2.8.1 |
| Other Forge614 nodes | None: `forge614-ai` is the root of the ecosystem and depends on no other node | — |

## Public commands
| Command | Input (schema) | Output (schema) | `schemaVersion` | Exit codes |
| --- | --- | --- | --- | --- |
| `bun run verify` | `[--locale es\|en] [--today YYYY-MM-DD]` | `VerifyReport`: `{ standard, verdict, checks: [{ ruleId, verdict, evidence, messageKey, params, message: { es, en } }] }` | `1` | `0` everything in `pass`; `1` a step failed (`VERIFY_STEP_FAILED`) or verdict other than `pass`; `2` `INVALID_ARGUMENTS` |
| `bun run standard:render` | `--node <[a-z0-9-]+> --out <dir> [--repo owner/repo] [--title Title]` | `{ node, out, written: string[] }`; writes the fifteen `DESTINATIONS` files into `<dir>` | `1` | `0` written; `2` `INVALID_ARGUMENTS` |
| `bun run standard:pack` | `[--update-pointer] [--check]` | `{ version, archive, sha256, entries }`; with `--check`: `{ ok: true, sha256, pointerChecked: true, sumsChecked }`; writes `dist/` and, with `--update-pointer`, `forge614.node.json` | `1` | `0`; `1` `STANDARD_INVALID`, `STANDARD_PACK_DRIFT` or `STANDARD_PACK_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run standard:check` | No arguments (alias of `standard:pack --check`; it is the step of the `parity` job) | Same as `standard:pack --check` | `1` | Same as `standard:pack --check` |
| `bun run workflows:check` | No arguments | `{ verdict, findings: Finding[] }` | `1` | `0` verdict `pass`; `1` otherwise |
| `bun run workflows:run` | `[--workflow <name>]` (default `verify`) | `{ workflow, jobs: [{ job, steps: [{ run, exitCode }] }], ok }` | `1` | `0` everything in `0`; `1` a step failed or `WORKFLOW_NOT_FOUND`; `2` `INVALID_ARGUMENTS` |
| `bun run decisions:index` | `[--check]` | `{ ok: true, records }`; without `--check` writes `docs/decisions/INDEX.json` (`decisions-index.schema.json`) | `1` | `0`; `1` `DECISIONS_INDEX_INVALID` or, with `--check`, `DECISIONS_INDEX_DRIFT` |
| `bun run notion-map:build` | No arguments | `{ path, pages }`; writes `docs/notion-map.json` | `1` | `0`; `1` `NOTION_MAP_FAILED`; `2` `INVALID_ARGUMENTS` |
| `bun run schemas:generate` | `[--check]` | `{ written: string[] }`; with `--check`: `{ ok: true }`; without `--check` writes `standard/schemas/*.schema.json` | `1` | `0`; `1` `SCHEMAS_DRIFT` (only with `--check`) |
| `bun run build:target`, `bun run smoke:target`, `bun run release:publish` | No arguments (`release.yml` passes `FORGE614_TARGET`, ignored today) | None: stubs in `src/interfaces/cli/not-implemented.ts` until phase 0.4 | `1` (error envelope only) | `1` `NOT_IMPLEMENTED`; `2` `INVALID_ARGUMENTS` |

Every data output is a single JSON object on stdout with `schemaVersion: 1`; every error is an envelope `{ schemaVersion: 1, code, error }` on stderr (`error-envelope.schema.json`). Every command accepts `--help`, which prints `{ schemaVersion: 1, usage }` and exits with `0`.

## Error codes
| Code | Meaning |
| --- | --- |
| `INVALID_ARGUMENTS` | Argument, flag or value the command does not accept; exit `2`. Commands with a `--key value` pair parser (`verify`, `standard:render`, `workflows:run`) reject an unknown flag only when it carries a value and ignore stray positionals; commands with a strict flag set (`standard:pack`, `standard:check`, `notion-map:build`, `not-implemented`) reject any unknown flag or positional |
| `VERIFY_STEP_FAILED` | A `verify` step (typecheck, test, decisions index, workflows, schemas) ended with a non-`0` exit |
| `WORKFLOW_NOT_FOUND` | `workflows:run`: `.github/workflows/<name>.yml` does not exist or does not satisfy `WorkflowSchema` |
| `DECISIONS_INDEX_INVALID` | `decisions:index`: the index built from `docs/decisions/` does not satisfy `DecisionsIndexSchema` |
| `DECISIONS_INDEX_DRIFT` | `decisions:index --check`: `docs/decisions/INDEX.json` does not match the fresh index |
| `SCHEMAS_DRIFT` | `schemas:generate --check`: `standard/schemas/` does not match the Zod schemas |
| `STANDARD_INVALID` | `standard:pack`: some standard validator fails, nothing is packed |
| `STANDARD_PACK_DRIFT` | `standard:pack --check`: the fresh fingerprint does not match `forge614.node.json` or `dist/SHA256SUMS` |
| `STANDARD_PACK_FAILED` | `standard:pack`: unexpected read or write error |
| `NOTION_MAP_FAILED` | `notion-map:build`: invalid previous map, unreadable `package.json` or write error |
| `NOT_IMPLEMENTED` | `build:target`, `smoke:target`, `release:publish`: they arrive in phase 0.4 (shared `bun release`) |
| `SCHEMA_UNSUPPORTED` | Reserved by the standard (§4) for a consumer that receives a `schemaVersion` it does not know; no command in this repository emits it today |

## Mandatory requirements for supported AI assistants
`ai` section of `standard/procedures/new-agent-checklist.md` (standard 1.0.0): it does not exist because `forge614-ai` integrates no AI assistant. This node publishes that checklist and `standard/support-matrix.json`; the sections with requirements belong to the nodes that do integrate assistants (`forge614-engines`, `forge614-workers`, `forge614-atlas`, `forge614-engram`, `forge614-shell`).

## Compatibility
Breaking changes bump `schemaVersion`; one compatibility version is kept. Since this contract exists, codes and fields evolve additively (record 0024): no code or field listed here is renamed or removed without bumping `schemaVersion`.
