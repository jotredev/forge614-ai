# forge614-ai — Delivery 0: Forge614 Node Standard

**Date:** 2026-09-22
**Status:** Approved by the product owner on 2026-09-22
**Governs:** `forge614-ai` and, by extension, every repository in the Forge614 ecosystem
**Sister translation:** `2026-09-22-entrega-0-estandar-de-nodo-design.md`
**Related decision records:** `docs/decisions/0001` to `docs/decisions/0019`
**Annexes:** `docs/audits/2026-09-22-*.md` (code audits of the five nodes), `standard/procedures/new-agent-checklist.md`

---

## 1. Purpose

Before building the core of forge614-ai, the ecosystem needs a single way of building itself. Today every node is an island: its own installer, its own release, documentation that looks alike but is not the same, contracts scattered around, and no systematic review. Delivery 0 creates **the Forge614 Node Standard**: a set of centralized, versioned, machine-verifiable rules that every repository in the ecosystem must comply with, and the **verifier** that enforces them locally and in CI.

Expected outcome when the delivery closes: the five existing nodes (Engines, Engram, Shell, Atlas, Workers) pass the verifier in green, have their own contract, install and release in the same way, and no architecture decision lives only in a conversation.

## 2. Context

### 2.1 Starting point

`forge614-ai` is an empty repository (a single `README.md`). The ecosystem contract (`FORGE614_ECOSYSTEM_CONTRACT.md`) names it as the core and orchestrator, and assigns it, as its first job, defining the orchestration and lifecycle contracts.

The five nodes exist and work to varying degrees. A static code audit (2026-09-22, five independent readers, findings with file and line, separating what was verified from what was assumed) found system-wide problems, not problems of a single repository:

| Problem | Evidence |
|---|---|
| The "identical" ecosystem contract has five different versions | 10 327 B in Engram, 10 158 in Engines, 10 136 in Atlas, 9 825 in Workers, 9 464 in Shell |
| No node validates with a schema what it receives from another node | Atlas reads the output of Engines and Workers with `JSON.parse(...) as`; Engram uses Zod only in MCP |
| Errors and output versioning differ per node | Engram: `{code,error}` on stderr; Engines: `{schemaVersion, error:{code,message}}` on stdout; Atlas: `{status:"error"}`; Workers without `schemaVersion` |
| Five recipes for installation and release | Engines: `bun release` + multi-platform CI; Engram: hand-written installer without Windows; Shell: installer that edits dotfiles and manual asset upload; Atlas and Workers: nothing |
| Documentation that contradicts the code | Atlas documents "Plans 1–3" with Plans 1–4 merged; Engram documents v1.2.1 at v1.5.0; Shell's `AGENTS.md` contradicts its code |
| No per-node contract | Contracts live scattered across specs, docs and code |

Priority 1 security findings, re-verified in the code by the author of this spec:

| Node | Finding | Location |
|---|---|---|
| Engines | `plan` prints to stdout the assistant's complete configuration file (`writes[].afterContent`), including tokens of the user's other MCP servers | `src/interfaces/cli/commands.ts:36,42,48,106,112`; `src/modules/config-writer/types.ts:4` |
| Engines | Uninstalling deletes the binary without removing the session hooks: Claude Code and Codex are left invoking a nonexistent executable | `install.sh:36-45`, `install.ps1:31-44` |
| Engram | `uninstall` invokes `forge614-atlas uninstall --from forge614-engram --confirmed`; Atlas only implements `init` | `src/app/uninstall.ts:35-39`; Atlas `src/interfaces/cli/main.ts:12,21` |
| Atlas | Persists into Engram the model's raw output without sanitizing or bounding it, and `tokensConsumed: 0` as real data | `src/modules/cli/dispatch-modules.ts:68,115` |
| Workers | Inherits the complete `process.env` (API keys and base URLs included); `--version` blocks waiting for stdin | `src/process-runner.ts:63-68`; `src/main.ts:7` |
| Shell | No continuous integration; the "retired" Pi engine is still a live runtime dependency | repository tree; `package.json:5,24-25` |

The complete per-node detail is in the `docs/audits/` annexes.

### 2.2 Product decisions that frame this delivery

