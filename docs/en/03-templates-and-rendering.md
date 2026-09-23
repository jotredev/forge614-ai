# 03 — Templates and rendering

> Like a pastry mold: the shape is always the same and only the name written on top of each piece changes.

## Variables

A **template** is a file in `standard/templates/` with `{{NAME}}` placeholders that the renderer substitutes. `renderTemplate` (`src/modules/standard/template.ts`) replaces every placeholder and fails with `unresolved placeholders: …` if any is left without a value, so a template never comes out half done. There are exactly five variables (`NodeVars`, in `src/app/render-templates.ts`):

| Variable | Source in `standard:render` | Example |
| --- | --- | --- |
| `NODE_NAME` | `--node` (required; pattern `[a-z0-9-]+`) | `engram` |
| `NODE_TITLE` | `--title` (optional; defaults to `NODE_NAME`) | `Engram` |
| `REPO` | `--repo owner/repo` (optional; defaults to `jotredev/forge614-<node>`) | `jotredev/forge614-engram` |
| `ASSET_PREFIX` | Fixed: `forge614-<node>` | `forge614-engram` |
| `STANDARD_VERSION` | `standard/VERSION` | `1.0.0` |

## Destination of each template

`bun run standard:render --node <name> --out <dir> [--repo owner/repo] [--title Title]` writes the following fifteen files into `<dir>` (the `DESTINATIONS` list), atomically; `install.sh` and `.githooks/pre-push` are made executable (`0755`). It prints `{ schemaVersion: 1, node, out, written }` and exits with `2` and `INVALID_ARGUMENTS` when `--node` or `--out` is missing, when a value does not match its pattern, or when an unknown flag with a value appears (the parser reads `--key value` pairs).

| Template | Destination in the node | Purpose |
| --- | --- | --- |
| `install.sh` | `install.sh` | macOS/Linux installer: downloads the release over HTTPS, checks the fingerprint against `SHA256SUMS`, installs under `~/.forge614/<node>/` (or `FORGE614_HOME`) with the launcher `bin/forge614-<node>`; accepts `--version`, `--archive` and `--uninstall` |
| `install.ps1` | `install.ps1` | Windows installer with the same logic |
| `verify.yml` | `.github/workflows/verify.yml` | Verification CI (document 05) |
| `release.yml` | `.github/workflows/release.yml` | Tag-driven release CI on five targets (document 05) |
| `CONTRACT.md`, `CONTRACT.en.md` | Root | Node contract with the standard's fixed sections |
| `README.md`, `README.en.md` | Root | Bilingual README with analogy, installation and documentation table |
| `decision.md` | `docs/decisions/TEMPLATE.md` | Decision record template |
| `plan.md` | `.agents/templates/plan.md` | Plan template, with the mandatory section `## Impacto en el procedimiento de agentes` (record 0017) |
| `hooks/pre-push` | `.githooks/pre-push` | Hook that runs `bun run workflows:run --workflow verify` |
| `BRANCH_PROTECTION.md`, `BRANCH_PROTECTION.en.md` | Root | Exact protection configuration for `main` |
| `docs-workflows.md`, `docs-workflows.en.md` | `docs/es/NN-workflows.md`, `docs/en/NN-workflows.md` | Workflow documentation (document 05) |

## How a node adopts the templates

1. Render into a separate directory: `bun run standard:render --node <name> --out /tmp/<name>-files --repo <owner>/<repo> --title <Title>`.
2. Copy the files into the node's repository. `NN` in `docs/*/NN-workflows.md` is a number placeholder: the node replaces it with the next free number in its documentation (the workflows validator looks for `docs/es/[0-9][0-9]-workflows.md`).
3. Review the diff: the `<completar>` marks in `README.md` and `CONTRACT.md` are filled in by hand; the rest is not edited, because the next version of the standard is rendered over it again.
4. Commit. A person manages the history: Git is read-only for AI agents (rule `forge614-rule-git-readonly-for-agents`).

## `pre-push` hook and `BRANCH_PROTECTION.md`

The **`pre-push` hook** (`.githooks/pre-push`) is enabled with `git config core.hooksPath .githooks` and runs `bun run workflows:run --workflow verify` before publishing a branch: the same scripts, in the same order, as the `verify` job in CI. `BRANCH_PROTECTION.md` (and its English twin) describes the exact configuration the `main` branch must have: a mandatory pull request with at least one approval and stale approvals dismissed, the `verify` status check required and up to date with the base, no direct push, force push or deletion, linear history and commit signatures recommended (record 0019).
