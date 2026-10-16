# 05 — Integration and release workflows

> Like a flight's checklist: every step is written down, runs the same on the ground (local) as in the air (CI), and no one takes off without completing it.

A **workflow** is a YAML file in `.github/workflows/` that continuous integration (CI) runs on an event; a **job** is each unit of work inside it, with its own machine. In this repository the workflows are thin (record 0019): every `run` step calls a `package.json` script, while `uses` steps configure pinned actions; `bun run workflows:run` reproduces the CI `run` commands locally. `verify.yml` starts from `standard/templates/verify.yml` and adds its own `parity` job; `release.yml` starts from its template with publication steps adapted for this repository.

## `verify.yml`

| Job | Trigger | What it runs | What it validates | Expected duration |
| --- | --- | --- | --- | --- |
| `verify` | push to `main`, pull request | Node 22.19.0, `bun install --frozen-lockfile`, `bun run verify` on `ubuntu-24.04` | typecheck, tests, decisions index, workflows, schemas, Notion map and standard validators (document 04) | ~4 min |
| `parity` | push to `main`, pull request | `bun install --frozen-lockfile`, Node 22.19.0 through `actions/setup-node`, `bun run installer:e2e` and `bun run standard:check` on the matrix `ubuntu-24.04`, `macos-15`, `windows-2025` | end-to-end installer and platform gatekeepers, plus the standard archive fingerprint against `forge614.node.json` | ~5 min per system |

`standard:check` is the script alias of `bun run standard:pack --check` (document 04); the workflows validator only accepts `bun run <script>` steps without arguments, which is why the job does not invoke the flag directly. Every job declares `timeout-minutes` (`verify` and `parity`: 10; `build`: 20; `publish`: 10; `standard-release`: 10): no stage runs without a limit and `workflows:check` rejects a job that lacks it. The `parity` matrix declares `fail-fast: false`: if one system fails, the other two finish and report their own result, so a parity failure shows all three verdicts instead of cancelling the ones still running.

## `release.yml`

| Job | Trigger | What it runs | What it publishes | Expected duration |
| --- | --- | --- | --- | --- |
| `build` | tag `v*` | `bun install --frozen-lockfile`, `bun run build:target`, `bun run smoke:target` on macOS arm64/x64, Linux arm64/x64, Windows x64 | per-platform programs (`dist/release/*`) | ~8 min |
| `publish` | after `build` | downloads artifacts, runs `bun install --frozen-lockfile` and `bun run release:publish` on Ubuntu | nothing yet: the stub exits with `NOT_IMPLEMENTED` | ~1 min |

`build:target`, `smoke:target` and `release:publish` are stubs: `package.json` scripts that end with `NOT_IMPLEMENTED` until the shared `bun release` arrives in phase 0.4. This repository's `release.yml` does not set up Node or run `prepare-release-assets.mjs`; its `publish` job downloads the artifacts and calls the `release:publish` stub. A `v*` tag therefore fails deliberately: the three scripts call `src/interfaces/cli/not-implemented.ts`, which exits with `1` and that code.

**Node template:** `standard/templates/release.yml` sets up Node 22.19.0, downloads the artifacts, installs dependencies, runs `bun run scripts/prepare-release-assets.mjs`, and then runs `bun run release:publish`. The preparation script, copied from `standard/templates/prepare-release-assets.mjs`, reads the version from `package.json`, stages the common assets and creates one GNU `SHA256SUMS` file before publishing.

**Template `release.yml` precondition:** a node with `file:../` dependencies to sibling repositories in its `package.json` cannot adopt it; the workflow checks out a single repository, so `bun install --frozen-lockfile` would fail against that path dependency. Replace it with the published version of the sibling node before adopting the template.

## `standard-release.yml`

| Job | Trigger | What it runs | What it publishes | Expected duration |
| --- | --- | --- | --- | --- |
| `standard-release` | tag `standard-v*` | `bun install --frozen-lockfile`, `bun run standard:check`, `bun run standard:release` on `ubuntu-24.04` (the step receives the workflow token via `GH_TOKEN: ${{ github.token }}`) | GitHub release with `standard-<version>.tar.gz`, `SHA256SUMS` and `pack-manifest.json`; the tag must match `standard/VERSION` and the pointer must match the tree | ~2 min |

It is the minimum publication mechanism for the standard (phase 0.2 spec, §5.1): Sentinel downloads that release's package and checks its fingerprint. An existing release is not replaced: publishing the same version twice fails.

## Validating before integrating

`bun run workflows:check` reads every YAML in `.github/workflows/`, validates it against `WorkflowSchema` (unknown fields are an error and `timeout-minutes` is mandatory in every job), requires every `uses` to be pinned to a 40-character hexadecimal SHA, every `run` to be `bun install --frozen-lockfile`, `bun test` or `bun run <script>` with a script that exists in `package.json`, and every job to appear in the first column of the tables in this document (it looks for the rows under a header starting with `| Job |`). It prints `{ schemaVersion: 1, verdict, findings }` and exits with `1` if the verdict is not `pass`. It is part of `bun run verify`. With no files in `.github/workflows/` it reports `pass` with "no workflows to validate".

## Running locally

`bun run workflows:run --workflow verify` reads `.github/workflows/verify.yml` and runs, job by job and in order, every `run` step; it stops at the first failing step of a job and prints `{ schemaVersion: 1, workflow, jobs: [{ job, steps: [{ run, exitCode }] }], ok }`, with exit `1` if anything failed and `WORKFLOW_NOT_FOUND` if the file does not exist. The `pre-push` hook (document 03) does this automatically. Locally the `parity` job runs only once, on the machine's operating system; the three-system matrix exists only in CI.

## Pinned actions

| Action | Version | SHA |
| --- | --- | --- |
| actions/checkout | v4.3.1 | 34e114876b0b11c390a56381ad16ebd13914f8d5 |
| oven-sh/setup-bun | v2.0.2 | 735343b667d3e6f658f44d0eca948eb6282f2b76 |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| actions/upload-artifact | v4.6.2 | ea165f8d65b6e75b540449e92b4886f43607fa02 |
| actions/download-artifact | v4.3.0 | d3f86a106a0bac45b974a628896c90dbdf5c8093 |