Made with the product owner on 2026-09-22 and recorded as decision records (`docs/decisions/`):

- The ecosystem follows a **microkernel architecture** distributed as **packages with declared dependencies**: every node installs on its own and resolves its transitive dependencies; `forge614-ai` is the **meta-package** that installs everything (record 0001). "Lego" is only the opening analogy.
- The build order is: Delivery 0 (this standard) → Delivery 1 (`forge614 init` / `forge614 prepare`) → Delivery 2 (orchestration core) → Delivery 3 (marketplace) (record 0002).
- Development rules live **only** in `forge614-ai`, with no copies in other repositories (record 0009).
- No node, contract or document mentions external products (record 0012).
- All development applies structure and design patterns named by the standard, justified by problem, never by list (record 0014).
- Every architecture decision is recorded in four layers: plan → decision record → Engram → changelog (record 0015).

## 3. Scope

### 3.1 In scope

1. **The Node Standard** (section 4): bilingual normative document, templates and rule pack, published from `forge614-ai`.
2. **Centralized distribution** (section 5): per-repository pointer, local cache, maintainer hook.
3. **The verifier** (section 6): `forge614-sentinel check`, first version without AI, integrated into `bun verify` and into each node's CI.
4. **Per-node contracts**: `CONTRACT.md` es/en in the five existing nodes.
5. **New-agent procedure and support matrix** (section 4.12), centralized.
6. **Alignment of the five nodes** (section 7): immediate P1 security patches and one alignment plan per repository.
7. **Decision records**: `docs/decisions/` in `forge614-ai` with records 0001–0016, template and promotion rule.
8. **Ecosystem contract update**: Workers as an implementation package; Hub and Sentinel as nodes; microkernel architecture with distribution as packages with declared dependencies; `forge614 init|prepare|status|doctor|update` commands; run ledger as an explicit exception to "no parallel progress databases".

### 3.2 Out of scope (on purpose)

| What | Why not yet | When |
|---|---|---|
| `forge614 init` and `forge614 prepare` | They are built on top of this standard | Delivery 1 |
| Hub (package catalog) | Needs the package format and the verifier already proven with the standard's own rules | Delivery 1 (first local catalog) |
| Orchestration core: brain, task board, workers, retries, circuit breaker, run ledger | Delivery 2 | Delivery 2 |
| Sentinel with AI (independent reviewer) | Depends on the core to have work to review | Delivery 2 |
| Token usage capture in Workers/Engines | Only the core consumes it; recorded as a pending contract change | Delivery 2 |
| Remote marketplace, community origins, quarantine | The local catalog with the official origin is enough to start | Delivery 3 |
| Execution or functional redesign of Atlas | Atlas already dispatches (Plans 1–4); it is only aligned to the standard and its documentation corrected | Atlas repository |

## 4. The Forge614 Node Standard

It is normative. "Must" means the verifier checks it or, when it cannot, that human review requires it before merging.

### 4.1 Node identity and contract

- Every repository in the ecosystem carries `forge614.node.json` at its root:

  ```json
  {
    "schemaVersion": 1,
    "node": "engram",
    "kind": "product | internal",
    "standard": { "version": "1.0.0", "sha256": "<fingerprint of the standard package>" }
  }
  ```

  `kind: internal` marks pieces nobody installs by hand (Engines, Workers).
- Every node carries `CONTRACT.md` and `CONTRACT.en.md` at its root, with fixed sections: one-sentence purpose; what it does; what it does not do; dependencies (nodes and external binaries); public commands with input schema, output schema and `schemaVersion`; error codes; mandatory requirements for supported AI agents (link to the central procedure); compatibility policy. The contract is updated in the same change that modifies any of those points.
- `FORGE614_ECOSYSTEM_CONTRACT.md` is no longer copied. Each repository references it through the pointer; the verifier checks that the local text, if present, is byte-identical to the one published by `forge614-ai` for the pinned version.

### 4.2 Repository structure and layers

