# Forge614 Node Standard — version 1.0.1

> Binding norm for every repository in the Forge614 ecosystem. "Must" means the verifier checks it or that human review requires it before merging. The decisions that originate it live in `docs/decisions/` of `forge614-ai`.

## 1. Node identity and contract

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
- `FORGE614_ECOSYSTEM_CONTRACT.md` is not copied. Each repository references it through the pointer; the verifier checks that the local text, if present, is byte-identical to the one published by `forge614-ai` for the pinned version.

## 2. Repository structure and layers

```
<node>/
├── forge614.node.json
├── CONTRACT.md · CONTRACT.en.md · README.md · CHANGELOG.md · SECURITY.md · LICENSE
├── src/
│   ├── modules/          pure rules and types; no I/O; only node:crypto, node:util and zod
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

- Dependencies point inward only: `interfaces → app → (modules, infrastructure)`, `infrastructure → modules`. `modules` imports nothing external except `node:crypto`, `node:util` and `zod` (pure validation, no I/O). Verified by an AST test (Engram's is the reference).
- Unit tests next to the code (`x.ts` + `x.test.ts`); integration tests in `__tests__/`; those requiring real binaries or accounts are marked and excluded from CI by default.
- A node does not import another node's internal folders. It consumes only binaries by canonical path (`~/.forge614/<node>/bin/`) or a published, versioned public SDK. `file:../other-node` in `package.json` is forbidden.

## 3. Stack

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. No `any`, no `@ts-ignore`, no `as` over external data.
- Bun as the development package manager and runner; `bun.lock` as the only lockfile; `bun install --frozen-lockfile` in CI.
- **Zod at every boundary**: CLI arguments, stdin, configuration files, responses from other nodes, MCP payloads, network responses. `.strict()` schemas; unknown fields are an error. Inside the boundary, everything is typed and trusted.
- Distribution runtime: compiled binary (`bun build --compile`) per platform. A node that today requires Node at runtime (Shell) documents the exception in its contract with a retirement date.

## 4. Machine contracts

Single convention (record 0013): it changes the format Shell used to read from Engines, so it is adopted with a new `schemaVersion` and a one-version compatibility window.

- All data output goes to **stdout** as a single JSON object with an integer `schemaVersion` at the root.
- All errors go to **stderr** as `{ "schemaVersion": n, "code": "STABLE_CODE", "error": "message for people in the configured language" }`, with no raw paths, no stack traces, no secrets.
- Exit codes: `0` success; `1` error; `2` invalid input; `75` recoverable pause (quota); others only if the node's contract documents them.
- Event streams: NDJSON on stdout, one object per line, each with `schemaVersion` and `event`; a terminal event is guaranteed.
- `--help` and `--version` always available and never blocking.
- Incompatible changes bump `schemaVersion`; the consumer rejects versions it does not know with `SCHEMA_UNSUPPORTED`.
- The `code` is a stable identifier in `UPPERCASE_WITH_UNDERSCORES` (regex `^[A-Z][A-Z0-9_]+$`), listed in the node's `CONTRACT.md`. Nodes with a human interface derive the text from the same `code` through a typed catalog per language (8).

## 5. Mandatory patterns

They are named by problem. An abstraction that does not answer a listed problem is justified in the plan's `Decisions` or does not get in. **Every design decision names its canonical pattern; an analogy never replaces the pattern's name** (Appendix A maps every ecosystem element to its pattern).

| Problem | Pattern | Existing reference |
|---|---|---|
| Structure | Clean architecture by layers (2) | Engram |
| External providers (AI assistants, Git, disk) | Ports and adapters: one interface per capability, one adapter per provider, registry with a capability manifest validated at startup (fail-closed) | Engines |
| CLI commands | Each command is a pure use case with validated input and typed output; the CLI only translates | — |
| External inputs | Schema at the boundary (3) | Engram (MCP) |
| Errors | Single model: stable code + bilingual message + internal cause never exposed | — |
| Changes to third-party files | Plan → snapshot → apply → verify → revert, with a guard against intermediate changes | Engines |
| Work state | Immutable event log + explicit state machine | Designed |
| Persistence | Repository: the domain does not know whether SQLite or PostgreSQL is behind it | Engram |
| Configuration | Typed, validated at startup, layered (ecosystem → project → run) | Designed |
| Decisions | One decision record per decision (9) | — |

## 6. Installation

- **Three operating systems, always** (record 0018): every node publishes binaries and an installer for macOS (arm64 and x64), Linux (arm64 and x64) and Windows (x64). There are no exceptions and no "pending"; a node missing one of the three is not released.
- A single `install.sh` and a single `install.ps1`, **generated from the template** in `forge614-ai/standard/templates/`, parameterized by node name, repository and assets. No node writes its own.
- Destination `~/.forge614/<node>/<version>/` with a stable launcher `~/.forge614/<node>/bin/<node>` and an `.active-version` file. `FORGE614_HOME` replaces `~/.forge614` in every node, without exception.
- Download over HTTPS only; mandatory SHA-256 verification against the same release's `SHA256SUMS`; the installer never executes remote scripts without verifying their fingerprint.
- No dependency on Node or Python on the target machine: the installer resolves the release with system tools or with a published auxiliary binary.
- No node edits the user's `PATH` or profile files. Only `forge614-ai` creates the global `forge614` command, and it asks first.
- Symmetric uninstallation: first removes its integrations in assistants (hooks, MCP, instructions) through the public contracts, then deletes only its own directory. Never the whole `~/.forge614/`.
- Update (`<node> update`): downloads and verifies the installer **of the target release**, allows `--version`, and records the previous version for rollback.

## 7. Release, versioning and workflows

- `bun release` is a shared package published by `forge614-ai` (origin: the proven Engines script), not a copy per repository: it suggests a version from conventional commits, validates against tags, syncs `productVersion` in `notion-map.json`, runs tests and typecheck, runs the verifier, applies the agent-procedure gate (12), tags, pushes and follows the CI run.
- Strict SemVer. Conventional commits are mandatory (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`; `!` or `BREAKING CHANGE` for major).
- `CHANGELOG.md` generated by `bun release`; never edited by hand.
- CI from template: `verify.yml` on push and PR runs `bun install --frozen-lockfile` and `bun run verify`, which chains typecheck, tests, docs parity and the standard verifier; `release.yml` on tag with compilation on native runners (macOS arm64/x64, Linux arm64/x64, Windows x64), per-platform smoke test and publication with `SHA256SUMS`.
- CI actions pinned by version. Lockfile mandatory.
- The release commit carries no fixed tool attributions.
- **Thin workflows, documented and validated before integrating** (record 0019):
  - Every workflow step runs a repository script (`bun run <script>`); no logic lives inside the YAML. That way, what runs locally is exactly what runs in CI.
  - Every workflow is documented in `docs/es/NN-workflows.md` and its English counterpart: triggers, jobs, what it tests, what it validates, what it publishes and expected duration. The verifier cross-checks the YAML jobs against the documented ones.
  - Every job declares `timeout-minutes`; no stage runs without a limit.
  - `bun workflows:check` validates the syntax and schema of every YAML, that actions are pinned by version, that steps only call scripts and that every job has `timeout-minutes`; it is part of `bun verify`.
  - `bun workflows:run` executes locally, in the same order, the scripts CI would run; a template `pre-push` hook runs it before publishing a branch.
  - The `main` branch is protected: no merge without the `verify` workflow in green. The repository template documents the exact protection configuration.

