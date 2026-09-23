# Delivery 0 · Phase 0.2 — The `forge614-sentinel` verifier (design)

**Date:** 2026-09-23 · **Status:** approved by the product owner on 2026-09-23 · **Session:** forge614-ai-2026-09-22-fase-0-1-tarea-10-b
**Preceded by:** the Delivery 0 spec (`2026-09-22-entrega-0-estandar-de-nodo-design.md`, §5 and §6) and phase 0.1 closed (standard 1.0.0, sha256 `18d4455f…`).
**Governing records:** 0005, 0009, 0012, 0013, 0017, 0018, 0019, 0020, 0021, 0022, 0023, 0024, 0025, 0026.

> Like a municipal inspector: arrives with the current rulebook under one arm, inspects the building, hands over a report with what complies and what does not, and leaves. It does not build, does not repair, does not decide what to do with the report.

## 1. Purpose

Take the Node Standard checks out of the inside of `forge614-ai` and turn them into an independent program, `forge614-sentinel`, that reviews any repository in the ecosystem against the rulebook that repository declares, with the same result on Linux, macOS and Windows. Sentinel **judges, never acts**.

## 2. Design decisions made with the product owner (2026-09-23)

| # | Decision | Alternative discarded |
|---|---|---|
| D1 | All check logic lives in Sentinel. `forge614-ai` stops having validators and its `verify` calls Sentinel like any other node. | Checks inside the standard package executed by Sentinel (downloaded code executed by a binary); duplicating in both repos. |
| D2 | Pragmatic publishing: `forge614-ai` publishes the rulebook with a minimal workflow (tag `standard-v<versión>`); Sentinel copies the binary release flow proven in Engram. Phase 0.4 extracts it into the shared `bun release`. | Building the shared release package first. |
| D3 | Internal first, door left open: 0.1 reviews only repositories with `forge614.node.json`. The rulebook's origin is data (location + fingerprint), checks take their parameters from the rulebook and the pack decides what runs, so that third-party rulebooks are a future delivery that adds, not one that rewrites. | Designing for third parties from 0.1. |
| D4 | Sentinel is mandatory for developing ecosystem nodes and optional for third-party products built with the ecosystem. One node, two levels of obligation, decided by the identity files. | Two nodes. |
| D5 | Two versions within the phase: 0.1 with 19 checks; 0.2 with the 3 that require code analysis or executing the node. | All 22 in one version. |
| D6 | User rules (project, group, shared) will live in Engram like memory: a new table, the same scopes, local search with FTS5, scoring by usage; Engram materializes `.forge614/rules.json` (generated, versioned) only for Sentinel and CI. Outside this phase. | Rule repositories and URLs configured by the person; Sentinel reading the database. |
| D7 | Without Sentinel installed on the machine of whoever develops a node, `verify` fails with the installation message. In CI it is installed from the release. | Warn and continue; install on its own. |

## 3. Scope

### 3.1 In scope (Sentinel 0.1)

- Repository `forge614-sentinel` created from the standard 1.0.0 templates (`standard:render --node sentinel`), with layers, contracts, workflows, hook, branch protection, node contract and bilingual documentation.
- Command `forge614-sentinel check` with the report of §6 and the errors of §7.
- Subcommand `forge614-sentinel standard fetch [<versión>]`.
- Fetching, verification and local cache of the rulebook (§5).
- 19 checks (§8): 11 moved over from `forge614-ai` and 8 new ones (5 file-reading and 3 comparing against templates and versions). The original rulebook (Delivery 0 spec §6.2) listed 19 identifiers; three of the existing checks (`package-naming`, `error-codes`, `rules-catalog`) keep their own identifier, which is why the total with 0.2 is 22.
- Binary release for 5 platforms with Bun 1.4.2 and the template installer (§10).
- Self-verification: Sentinel's `verify` runs its own `check`.
- In `forge614-ai`: minimal rulebook publishing workflow (§5.1); adoption of Sentinel in `verify` and retirement of the validators (§9.2); standard 1.1.0 with the updated verification template.

### 3.2 In scope (Sentinel 0.2)