```
<node>/
├── forge614.node.json
├── CONTRACT.md · CONTRACT.en.md · README.md · CHANGELOG.md · SECURITY.md · LICENSE
├── src/
│   ├── modules/          pure rules and types; no I/O; only node:crypto and node:util
│   ├── app/              use cases; orchestrates modules and infrastructure
│   ├── infrastructure/   disk, processes, network, databases
│   └── interfaces/       cli/, mcp/: translate external input into use cases
├── tests/architecture/   import-rule test (AST) and final-tree test
├── docs/
│   ├── es/ · en/         numbered 00–NN, one-to-one parity, opening analogy
│   ├── decisions/        decision records 0001-…
│   └── notion-map.json   mirrors and fingerprints
├── scripts/              only what the standard does not provide (minimal)
└── .github/workflows/    verify.yml and release.yml generated from the template
```

- Dependencies point inward only: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`. `modules` imports nothing external. Verified by an AST test (Engram's is the reference).
- Unit tests next to the code (`x.ts` + `x.test.ts`); integration tests in `__tests__/`; those requiring real binaries or accounts are marked and excluded from CI by default.
- A node does not import another node's internal folders. It consumes only binaries by canonical path (`~/.forge614/<node>/bin/`) or a published, versioned public SDK. `file:../other-node` in `package.json` is forbidden.

### 4.3 Stack

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`, no `@ts-ignore`, no `as` over external data.
- Bun as the development package manager and runner; `bun.lock` as the only lockfile; `bun install --frozen-lockfile` in CI.
- **Zod at every boundary**: CLI arguments, stdin, configuration files, responses from other nodes, MCP payloads, network responses. `.strict()` schemas; unknown fields are an error. Inside the boundary, everything is typed and trusted.
- Distribution runtime: compiled binary (`bun build --compile`) per platform. A node that today requires Node at runtime (Shell) documents the exception in its contract with a retirement date.

### 4.4 Machine contracts

Single convention (record 0013, **accepted** on 2026-09-22; it changes the format Shell reads from Engines today, so it is adopted with a new `schemaVersion` and a one-version compatibility window):

- All data output goes to **stdout** as a single JSON object with an integer `schemaVersion` at the root.
- All errors go to **stderr** as `{ "schemaVersion": n, "code": "STABLE_CODE", "error": "message for people in the configured language" }`, with no raw paths, no stack traces, no secrets.
- Exit codes: `0` success; `1` error; `2` invalid input; `75` recoverable pause (quota); others only if the node's contract documents them.
- Event streams: NDJSON on stdout, one object per line, each with `schemaVersion` and `type`; a terminal event is guaranteed.
- `--help` and `--version` always available and never blocking.
- Incompatible changes bump `schemaVersion`; the consumer rejects versions it does not know with `SCHEMA_UNSUPPORTED`.

### 4.5 Mandatory patterns

They are named by problem. An abstraction that does not answer a listed problem is justified in the plan's `Decisions` or does not get in. **Every design decision names its canonical pattern; an analogy never replaces the pattern's name** (Appendix A maps every ecosystem element to its pattern).

| Problem | Pattern | Existing reference |
|---|---|---|
| Structure | Clean architecture by layers (4.2) | Engram |
| External providers (AI assistants, Git, disk) | Ports and adapters: one interface per capability, one adapter per provider, registry with a capability manifest validated at startup (fail-closed) | Engines |
| CLI commands | Each command is a pure use case with validated input and typed output; the CLI only translates | — |
| External inputs | Schema at the boundary (4.3) | Engram (MCP) |
| Errors | Single model: stable code + bilingual message + internal cause never exposed | — |
| Changes to third-party files | Plan → snapshot → apply → verify → revert, with a guard against intermediate changes | Engines |
| Work state | Immutable event log + explicit state machine | Designed (Delivery 2) |
| Persistence | Repository: the domain does not know whether SQLite or PostgreSQL is behind it | Engram |
| Configuration | Typed, validated at startup, layered (ecosystem → project → run) | Designed (Delivery 1) |
| Decisions | One decision record per decision (4.9) | — |

### 4.6 Installation

