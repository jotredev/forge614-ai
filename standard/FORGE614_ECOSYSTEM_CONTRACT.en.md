# Forge614 Ecosystem Contract

> **Status:** Contract v2 — approved product direction; supersedes v1 copies; distributed by pointer (`forge614.node.json`), no longer copied by hand.
> **Version:** 2.0.0
> **Purpose:** Keep independent projects coordinated without one silently taking on another's responsibility.

## 1. The product hierarchy

`forge614-ai` is the core of the Forge614 ecosystem: a meta-package that coordinates everything else and, once ready, will own the global `forge614` command. Around the core sit five **products** (a person installs these) and two **implementation packages** (nobody installs these directly; the product that needs them brings them along):

```text
forge614-ai                         Core and meta-package: coordinates the ecosystem
├─ forge614-shell                   Product — the only visual experience
├─ forge614-engines                 Implementation package — adapters for installed AI engines
├─ forge614-workers                 Implementation package — isolated execution of already-decided tasks
├─ forge614-engram                  Product — persistent memory engine
├─ forge614-atlas                   Product — optional initial repository contextualization
├─ forge614-hub                     Product — package store
└─ forge614-sentinel                Product — judges, never acts
```

Canonical pattern: **microkernel architecture** (`forge614-ai` as a small core; capabilities live in independent nodes), **distributed as packages with declared dependencies** that the installer resolves transitively (acta 0001). Each node is a separate product or implementation package with its own repository. Nodes communicate only through explicit public contracts, never through deep imports into another node's private folders.

## 2. Product responsibilities

| Product | Can work on its own? | Has a visual interface? | Owns |
|---|---:|---:|---|
| `forge614-ai` | Not until its core is released | It coordinates the experience | Global orchestration, lifecycle, routing, state, workflows and the future `forge614` command |
| `forge614-shell` | Yes | Yes | Optional chat and terminal workspace, guided installation, initialization, configuration, confirmations, repair, and visible status. Not required for day-to-day AI work once integrations are configured |
| `forge614-engines` | No | No | Detecting available AI engines and providing safe adapters for them |
| `forge614-workers` | No | No | Executing already-decided tasks, in sequence and isolation; no state of its own; internal use |
| `forge614-engram` | Yes, as a CLI/MCP memory engine | No | Persistent memory, SQLite, FTS5, project identity, search and optional synchronization |
| `forge614-atlas` | Not completely; it needs Engram and Engines | No | Deeply contextualizing repositories and depositing validated knowledge in Engram |
| `forge614-hub` | Yes, as a store | No | Package store: catalog, lock and fingerprints; no code of its own; never overwrites what belongs to the person |
| `forge614-sentinel` | Yes, as a verifier | No | Judges, never acts: deterministic verification and, later, AI review |

## 3. One visual experience

Forge614 Shell is the only visual interface Forge614 owns and maintains. It is required for human-guided installation, initialization, configuration, repair, and sensitive confirmation flows. It is optional for day-to-day AI work once approved integrations are configured.

- No other Forge614 product maintains its own TUI.
- Shell presents questions, choices, previews, confirmations, progress, warnings and results during its own setup and lifecycle flows.
- Shell configures approved integrations through each product's public contracts.
- After setup, people may work directly in their already-configured native AI assistants or in a normal terminal; those environments use their own interface and Forge614 does not duplicate it.
- External clients consume the configured MCP, CLI, SDK, hooks or skills through explicit public contracts, never through deep imports into another product's private folders.
- Shell can work without Engram or Atlas.

## 4. The global `forge614` flow

Once `forge614-ai` is ready, it will own the global `forge614` command with five subcommands:

- **`forge614 init`** — initializes the **machine**: resolves and installs the missing products and implementation packages, from verified releases, with clear notice of what gets installed and at what version.
- **`forge614 prepare`** — prepares a **project** (repository): detects or creates its portable identity, links its ecosystem group in Engram (actas 0022 and 0023) and applies that repository's initial configuration. The AI never runs `prepare` on its own: it only notifies when it is missing and waits for a person's confirmation.
- **`forge614 status`** — reports the state of the ecosystem and of the current project, as text or JSON (see the startup hook in section 11).
- **`forge614 doctor`** — diagnoses problems and proposes repairs; never applies them without confirmation.
- **`forge614 update`** — updates installed products to compatible versions.

```text
forge614-ai checks installed Forge614 products
        ↓
resolves missing compatible components with clear notice
        ↓
Forge614 Shell opens the visual flow when a human decision is needed
        ↓
Forge614 Engines reports available AI engines
        ↓
Shell collects the person's decisions and shows a preview
        ↓
approved components apply only the confirmed changes
```