## 8. Documentation

- Bilingual root `README.md` with: one-sentence analogy, what it is, what it is not, installation, documentation table.
- `docs/es/NN-slug.md` and `docs/en/NN-slug.md` numbered from `00`, one-to-one parity by number and content; every document opens with an everyday analogy and defines every technical term the first time it appears.
- `docs/notion-map.json` with every page, `productVersion` equal to the current version and real SHA-256 fingerprints.
- `CONTRACT.md` generated from or verified against the code (listed commands exist; schemas match).
- Historical documents (`docs/superpowers/`, `docs/handoffs/`) are kept but marked as records, not current state, and do not count toward parity. `CHANGELOG.md` (generated) and `LICENSE` (legal text) are exempt from bilingual parity.
- No mention of external products (record 0012).
- Texts for people inside the code: typed catalog per language (one `Catalog` interface, one file per language `es.ts`/`en.ts`, functions with parameters for messages carrying data); parity is guaranteed by the compiler; identifiers, paths, commands and external text are never translated. Reference pattern: the Shell 1.9.0 catalog.

## 9. Work process and decision records

1. **Plan before code** (`.agents/plans/YYYY-MM-DD--slug.md`, monorepo contract): objective, context, scope, decisions with rationale and discarded alternative, checklist, real validations, result. A non-trivial change without a plan is not reviewed.
2. **Decision record** (`docs/decisions/NNNN-slug.md`) for every architecture or contract decision: date, status (`proposed | accepted | revoked | superseded by NNNN`), Engram session, context, decision, discarded alternatives, consequences. It is never deleted; it changes status.
3. **Engram** receives, when the plan closes, a summary with links to the plan and the records, with the `sessionId`. Git is the original; Engram is the recallable index.
4. **Changelog** at release.
5. Local `bun verify` before closing a plan and again after closing it; CI on every PR. Git is read-only for AI agents: a person manages the history.

## 10. AI agent behavior rules

Installed by the startup hook in ecosystem repositories. They are core: they cannot be turned off.