- **Three operating systems, always** (record 0018): every node publishes binaries and an installer for macOS (arm64 and x64), Linux (arm64 and x64) and Windows (x64). There are no exceptions and no "pending"; a node missing one of the three is not released.
- A single `install.sh` and a single `install.ps1`, **generated from the template** in `forge614-ai/standard/templates/`, parameterized by node name, repository and assets. No node writes its own.
- Destination `~/.forge614/<node>/<version>/` with a stable launcher `~/.forge614/<node>/bin/<node>` and an `.active-version` file. `FORGE614_HOME` replaces `~/.forge614` in every node, without exception.
- Download over HTTPS only; mandatory SHA-256 verification against the same release's `SHA256SUMS`; the installer never executes remote scripts without verifying their fingerprint.
- No dependency on Node or Python on the target machine: the installer resolves the release with system tools or with a published auxiliary binary.
- No node edits the user's `PATH` or profile files. Only `forge614-ai` creates the global `forge614` command, and it asks first.
- Symmetric uninstallation: first removes its integrations in assistants (hooks, MCP, instructions) through the public contracts, then deletes only its own directory. Never the whole `~/.forge614/`.
- Update (`<node> update`): downloads and verifies the installer **of the target release**, allows `--version`, and records the previous version for rollback.

### 4.7 Release and versioning