Until `forge614-ai` exists, no other product may claim ownership of `forge614 init`, `forge614 prepare`, `forge614 status`, `forge614 doctor` or `forge614 update`. Product-specific commands may exist transitionally for compatibility, but they must hand control to Shell whenever the flow requires a visual decision.

## 5. Forge614 Engines

Forge614 Engines is an internal dependency, never a standalone application.

- It is installed automatically when a product requires it.
- It detects installed AI engines, executable availability, configuration locations and capabilities.
- It prepares read-only plans and previews.
- It does not display a TUI.
- It does not write configuration by itself.
- Shell requests a proposed change, shows it to the person and requests explicit confirmation before Engines applies it.
- Atlas consumes Engines to decide which available AI engine can run its Workers packages.

## 6. Forge614 Engram

Engram is the persistent memory engine, not a setup interface.

It owns:

- its private storage under `~/.forge614/engram/`;
- local SQLite and FTS5;
- optional PostgreSQL synchronization;
- persistent memories, project identities (`projectId`), shared memories, search and sessions;
- the `ecosystem` scope of memory shared across related repositories and the portable identity file `.forge614/project.json` that Engram writes and owns (actas 0022 and 0023);
- its MCP server and public TypeScript SDK.

It must preserve non-interactive commands and SDK operations for automation, such as:

```text
forge614-engram init --json
forge614-engram mcp
forge614-engram search ...
```

Engram must not own a TUI, discover AI engines, or directly present assistant-configuration choices. Those responsibilities belong to Shell and Engines.

During first-time memory initialization, Engram needs only these decisions:

| Need | Decision |
|---|---|
| Private product directory | Always required |
| Local SQLite and FTS5 | Always required |
| PostgreSQL synchronization | Optional |
| Reinforcement from repeated memories | Optional |
| Detecting AI engines | Not an Engram responsibility |
| Configuring AI integrations | Not an Engram responsibility |
| Creating or selecting projects | Not part of initialization |
| Writing `.forge614/project.json` when binding a project | Always, silent and idempotent |

Binding a project (writing `.forge614/project.json`) happens after `init`, when a project is created or selected: binding is not initializing.

## 7. Forge614 Atlas

Atlas is the deep-contextualization orchestrator. It works behind Engram; it is neither the memory store nor the visual workspace. Plans 1–5 implemented, v1.0.0 published; optional initial project contextualization.

```text
Forge614 Engines finds usable AI engines
        ↓
Forge614 Atlas analyzes a repository and runs non-interactive Workers packages
        ↓
Workers returns raw analysis to Atlas
        ↓
Atlas validates, organizes and writes structured knowledge to Engram
        ↓
Engram becomes the durable source of truth for context and progress
```

Atlas rules:

- Atlas consumes the public Engines contract; it does not implement a second engine detector.
- Atlas uses Engram's public TypeScript SDK, never Engram's private files or ad-hoc database access.
- Atlas is the only writer of its structured contextualization results; Workers never writes directly to Engram.
- Atlas does not create a competing progress database. Its resumable progress belongs in Engram sessions and memories.
- Atlas has no TUI. Shell owns every human decision, progress screen and confirmation.
- Atlas may report structured progress to Shell through an explicit public contract.

## 8. Installation and ownership boundaries

All products live under one shared directory, but each owns only its own:

```text
~/.forge614/
├─ shell/
├─ engines/
├─ workers/
├─ engram/
├─ atlas/
├─ hub/
├─ sentinel/
└─ ai/
```

| Product the person installs | Transitively resolved dependencies |
|---|---|
| `forge614-shell` | Engines |
| `forge614-engram` | Shell, Engines |
| `forge614-atlas` | Engram, Engines, Shell (+ Workers when it runs tasks) |
| `forge614-hub` | Engines |
| `forge614-sentinel` | — (deterministic verification does not depend on another product) |
| `forge614-ai` | All products and implementation packages (meta-package) |

`forge614-engines` and `forge614-workers` are implementation packages: nobody installs them directly.

Installation rules:

1. Missing components come from compatible, verified releases.
2. Fingerprints are verified before installation.
3. The person is told what component and version will be installed.
4. No product replaces another product's files or data.
5. No product deletes `~/.forge614/` as a whole.
6. Each product repairs permissions only inside its own directory.
7. Installing a binary never silently configures AI integrations or creates memories.
8. **Three operating systems, always** (acta 0018): every node publishes binaries and an installer for macOS (arm64 and x64), Linux (arm64 and x64) and Windows (x64). There are no exceptions or "pending" states; a node missing one of the three does not ship.

## 9. Uninstallation rules

Each product removes only its own directory and its own integration entries.

