# 05 — Integration and release workflows

> Like a flight's checklist: every step is written down, runs the same on the ground (local) as in the air (CI), and no one takes off without completing it.

A **workflow** is a YAML file in `.github/workflows/` that continuous integration (CI) runs on an event; a **job** is each unit of work inside it, with its own machine. In this repository the workflows are thin (record 0019): every step calls a `package.json` script, so `bun run workflows:run` reproduces locally exactly what runs in CI. Both files are generated from `standard/templates/verify.yml` and `release.yml`; `verify.yml` adds one job of its own, `parity`, that the template does not carry.

## `verify.yml`

| Job | Trigger | What it runs | What it validates | Expected duration |
| --- | --- | --- | --- | --- |
| `verify` | push to `main`, pull request | `bun install --frozen-lockfile`, `bun run verify` on `ubuntu-24.04` | typecheck, tests, decisions index, workflows, schemas and standard validators (document 04) | ~3 min |
| `parity` | push to `main`, pull request | `bun install --frozen-lockfile`, `bun run standard:check` on the matrix `ubuntu-24.04`, `macos-15`, `windows-2025` | that the standard archive has, on the three operating systems, the same fingerprint as `forge614.node.json`: the bytes are identical on Linux, macOS and Windows (record 0018) | ~2 min per system |

`standard:check` is the script alias of `bun run standard:pack --check` (document 04); the workflows validator only accepts `bun run <script>` steps without arguments, which is why the job does not invoke the flag directly.

## `release.yml`

| Job | Trigger | What it runs | What it publishes | Expected duration |
| --- | --- | --- | --- | --- |
| `build` | tag `v*` | `bun install --frozen-lockfile`, `bun run build:target`, `bun run smoke:target` on macOS arm64/x64, Linux arm64/x64, Windows x64 | per-platform artifacts (`dist/release/*`) | ~8 min |
| `publish` | after `build` | `bun install --frozen-lockfile`, `bun run release:publish` | release with binaries and `SHA256SUMS` | ~1 min |

`build:target`, `smoke:target` and `release:publish` are stubs: `package.json` scripts that end with `NOT_IMPLEMENTED` until the shared `bun release` arrives in phase 0.4. Until then a `v*` tag fails deliberately: the three scripts call `src/interfaces/cli/not-implemented.ts`, which exits with `1` and that code.

**Precondition of `release.yml`:** a node with `file:../` dependencies to sibling repositories in its `package.json` cannot adopt this template; the workflow checks out a single repository, so `bun install --frozen-lockfile` would fail against that path dependency. Replace it with the published version of the sibling node before adopting the template.

## Validating before integrating

`bun run workflows:check` reads every YAML in `.github/workflows/`, validates it against `WorkflowSchema` (unknown fields are an error), requires every `uses` to be pinned to a 40-character hexadecimal SHA, every `run` to be `bun install --frozen-lockfile`, `bun test` or `bun run <script>` with a script that exists in `package.json`, and every job to appear in the first column of the tables in this document (it looks for the rows under a header starting with `| Job |`). It prints `{ schemaVersion: 1, verdict, findings }` and exits with `1` if the verdict is not `pass`. It is part of `bun run verify`. With no files in `.github/workflows/` it reports `pass` with "no workflows to validate".

## Running locally

`bun run workflows:run --workflow verify` reads `.github/workflows/verify.yml` and runs, job by job and in order, every `run` step; it stops at the first failing step of a job and prints `{ schemaVersion: 1, workflow, jobs: [{ job, steps: [{ run, exitCode }] }], ok }`, with exit `1` if anything failed and `WORKFLOW_NOT_FOUND` if the file does not exist. The `pre-push` hook (document 03) does this automatically. Locally the `parity` job runs only once, on the machine's operating system; the three-system matrix exists only in CI.

## Pinned actions

| Action | Version | SHA |
| --- | --- | --- |
| actions/checkout | v4.3.1 | 34e114876b0b11c390a56381ad16ebd13914f8d5 |
| oven-sh/setup-bun | v2.0.2 | 735343b667d3e6f658f44d0eca948eb6282f2b76 |
| actions/upload-artifact | v4.6.2 | ea165f8d65b6e75b540449e92b4886f43607fa02 |
| actions/download-artifact | v4.3.0 | d3f86a106a0bac45b974a628896c90dbdf5c8093 |
