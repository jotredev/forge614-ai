# 00 — Summary and quickstart

> Like the floor plan of a house hung by the entrance: one sheet shows what is in every room and where it makes sense to start.

## What forge614-ai is today

`forge614-ai` is the core of the Forge614 ecosystem, a family of tools for working with AI assistants. Each tool is a **node**: its own repository with a public contract. Today this repository publishes three things:

- The **Node Standard** (`standard/STANDARD.md`, version `1.1.1`): the norm every node complies with. Explained in document 01.
- The **rules** as packages and the **pack** `forge614-pack-ecosystem-node` that groups them. Document 02.
- The **templates** from which a node generates its installers, workflows and contracts, and the **verifier** (`bun run verify`) that checks the standard against this very repository. Documents 03 and 04.

Whatever does not exist yet is marked with its phase: the global `forge614` command belongs to Delivery 1; the verifier that runs on other repositories arrives in phase 0.2 and the shared `bun release`, in phase 0.4.

## Commands

Every command runs with Bun (the ecosystem's package manager and development runner) from the repository root, after `bun install --frozen-lockfile`. Each one prints a single JSON object to stdout with `schemaVersion`, and every error goes to stderr as `{ schemaVersion, code, error }`; document 04 explains the codes. `--help` always answers immediately.

| Command | What it does | Document |
| --- | --- | --- |
| `bun run verify [--locale es\|en] [--today YYYY-MM-DD]` | typecheck, tests, drift checks and standard validators over this repository | 04 |
| `bun run standard:render --node <name> --out <dir> [--repo owner/repo] [--title Title]` | generates from `standard/templates/` the files a node adopts | 03 |
| `bun run standard:pack [--update-pointer] [--check]` | packs `standard/` reproducibly into `dist/` and computes its fingerprint | 04 |
| `bun run workflows:check` | validates the workflows in `.github/workflows/` against the standard | 05 |
| `bun run workflows:run [--workflow <name>]` | runs a workflow's steps locally (`verify` by default) | 05 |
| `bun run decisions:index [--check]` | regenerates `docs/decisions/INDEX.json` or checks that it is up to date | 02 |
| `bun run notion-map:build` | regenerates `docs/notion-map.json` with the fingerprints of this documentation | 00 (below) |
| `bun run schemas:generate [--check]` | writes the JSON schemas in `standard/schemas/` from the Zod schemas, or checks that there is no drift | 01 |

## Repository structure

| Path | Contents |
| --- | --- |
| `forge614.node.json` | Node pointer: name, kind, pinned standard version and its SHA-256 fingerprint |
| `standard/` | The norm (`STANDARD.md`, `STANDARD.en.md`, `VERSION`), `rules/`, `packs/`, `templates/`, `schemas/`, `procedures/`, `support-matrix.json`, `forbidden-mentions.json` and the ecosystem contract |
| `src/modules/` | Pure rules and types, no disk access: validators, Zod schemas, tar and gzip writer |
| `src/app/` | Use cases that orchestrate modules and infrastructure: verify, pack, render, index |
| `src/infrastructure/` | Disk, processes, compression and fingerprints |
| `src/interfaces/cli/` | One file per command; translates arguments into use cases |
| `tests/architecture/` | Test of the import rules between layers |
| `docs/es/`, `docs/en/` | This documentation, numbered and in pairs |
| `docs/decisions/` | Decision records 0001 to 0025 with `INDEX.json` |
| `docs/audits/`, `docs/handoffs/`, `docs/signals/`, `docs/superpowers/` | Historical record (audits, handoffs, external signals, plans); does not count for parity |
| `docs/notion-map.json` | Page map with fingerprints (next section) |

## `docs/notion-map.json`

A **mirror** is a copy of a document kept outside the repository. To know whether a mirror is still current, `bun run notion-map:build` writes `docs/notion-map.json` with `schemaVersion: 1`, `productVersion` (the `version` in `package.json`) and one row per es/en pair: `{ es, en, sha256Es, sha256En, notionPageId }`. The fingerprint is the SHA-256 of each file's content, computed on every run. `notionPageId` starts as `null`; if a person fills it in, it is kept as long as the Spanish file exists, and pairs that disappear are removed from the map. Running the command twice without changes produces exactly the same file. A previous map that does not satisfy the schema stops the command with `NOTION_MAP_FAILED` instead of silently discarding identifiers.

## Where to read next

- The norm: `standard/STANDARD.md` in Spanish and `standard/STANDARD.en.md` in English.
- The decision records: `docs/decisions/` with its `README.md`. The ones that explain this delivery are 0009 (a single source for the standard, no copies), 0015 (decision records in four layers) and 0019 (thin, documented and validated workflows).
- The ecosystem contract: `standard/FORGE614_ECOSYSTEM_CONTRACT.md` and its English twin.