- Before executing any non-trivial request, explain what it is for, what it benefits, pros, cons and alternatives. "Yes" is never the default answer.
- Never invent a validation result nor mark as done what was not done.
- Never create or modify `.agents/`, `forge614.node.json` or generated files by hand; only through the ecosystem's tools.
- Never mention external products in code, docs or contracts.
- Git read-only. Never secrets in memory, outputs, logs or command-line arguments.
- On a contract change: update `CONTRACT.md`, bump `schemaVersion` if it breaks, and write a decision record.
- When finishing: summary to Engram with links; never claim that a host consumed something that is not verifiable.

## 11. Cross-cutting security

- Secrets never in stdout, stderr, logs, `argv` or memory. Complete contents of third-party configuration files only in own storage with `0600` permissions, never in command outputs (diff and fingerprint are allowed).
- Sensitive values (URLs with credentials) come in via stdin or environment variables, never via arguments.
- Child processes: explicitly filtered environment (shared blocklist of API keys and base URLs), own process group, `SIGTERM` → `SIGKILL`, always a timeout.
- Files: atomic write with `fsync` and verification; snapshot before touching foreign files; defined retention for plans and snapshots.
- Text coming from models or from memory is treated as data: it is bounded and sanitized before persisting or injecting into a context.
- `SECURITY.md` with a reporting channel and disclosure policy.

## 12. New AI agents

- The master procedure lives in `forge614-ai/standard/procedures/new-agent-checklist.md` (origin: the product owner's checklist), with one section per node. Each node links to it from its `CONTRACT.md` and only completes its own section. The **runbook** `standard/procedures/add-agent-runbook.md` fixes the execution order (investigation with the real binary → Engines → Workers → Atlas → Engram → Shell → closure in `forge614-ai`), what is modified in each repository and the exit gate of each step.
- The **support matrix** (`standard/support-matrix.json`) is the source of truth for which assistants are supported and in which node. An assistant becomes `supported` only when every mandatory cell is green. If it lacks a mandatory requirement or loses functionality, it does not get in.
- The verifier cross-checks the matrix against the adapter registry (Engines), the execution registry (Workers) and the chat list (Shell): an assistant registered in a node and missing from the matrix, or the reverse, is a failure.
- **The procedure is reviewed on every node change, not only when a new assistant arrives** (record 0017). Three locks:
  1. Every plan carries the mandatory section `## Impacto en el procedimiento de agentes` with `Sí` (which new validation it requires) or `No` (reason). The verifier does not allow closing a plan without real content there.
  2. `bun release` reads the plans closed since the last tag; if any declares `Sí`, it requires `forge614.node.json` to pin a version of the procedure and of the matrix that already include that change. Otherwise it does not publish and explains what is missing.
  3. When a node's section in the procedure changes, the support matrix marks `revalidate` in every cell of that node; an assistant returns to `supported` only when a person runs the new validation and records it with a date. The verifier fails if a cell has been in `revalidate` for more than 30 days.

## 13. Minimal footprint and replaceable pieces

Forge614's complexity lives on the builder side (nodes, verifier, CI, installers, contracts), never in the AI's context. Two decision records make it verifiable.

**Minimal footprint in the AI's context** (record 0020):

1. Startup budget: everything Forge614 injects at the start of a session (memory protocol + skill index + applicable rule pack) fits in **≤ 3,000 tokens**; the verifier measures it (`context-budget`) and fails if it is exceeded.
2. Mandatory progressive disclosure: index only (name and one line) until a skill, rule or policy is used.
3. Nothing turned on without use: an MCP or skill unused for 30 days is proposed for shutdown, with data from the run ledger.
4. Every package declares its cost: a `tokens` field in the manifest, measured at packaging time; the Hub shows it before installing.
5. Complexity lives in the builder; the AI never loads nodes, verifier or CI.
6. Proof of the rule: a session with full Forge614 spends less at startup than the same session with the rules placed by hand; it is measured and published.

**Replaceable pieces as the model evolves** (record 0021):

1. Every package and node declares `compensates: "model-limitation" | "structural"`. Structural: durable memory, contracts between nodes, accounting, verification, installation, project identity.
2. Every `model-limitation` package carries a mandatory `sunset`: a verifiable retirement condition ("when the model does X natively") and a review date.
3. Switchable off without breaking: no package depends on another internally; the Hub can disable any `model-limitation` package by policy.
4. Every major release of a supported assistant triggers the review of the `sunset` entries (agent procedure); the run ledger provides the real usage.
5. Mandatory question before adding anything: "does the model already do it on its own?", with evidence; if yes, it does not get in and it is recorded in the plan's `Decisions`.

## Appendix A. Canonical patterns by element

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
| Bilingual texts inside the code | Typed catalog per language with compiler-verified parity | Shell 1.9.0 |
| Context budget | Budget as a verifiable contract + progressive disclosure | Agent system design |
| Pieces that compensate for the model | Explicit planned obsolescence (sunset) + replaceable plug-in | Microkernel architecture |