Engram is a required dependency of Atlas. Therefore, removing Engram while Atlas exists requires this exact explicit confirmation:

```text
REMOVE FORGE614-ENGRAM AND FORGE614-ATLAS
```

That operation removes only:

```text
~/.forge614/engram/
~/.forge614/atlas/
```

It must never remove Shell, Engines, Workers, Hub, Sentinel, the shared parent directory, or unrelated files belonging to the person.

## 10. The run ledger: an explicit exception

The contract forbids a product from creating a **competing progress database** (section 13). The **run ledger** of `forge614-ai`, in `~/.forge614/ai/` over SQLite, is the **explicit exception** to that rule (acta 0011): an immutable event log with derived tables that records what was requested, which worker did it, with which model and reasoning effort, how many tokens, how long it took, what verdict it received, and who approved it. Engram only ever receives **summaries** ("run X: 8 tasks, 8 approved, 190k tokens, decision…"); the run ledger's operational detail never replaces or pollutes Engram's curated memory.

## 11. Required public contracts

No repository may depend on another repository's internal folders.

| Provider | Consumer | Required contract |
|---|---|---|
| Engines | Shell | Detection results, capabilities, read-only change previews and confirmed application/removal operations |
| Engines | Atlas | Available executable engines and safe non-interactive launch capabilities |
| Engram | Shell | Non-interactive memory initialization, status and MCP availability |
| Engram | Atlas | Public TypeScript SDK for projects, sessions, structured memory writes and search |
| Engram | All products | The shared-memory `ecosystem` scope and the portable identity file `.forge614/project.json` (actas 0022 and 0023) |
| Atlas | Shell | Contextualization lifecycle, progress, pause/resume and final report |
| Hub | `forge614-ai` | Package catalog, compatible-version resolution and fingerprints for installation |
| Sentinel | All products | Deterministic verification verdicts and, later, AI-review verdicts on proposed changes |
| Workers | Atlas, `forge614-ai` | JSON input over stdin, NDJSON progress events; token-usage capture pending (acta 0011) |
| `forge614-ai` | All products | Future product discovery, compatible-version resolution, global lifecycle contracts, and the startup hook `forge614 status --directory --json` that reports the current project's identity and status to AI agents |

## 12. Implementation order

No product should implement its final integration before the required public contract exists.

1. `forge614-ai`: define the future core orchestration and product lifecycle contracts, and the run ledger.
2. `forge614-engines`: publish detection, preview and application contracts.
3. `forge614-shell`: implement the single visual initialization experience against those contracts.
4. `forge614-engram`: remove its TUI and assistant ownership while preserving its CLI, MCP, SDK contracts and the `ecosystem` scope.
5. `forge614-atlas`: consume Engines and Engram contracts; report lifecycle to Shell.
6. `forge614-hub`: publish the catalog, lock and fingerprint contract for `forge614-ai`.
7. `forge614-sentinel`: publish its deterministic verification verdicts for all products.
8. Add end-to-end tests for install, `forge614 init`, `forge614 prepare`, setup, update and uninstall across products.

## 13. Cross-cutting rules for every node

These rules are detailed in the Node Standard (`standard/STANDARD.md`) and apply to every product and implementation package in the ecosystem:

- **Single machine contract convention** (acta 0013): one way to speak over stdout and stderr, the same exit codes, and the same NDJSON envelope for every machine command in the ecosystem.
- **Additive evolution** (acta 0024): persisted data and public contracts only get additions; nothing existing is ever renamed, removed or has its meaning changed. What falls out of use is marked obsolete with a `sunset`.
- **Minimal footprint in the AI's context** (acta 0020): everything Forge614 injects at the start of an AI session fits within a verifiable budget; no skill, rule or policy loads in full until it is used.
- **Replaceable pieces as the model evolves** (acta 0021): every package declares whether it compensates for a model limitation, with a scheduled retirement, or whether it is structural.

## 14. Working rule for every repository

Before changing a cross-product behavior, the responsible agent must:

1. Read this contract and the **Node Standard** (`standard/STANDARD.md`), the binding norm that develops it.
2. Read the `CONTRACT.md` of the node it is working on: it is the concrete source of its commands, schemas and error codes.
3. Identify the public contract it consumes or publishes (section 11) and verify that the dependency already exists, or declare it blocked.
4. Follow the new-agent procedure (`standard/procedures/new-agent-checklist.md`) and check the support matrix (`standard/support-matrix.json`) before assuming an assistant is supported.
5. Avoid temporary deep imports, duplicate storage, duplicate detection and duplicate visual flows.
6. Update this contract in `forge614-ai` only when the product decision itself changes; other repositories reference it by pointer (`forge614.node.json`) and never copy it by hand.