- `bun release` is a shared package published by `forge614-ai` (origin: the proven Engines script), not a copy per repository: it suggests a version from conventional commits, validates against tags, syncs `productVersion` in `notion-map.json`, runs tests and typecheck, runs the verifier, applies the agent-procedure gate (4.12), tags, pushes and follows the CI run.
- Strict SemVer. Conventional commits are mandatory (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`; `!` or `BREAKING CHANGE` for major).
- `CHANGELOG.md` generated by `bun release`; never edited by hand.
- CI from template: `verify.yml` on push and PR (frozen install, typecheck, test, build, docs parity, standard verifier); `release.yml` on tag with compilation on native runners (macOS arm64/x64, Linux arm64/x64, Windows x64), per-platform smoke test and publication with `SHA256SUMS`.
- CI actions pinned by version. Lockfile mandatory.
- The release commit carries no fixed tool attributions.
- **Thin workflows, documented and validated before integrating** (record 0019):
  - Every workflow step runs a repository script (`bun run <script>`); no logic lives inside the YAML. That way, what runs locally is exactly what runs in CI.
  - Every workflow is documented in `docs/es/NN-workflows.md` and its English counterpart: triggers, jobs, what it tests, what it validates, what it publishes and expected duration. The verifier cross-checks the YAML jobs against the documented ones.
  - `bun workflows:check` validates the syntax and schema of every YAML, that actions are pinned by version and that steps only call scripts; it is part of `bun verify`.
  - `bun workflows:run` executes locally, in the same order, the scripts CI would run; a template `pre-push` hook runs it before publishing a branch.
  - The `main` branch is protected: no merge without the `verify` workflow in green. The repository template documents the exact protection configuration.

### 4.8 Documentation

- Bilingual root `README.md` with: one-sentence analogy, what it is, what it is not, installation, documentation table.
- `docs/es/NN-slug.md` and `docs/en/NN-slug.md` numbered from `00`, one-to-one parity by number and content; every document opens with an everyday analogy and defines every technical term the first time it appears.
- `docs/notion-map.json` with every page, `reviewedProductVersion` equal to the current version and real SHA-256 fingerprints.
- `CONTRACT.md` generated from or verified against the code (listed commands exist; schemas match).
- Historical documents (`docs/superpowers/`, `docs/handoffs/`) are kept but marked as records, not current state, and do not count toward parity.
- No mention of external products (record 0012).

### 4.9 Work process and decision records

1. **Plan before code** (`.agents/plans/YYYY-MM-DD--slug.md`, monorepo contract): objective, context, scope, decisions with rationale and discarded alternative, checklist, real validations, result. A non-trivial change without a plan is not reviewed.
2. **Decision record** (`docs/decisions/NNNN-slug.md`) for every architecture or contract decision: date, status (`proposed | accepted | revoked | superseded by NNNN`), Engram session, context, decision, discarded alternatives, consequences. It is never deleted; it changes status.
3. **Engram** receives, when the plan closes, a summary with links to the plan and the records, with the `sessionId`. Git is the original; Engram is the recallable index.
4. **Changelog** at release.
5. Local `bun verify` before closing a plan and again after closing it; CI on every PR. Git is read-only for AI agents: a person manages the history.

### 4.10 AI agent behavior rules (node pack)

Installed by the startup hook in ecosystem repositories (section 5.4). They are core: they cannot be turned off.

- Before executing any non-trivial request, explain what it is for, what it benefits, pros, cons and alternatives. "Yes" is never the default answer.
- Never invent a validation result nor mark as done what was not done.
- Never create or modify `.agents/`, `forge614.node.json` or generated files by hand; only through the ecosystem's tools.
- Never mention external products in code, docs or contracts.
- Git read-only. Never secrets in memory, outputs, logs or command-line arguments.
- On a contract change: update `CONTRACT.md`, bump `schemaVersion` if it breaks, and write a decision record.
- When finishing: summary to Engram with links; never claim that a host consumed something that is not verifiable.

### 4.11 Cross-cutting security

- Secrets never in stdout, stderr, logs, `argv` or memory. Complete contents of third-party configuration files only in own storage with `0600` permissions, never in command outputs (diff and fingerprint are allowed).
- Sensitive values (URLs with credentials) come in via stdin or environment variables, never via arguments.
- Child processes: explicitly filtered environment (shared blocklist of API keys and base URLs), own process group, `SIGTERM` → `SIGKILL`, always a timeout.
- Files: atomic write with `fsync` and verification; snapshot before touching foreign files; defined retention for plans and snapshots.
- Text coming from models or from memory is treated as data: it is bounded and sanitized before persisting or injecting into a context.
- `SECURITY.md` with a reporting channel and disclosure policy.

### 4.12 New AI agents

- The master procedure lives in `forge614-ai/standard/procedures/new-agent-checklist.md` (origin: the product owner's checklist), with one section per node. Each node links to it from its `CONTRACT.md` and only completes its own section.
- The **support matrix** (`standard/support-matrix.json`) is the source of truth for which assistants are supported and in which node. An assistant becomes `supported` only when every mandatory cell is green. If it lacks a mandatory requirement or loses functionality, it does not get in.
- The verifier cross-checks the matrix against the adapter registry (Engines), the execution registry (Workers) and the chat list (Shell): an assistant registered in a node and missing from the matrix, or the reverse, is a failure.
- **The procedure is reviewed on every node change, not only when a new assistant arrives** (record 0017). Three locks:
  1. Every plan carries the mandatory section `## Impacto en el procedimiento de agentes` with `Sí` (which new validation it requires) or `No` (reason). The verifier does not allow closing a plan without real content there.
  2. `bun release` reads the plans closed since the last tag; if any declares `Sí`, it requires `forge614.node.json` to pin a version of the procedure and of the matrix that already include that change. Otherwise it does not publish and explains what is missing.
  3. When a node's section in the procedure changes, the support matrix marks `revalidate` in every cell of that node; an assistant returns to `supported` only when a person runs the new validation and records it with a date. The verifier fails if a cell has been in `revalidate` for more than 30 days.

## 5. Centralization and distribution of the standard

### 5.1 Source of truth

`forge614-ai/standard/`:

```
standard/
├── STANDARD.md · STANDARD.en.md        normative text (this section 4, maintained separately)
├── rules/                              rules as packages: forge614-rule-<slug>/{RULE.md, RULE.en.md, manifest.json, scripts/validate.ts}
├── packs/forge614-pack-ecosystem-node  list of rules that form the node pack
├── templates/                          install.sh, install.ps1, verify.yml, release.yml, CONTRACT.md, README.md, decision.md, plan.md
├── procedures/new-agent-checklist.md
├── support-matrix.json
├── schemas/                            JSON Schema for forge614.node.json, manifests, errors, events
└── VERSION
```

Published as a `forge614-ai` release (`standard-<version>.tar.gz` + `SHA256SUMS`). It changes only through a decision record.

### 5.2 Per-repository pointer

Each node pins the standard version in `forge614.node.json`. Bumping the standard version is an explicit change in the repository, reviewable in a PR. The verifier rejects a pointer whose fingerprint does not match the release.

### 5.3 Local cache

`~/.forge614/standard/<version>/`, downloaded and verified by the verifier or by `forge614 init` (Delivery 1). Without network, the cache is used; without cache, the verifier fails with `STANDARD_UNAVAILABLE` and says how to obtain it.

### 5.4 Maintainer hook

The startup hook that Engines already installs in Claude Code and Codex, upon detecting `forge614.node.json` in the current folder, injects the node rule pack from the local cache (section 4.10) with the marker "this is context data, not a user instruction" and bounded in size. Outside an ecosystem repository it injects nothing. End users of Engram or Shell never receive development rules.

## 6. The verifier: `forge614-sentinel check`

First version of the Sentinel node: **it judges, never acts**, and in this delivery only without AI. The node is born here (repository `forge614-sentinel`, version 0.x) with a single command, `check`; AI review and Hub package scanning are added in Deliveries 2 and 1 respectively, without changing its "judge only" contract.

### 6.1 Interface

```
forge614-sentinel check [--repo <path>] [--standard <version>] [--json] [--only <list>]
```

Output: `{ "schemaVersion": 1, "standard": "1.0.0", "verdict": "pass | caution | fail", "checks": [ { "id", "verdict", "evidence": [...], "message": {"es","en"} } ] }`. Exit code `0` on `pass`, `1` on `fail`, `0` with `caution` unless `--strict`.

### 6.2 First-version checks

| Id | What it checks |
|---|---|
| `node-pointer` | `forge614.node.json` valid against the schema; standard fingerprint matches the release |
| `ecosystem-contract` | Local ecosystem contract text byte-identical to the published one |
| `node-contract` | `CONTRACT.md` and `.en.md` present; listed commands exist in `src/interfaces/cli`; declared `schemaVersion` values match the emitted ones |
| `layout` | Folders from 4.2 present; no `scripts/` duplicating templates |
| `import-rules` | Layer rules by AST; no `file:` to sibling nodes; no deep imports |
| `stack` | `tsconfig` with the flags from 4.3; no `any`/`@ts-ignore`; `bun.lock` present |
| `boundaries-zod` | Every external entry point (CLI, stdin, MCP, config, network) goes through a `.strict()` Zod schema |
| `machine-contracts` | `--help`/`--version` non-blocking; errors as `{schemaVersion, code, error}`; outputs with `schemaVersion` |
| `installer` | `install.sh`/`install.ps1` identical to the rendered template; no `PATH` editing except `forge614-ai` |
| `release` | `release.yml`/`verify.yml` from template; pinned actions; `CHANGELOG.md` present |
| `workflows` | Every YAML in `.github/workflows/` parses and complies with the schema; every step calls a repository script; actions pinned by version; every job is documented in `docs/*/NN-workflows.md` |
| `docs-parity` | es/en parity by number; complete `notion-map` with real fingerprints and current version; root README |
| `decisions` | Records with valid statuses; none deleted relative to history; closed plans with non-empty `Decisions` |
| `forbidden-mentions` | Forbidden name list absent from code, docs, contracts and commits |
| `secrets-hygiene` | Secret patterns absent from the tree; `plan` outputs without complete file contents |
| `support-matrix` | Adapter registries consistent with `support-matrix.json`; no cell in `revalidate` for more than 30 days |
| `agent-checklist-impact` | Every closed plan has `## Impacto en el procedimiento de agentes` with real content; if it declares `Sí`, the pointer pins a version of the procedure and the matrix that includes the change |
| `versions` | `package.json`, highest tag, `notion-map.productVersion` and `--version` match |

### 6.3 Integration

- Each node's `bun verify` invokes `forge614-sentinel check --json` (binary by canonical path; in CI, installed from a release).
- The template `verify.yml` runs it on every PR; a `fail` blocks the merge.
- Sentinel audits itself: its own repository passes the verifier before being published.

### 6.4 What the verifier does not do

It does not fix, does not install, does not run AI work, does not decide. A `caution` is decided by a person.

## 7. Alignment of the existing nodes

### 7.1 Immediate P1 patches (before the standard, one small plan per repository)

| Node | Patch |
|---|---|
| Engines | Redact `writes[].afterContent` in every `plan` output (emit diff + fingerprint; content only in the plan-store with `0600`). Uninstallation that runs `plan memory-remove` + `apply` per assistant before deleting. Honor `FORGE614_HOME` in `plan-store.ts` and `snapshot.ts`. |
| Engram | Decouple `uninstall` from the nonexistent Atlas command (cross-node coordination moves to `forge614-ai` in Delivery 1; meanwhile, Engram uninstalls only its own and warns). `--postgres-url` via stdin or environment variable. `update` with pinned version and verified installer fingerprint. |
| Atlas | Sanitize and bound the model output before `recordModuleReport`; `tokensConsumed: null` with a "not measured" mark; replace `file:../forge614-engram` with a published version. |
| Workers | Filter API keys and base URLs from the inherited environment (list shared with Shell); `--help`/`--version` without reading stdin; timeout and stderr capture when invoking Engines; process group to kill children. |
| Shell | Minimal `verify.yml` (install, typecheck, test, build). Explicit confirmation before bypassing permissions. `update` that downloads the target release's installer. |

### 7.2 Full alignment (with the standard published)

Each node opens a plan `2026-MM-DD--alineacion-estandar-de-nodo.md` whose closing criterion is `forge614-sentinel check` at `pass`. Minimum content per node, derived from the audits (annexes):

- **Engines**: Zod on argv/stdin/plans/manifests/GitHub responses; `apply --revert` and rollback on partial failure; retention of plans and snapshots; installer from template without Node/Python; spec rewritten without external mentions; `CONTRACT.md`.
- **Engram**: `schemaVersion` in every output; retire the interactive `init` (Shell takes it over in Delivery 1) while keeping `init --json` complete (reinforcement included); Zod on CLI, `.env` and `summary-json`; installer and release from template **with Windows x64 mandatory** (SQLite and FTS5 compiled and tested on a real Windows runner); remove orphan dependencies and the empty native binary; root README; `CONTRACT.md`; document that `startup-context` returns unsanitized data and the shadowing rule by `topic_key`.
- **Shell**: decide by decision record the base of its interface (today the whole screen depends on the `pi-tui` library and the Pi runtime remains a dependency even though Pi is "retired" as an engine): declare it the official base and document it, or replace it; in any case remove the Pi launcher, extension and integration test as an engine; Zod on Codex payloads and preferences; chat engine registry in a single module; `app → ui` layers corrected; installer and release from template for the three operating systems; `AGENTS.md`, `clientInfo.version`, `notion-map` up to date; delete unused binary assets.
- **Atlas**: rewrite README, docs 00–01 and spec as "optional initial contextualization" without TUI or concurrency 3; fix session closing with skipped modules and incremental re-analysis; Zod on Engines/Workers outputs; capture Workers stderr; error convention and `--version`; `infrastructure/app` layers; move the model table to policy (Delivery 1); installer, CI and release from template; `CONTRACT.md`; delete orphan branch.
- **Workers**: `schemaVersion` in input and events; Zod with unique ids, positive integers, absolute paths and prompt size cap; quota patterns confirmed against real CLIs; layers; `CONTRACT.md` and runbook in Spanish; CI, installer and release from template; first tag; `kind: internal`.

Alignment order: ecosystem contract → Engines → Workers → Engram → Atlas → Shell (from smallest to largest visible surface; Shell last because Delivery 1 adds the plan screen to it).

## 8. Phases and completion criteria

| Phase | Deliverable | Done when |
|---|---|---|
| 0.1 Standard | Complete, bilingual `standard/` with templates, pack and schemas; records 0001–0016; updated ecosystem contract | The owner approves `STANDARD.md`; `forge614-ai` passes its own `docs-parity` and `decisions` |
| 0.2 Verifier | `forge614-sentinel` repository with `check` and the 18 checks; published with a release and a template installer | Sentinel passes its own `check`; `forge614-ai` passes `check` |
| 0.3 P1 patches | Five small plans merged and released | Every P1 finding has a regression test and a release |
| 0.4 Alignment | Five alignment plans closed | The five nodes pass `check` in CI; support matrix consistent |
| 0.5 Maintainer hook | Node pack injected by the Engines hook in ecosystem repos | Opening Claude Code or Codex in any node shows the pack; outside a node, nothing |

## 9. Risks and open questions

| Risk / question | Mitigation / pending decision |
|---|---|
| The verifier becomes a god-node | Its contract limits it to judging; every new check requires a decision record |
| Circular dependency: Sentinel must pass the standard it verifies | Sentinel is built with the template and self-verifies before publishing the first version; until then, human review |
| Retiring Engram's interactive `init` before Shell covers it | It is retired only when `forge614 prepare`/Shell take it over (Delivery 1); meanwhile, it is marked transitional |
| Pi in Shell: removing it may require rewriting the UI | Pending product decision: the ecosystem's UI base (record to be opened when aligning Shell) |
| Windows in Engram (native SQLite/FTS5) | Mandatory by record 0018; Engram's alignment plan includes compilation and tests on a real Windows runner |
| Maintainer hook tokens | Bounded pack (< 4 000 tokens) and only in ecosystem repos |
| Error convention breaks current consumers (Shell reads Engines) | Coordinated change with a new `schemaVersion` and a one-version compatibility window |

## 10. Success criterion for Delivery 0

On a clean machine: clone any of the five nodes, run `bun install --frozen-lockfile && bun verify`, and get the verifier at `pass`; install any node with its template `install.sh` and uninstall it without leaving traces in assistants or in someone else's `~/.forge614/`; open Claude Code in any node and receive the rule pack; and be able to answer, for every architecture decision in the ecosystem, "when, why, what was discarded and in which session", by reading `docs/decisions/`.

## Appendix A — Canonical patterns by ecosystem element

Nothing in the design is invented: every element corresponds to a named pattern in the literature. The analogies in the documentation (workshop, reception desk, foreman, cartographer, archivist, sentinel, warehouse) are only reading aids; the pattern is what is normative.

| Forge614 element | Canonical pattern | Origin |
|---|---|---|
| Small core (`forge614-ai`) + independent nodes with public contracts | Microkernel architecture (plug-in architecture) | Software architecture patterns |
| Installing a node brings what it needs | Transitive dependency resolution of a package manager | Package managers (apt, npm, Homebrew) |
| `forge614-ai` installs the whole ecosystem | Meta-package | Debian, Homebrew |
| Engines and Workers are not installed directly | Implementation package (private dependency) | Package managers |
| `~/.forge614/<node>/<version>/` + stable launcher in `bin/` | Versioned prefix with stable links (cellar / store) | Homebrew, Nix |
| Detection and configuration of AI assistants | Ports and adapters (hexagonal architecture) + registry with a capability manifest validated at startup | Hexagonal architecture |
| plan → snapshot → apply → verify → revert | Plan/Apply (infrastructure as code) + transactional change with rollback | IaC tools; transactions |
| `modules / app / infrastructure / interfaces` layers | Clean architecture (dependencies point inward) | Clean architecture |
| Run ledger | Event Sourcing (immutable log) + explicit state machine | Persistence patterns |
| Sentinel | Quality Gate + policy enforcement point (PEP/PDP) | CI/CD; security architecture |
| Hub with catalog, lock and fingerprints | Artifact registry + lockfile + supply-chain verification | Package managers; SLSA |
| Layered policies (ecosystem → project → run) | Cascading configuration | Git config, CSS |
| Three attempts escalating reasoning and model | Retry with escalation | Resilience patterns |
| Pausing a profile after three consecutive failures | Circuit Breaker | *Release It!* |
| Only one worker writes at a time | Single Writer Principle | Concurrent systems |
| Workers with a profile taking tasks from a board | Work queue with competing consumers + state board | Messaging patterns |
| Startup hooks in assistants | Extension points (hooks / observer) | GoF |
| Model and reasoning per task tier | Strategy | GoF |
| Decision records | Architecture Decision Records | Industry practice |
| Rules in a single place and thin adapters per assistant | Single Source of Truth + adapters | Already applied in the monorepo |
| JSON contracts with `schemaVersion` | Schema versioning (explicit compatibility) | API design |
| Short skill index + full load on demand | Progressive disclosure | Interface design |