- `import-rules` over any repository (code analysis, not just text).
- `boundaries-zod`.
- `machine-contracts` (runs the node's `--help`/`--version` with a timeout and validates error envelopes).

### 3.3 Out of scope (on purpose)

- User rules in Engram and reading `.forge614/rules.json` (an Engram delivery after 1.6.0; Sentinel will read them in a following version).
- Third-party rulebooks and extensions with their own code (they will require a record for security reasons).
- Review with AI (Delivery 2), scanning of Hub packages (Delivery 1).
- Fixing automatically; writing into the reviewed repository.
- Incremental review (changed files only).
- Shared `bun release` package (phase 0.4).

## 4. Repository types and level of obligation

Sentinel decides what to do only by identity files, never by folder names, proximity on disk or Git remotes (record 0023):

| Situation | How it is recognized | What Sentinel does |
|---|---|---|
| Ecosystem node | A valid `forge614.node.json` exists | Full review against the declared rulebook. Mandatory: the node's `verify` invokes it. |
| Third-party project with Forge614 | `.forge614/project.json` exists and there is no `forge614.node.json` | Reports `{ applicable: false, reason: "external-project" }` and exits `0`. Optional; third-party rulebooks in a future delivery. |
| Any other folder | Neither of the two | Reports `{ applicable: false, reason: "not-a-forge614-repo" }` and exits `0`. Reviews nothing. |

## 5. The rulebook: origin, verification and cache

### 5.1 Publishing in `forge614-ai`

Workflow `standard-release.yml` (thin, record 0019; documented in `docs/*/05-workflows.md`): trigger `push` of tag `standard-v*`; steps `bun install --frozen-lockfile`, `bun run standard:check` (the pointer must match), `bun run standard:release` (new script that verifies the tag matches `standard/VERSION`, builds `dist/` and publishes a GitHub release with `standard-<versión>.tar.gz`, `SHA256SUMS` and `pack-manifest.json`; uses `gh` with the workflow token; code `STANDARD_RELEASE_FAILED`). `timeout-minutes` mandatory. The release is immutable: republishing the same version fails.

### 5.2 Origin of the rulebook in Sentinel

`StandardSource = { kind: "github-release", repository: "jotredev/forge614-ai", version, sha256 }`. In 0.1 the `repository` is fixed and only the version and the fingerprint come from the reviewed repo; the shape is defined as data so that a future delivery can admit other origins without changing the engine.

### 5.3 Version to use

The one declared by the reviewed repository's `forge614.node.json` (`standard.version` and `standard.sha256`). `--standard <versión>` forces another one and the report marks it (`standardForced: true`). Sentinel never picks a version on its own nor "the newest one".

### 5.4 Local cache

`<FORGE614_HOME o ~/.forge614>/standard/<versión>/` with the extracted tarball contents and a `manifest.json` file (`{ schemaVersion: 1, version, sha256, fetchedAt }`). Atomic write (extract into a temporary folder and rename). Before accepting a tarball its sha256 is checked against the requested fingerprint; if it does not match → `STANDARD_CORRUPT` and nothing is saved.

### 5.5 Without network

With a cache of the requested version, the review uses no network. Without cache and without network → `STANDARD_UNAVAILABLE` with the command to obtain it (`forge614-sentinel standard fetch <versión>`). It never reviews with another version "by approximation".

### 5.6 Cross-checked fingerprint

The `node-pointer` check compares the repo's `standard.sha256` with the sha256 of the tarball in the cache for that version. If they differ, `fail`: either the pointer was edited by hand or the release changed.

### 5.7 Rulebook newer than Sentinel

If the pack asks for a `validator` that this version of Sentinel does not implement, the check comes out `caution` with `SENTINEL_OUTDATED` in the evidence and the message "update Sentinel". It is never skipped silently and no result is ever invented.

## 6. Interface

```
forge614-sentinel check [--repo <ruta>] [--standard <versión>] [--only <id,id>] [--strict] [--json]
forge614-sentinel standard fetch [<versión>] [--json]
forge614-sentinel --help | --version
```

- Without `--json` and with a TTY: readable summary on stderr and the full JSON on stdout (a single object; record 0013). With `--json` or without a TTY: only the JSON.
- Output of `check` (contract `CheckReport`, `schemaVersion: 1`):

```json
{
  "schemaVersion": 1,
  "sentinel": "0.1.0",
  "standard": { "version": "1.0.0", "sha256": "…", "forced": false, "fetched": false },
  "repository": { "kind": "node", "name": "engram" },
  "verdict": "pass | caution | fail",
  "checks": [
    { "id": "docs-parity", "verdict": "pass | caution | fail | not-applicable",
      "applied": true, "evidence": ["docs/es/03-x.md: 5 headings vs docs/en/03-x.md: 4"],
      "message": { "es": "…", "en": "…" } }
  ],
  "durationMs": 812
}
```

- Global `verdict` = the worst of the applied `checks` (`not-applicable` does not count).
- Exit codes: `0` pass; `0` caution (`1` with `--strict`); `1` fail; `2` incorrect usage. A non-applicable repository (§4) returns `{ schemaVersion: 1, applicable: false, reason }` and exits `0`.
- `applied` feeds the rule scoring (D6): which rules were applied and which failed in each review.
- The contract evolves additively (record 0024): new optional fields; never rename or remove.

## 7. Errors (envelope `{ schemaVersion: 1, code, error }` on stderr, without absolute paths)

| Code | When | Exit |
|---|---|---|
| `INVALID_ARGUMENTS` | unknown flag, invalid value, `--only` with a nonexistent id | 2 |
| `NODE_POINTER_INVALID` | `forge614.node.json` does not comply with `NodePointerSchema` | 2 |
| `STANDARD_UNAVAILABLE` | no cache of the version and no network | 1 |
| `STANDARD_CORRUPT` | tarball fingerprint different from the requested one | 1 |
| `STANDARD_FETCH_FAILED` | network or release error while downloading | 1 |
| `CHECK_FAILED` | unexpected exception inside a check (it is reported and the others continue; the global verdict is `fail`) | 1 |
| `SENTINEL_FAILED` | unexpected error outside the checks | 1 |

## 8. Checks

Each check is a pure module `modules/checks/<id>.ts` with the signature `run(snapshot: RepoSnapshot, params: CheckParams): CheckResult`, without I/O, with messages in the typed es/en catalog (parity enforced by the compiler) and its fixtures in `fixtures/<id>/{pass,fail}/`. The parameters come from the rulebook (manifests, pack, `forbidden-mentions.json`, `support-matrix.json`, templates), never from constants in the code. Each check declares `appliesWhen`; if it does not apply, it returns `not-applicable`.

### 8.1 Moved over from `forge614-ai` (11)

`package-naming`, `forbidden-mentions`, `docs-parity` (today `bilingual-docs`), `decisions`, `agent-checklist-impact`, `error-codes` (today part of `machine-contracts`; in Sentinel it keeps its own id), `support-matrix`, `workflows`, `context-budget`, `ecosystem-contract`, `rules-catalog` + `packs-catalog` (merged as `rules-catalog`). They are moved over with their tests and adapted to `RepoSnapshot` and `CheckParams`; the observable behavior does not change (same evidence).

### 8.2 New in 0.1 (5 reading + 3 comparison)

| Id | What it checks | Rulebook parameters |
|---|---|---|
| `node-pointer` | `forge614.node.json` valid; `standard.sha256` equal to that of the tarball in the cache | `node-pointer.schema.json` |
| `layout` | mandatory folders and files of STANDARD §2 present (`src/{modules,app,infrastructure,interfaces}`, `docs/es`, `docs/en`, `docs/decisions`, `CONTRACT.md`, `README.md`, `.github/workflows`, `.githooks/pre-push`, `.agents/templates/plan.md`); no `scripts/` that duplicate templates | list in `standard/layout.json` (new file in standard 1.1.0; in 1.0.0 Sentinel uses the embedded list and states so in the evidence) |
| `stack` | `tsconfig.json` with the flags of STANDARD §3 (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, …); no `any`, `@ts-ignore`, `@ts-expect-error` in `src/` (tests excluded); `bun.lock` present; `package.json` with `engines.bun` ≥ the minimum of record 0026 | STANDARD §3 |
| `secrets-hygiene` | secret patterns absent from the tree (PEM private keys, tokens with known prefixes, `AKIA…`, `ghp_…`, connection strings with credentials, `.env` with values); excludes declared fixtures | list of patterns in the standard (`standard/secret-patterns.json`, new in 1.1.0; embedded in 1.0.0) |
| `node-contract` | `CONTRACT.md` and `.en.md` present with parity; every command in the table exists as a script in `package.json`; every error code in the table appears in `src/interfaces/cli`; and vice versa | `CONTRACT.md` template |
| `installer` | `install.sh` and `install.ps1` byte-identical to the template rendered with the node's variables (`NODE_NAME`, `REPO`, `STANDARD_VERSION`); only `forge614-ai` is exempt | templates + minimal `render` in Sentinel |
| `release` | `verify.yml` and `release.yml` identical to the template except for permitted added jobs; actions pinned by SHA; `CHANGELOG.md` present | templates |
| `versions` | `package.json.version` = highest `v*` tag (if any) = `docs/notion-map.json.productVersion`; `--version` is not executed in 0.1 (left for `machine-contracts`) | — |

### 8.3 For 0.2 (3)

`import-rules` (layers by code analysis with the same criterion as `tests/architecture/import-rules.test.ts`, including dynamic and side-effect imports), `boundaries-zod` (every external entry point goes through a `.strict()` schema), `machine-contracts` (runs `--help`/`--version` with a timeout, validates error envelopes and `schemaVersion`).

## 9. Integration

### 9.1 In each node

- The node's `verify` script runs, in addition to its own work, `forge614-sentinel check --json` and fails if the verdict is `fail`. If the binary is not there: message `SENTINEL_NOT_INSTALLED` with the installation command (D7).
- `verify.yml` template (standard 1.1.0): step `bun run sentinel:install` (repo script that downloads the pinned Sentinel release per platform and verifies `SHA256SUMS`) before `bun run verify`. The Sentinel version is pinned in `forge614.node.json` (`sentinel.version`, new optional field; additive).

### 9.2 In `forge614-ai`

Circular bootstrap sequence (human review until Sentinel 0.1 exists):

1. `forge614-ai` publishes rulebook 1.0.0 (tag `standard-v1.0.0`) with the workflow of §5.1.
2. Sentinel is built from the 1.0.0 templates; its PRs pass its own `verify` (typecheck, tests) and independent review.
3. Sentinel 0.1 reviews itself with its `check`, passes, and is published.
4. `forge614-ai` adopts Sentinel in `verify`, deletes `src/modules/validators/` and `src/app/run-validators.ts`, keeps `standard:render`, `standard:pack`, `schemas:generate`, `decisions:index`, `notion-map:build`, and publishes standard 1.1.0 (`verify.yml` template with Sentinel, `layout.json`, `secret-patterns.json`, clarification of record 0024 in the additive evolution rule, `BRANCH_PROTECTION` already updated).
5. The nodes adopt Sentinel in their next release (phase 0.4).

A node may declare 1.0.0 while Sentinel already knows 1.1.0: Sentinel reviews with the declared version and adds `standard.latestKnown` to the report.

## 10. Publishing and installing Sentinel

- Repository `jotredev/forge614-sentinel`, initial version `0.1.0`, Bun 1.4.2 (record 0026), three operating systems (record 0018).
- Template `release.yml` with `build:target` (compiles `bun build --compile` per target), `smoke:target` (runs the binary with `--version` and `--help`, and `check` over a fixture), `release:publish` (gathers artifacts, generates `SHA256SUMS`, publishes the release with `install.sh`). Implemented as real scripts in the Sentinel repo, copying the flow proven in Engram and designed to be extracted in phase 0.4.
- Template installer unchanged: `~/.forge614/sentinel/<versión>/`, fingerprint verified, symmetric `--uninstall`, `install.ps1` for Windows.

## 11. Sentinel's internal architecture

```
src/
├── modules/           pure: checks/<id>.ts, es/en message catalog, Zod schemas (CheckReport, StandardManifest, CheckParams), RepoSnapshot (tree + facts)
├── infrastructure/    tree reading, Git data (tags, log, modes), network (release download), cache, tar.gz extraction (own ustar reader + gunzip from fflate; same format forge614-ai produces)
├── app/               takeSnapshot, loadStandard, runChecks (selection by pack and appliesWhen, parallelism), buildReport, fetchStandard
└── interfaces/cli/    check.ts, standard-fetch.ts, version/help, error envelopes
```

Rules: the standard's layers; Zod `.strict()` on every boundary (argv, `forge614.node.json`, cache `manifest.json`, `pack.json`, rule manifests, YAML); no network during `runChecks`; no writing into the reviewed repo; identifiers and comments in English; tests next to the code; fixtures in `fixtures/`; performance target: reviewing an ecosystem node in under 5 s (e2e test with a cap).

## 12. Tests

- Unit tests per check with pass/fail fixtures (verdict, evidence, es/en messages).
- E2E with the binary: correct node (`pass`), node with known failures (`fail` with exact evidence), unrelated folder (`applicable: false`, exit `0`), third-party project (`applicable: false`, `external-project`), no cache and no network (`STANDARD_UNAVAILABLE`, with simulated network turned off), tarball with a tampered fingerprint (`STANDARD_CORRUPT`), `--only`, `--strict`, forced `--standard`.
- Parity: the same report (without `durationMs`) byte for byte on ubuntu, macOS and Windows over the same fixture.
- Self-verification in `verify`.
- Performance: 5 s cap in e2e.
- No check returns `pass` for not knowing: `not-applicable` or `caution` with a reason.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Circular bootstrap Sentinel ↔ forge614-ai | Sequence of §9.2 with human review; forge614-ai does not delete its validators until it passes `check` with Sentinel published. |
| False positives in `installer`/`release` due to legitimate differences | Comparison against the template rendered with the node's variables; explicit list of permitted deviations (added jobs) in the rulebook; evidence with a line diff. |
| Rulebook newer than Sentinel | `caution` + `SENTINEL_OUTDATED`, never silence. |
| Download from GitHub in CI without a token | Public releases; `sentinel:install` verifies `SHA256SUMS`; without a token there is no writing. |
| Performance with large repos | Snapshot taken once; checks in parallel; incremental as a later goal. |

## 14. Definition of done for phase 0.2

- Sentinel 0.1 published (5 platforms), installable with the template, `check` green over itself and over `forge614-ai`.
- `forge614-ai` without its own validators, `verify` with Sentinel, standard 1.1.0 published as a release.
- Sentinel 0.2 published with the 3 remaining checks; 22 in total.
- Report parity on three systems proven in CI.
- Sentinel's bilingual documentation (00 summary, 01 checks, 02 rulebook and cache, 03 integration, 04 workflows) and `CONTRACT.md`.
