# 04 — Verification and packaging

> Like a factory's final inspection: first every part is reviewed against a fixed list, and only what is approved gets sealed in a box whose seal carries a number.

## What `bun run verify` checks

`bun run verify [--locale es|en] [--today YYYY-MM-DD]` runs in two stages over this repository. First, five steps in order; if one fails, it stops with `VERIFY_STEP_FAILED` and exit `1`:

| Step | Command | What it ensures |
| --- | --- | --- |
| 1 | `bun run typecheck` | Strict TypeScript with no errors |
| 2 | `bun test` | Every test, including the layer test in `tests/architecture/` |
| 3 | `bun run decisions:index --check` | `docs/decisions/INDEX.json` is up to date (`DECISIONS_INDEX_DRIFT` otherwise) |
| 4 | `bun run workflows:check` | Thin, pinned and documented workflows (document 05) |
| 5 | `bun run schemas:generate --check` | `standard/schemas/*.json` equal to the Zod schemas (`SCHEMAS_DRIFT` otherwise) |

Then `runValidators` (`src/app/run-validators.ts`) reads the repository tree (without `node_modules`, `dist`, `.git` or `.superpowers`) and runs the validators. A **validator** is a pure function over that tree that returns findings carrying the identifier of the rule it reports under:

| Rule | Validator | What it checks |
| --- | --- | --- |
| `forge614-rule-package-naming` | `package-naming` | Folders in `standard/rules/`, `standard/packs/` and packages with a manifest under `.agents/` follow `origin-kind-name` |
| `forge614-rule-package-naming` | `rules-catalog` | Valid manifest, name equal to the folder, registered validator, `RULE.md` and `RULE.en.md` present |
| `forge614-rule-package-naming` | `packs-catalog` | Valid `pack.json`, name equal to the folder, listed rules exist |
| `forge614-rule-no-external-product-mentions` | `forbidden-mentions` | No line in the tree contains a term from `standard/forbidden-mentions.json` (except the excluded paths) |
| `forge614-rule-bilingual-docs` | `bilingual-docs` | The `README`, `STANDARD`, `CONTRACT` and ecosystem contract pairs, and every `docs/es/NN-*` with its `docs/en/NN-*`, have the same number of headings (and the same numbering in the four fixed pairs) |
| `forge614-rule-decision-records` | `decision-records` | Consecutive records, valid state, four sections, complete `INDEX.json` and no record deleted |
| `forge614-rule-agent-checklist-impact` | `agent-checklist-impact` | Every completed plan in `.agents/plans/` answers `Sí` or `No` with a reason under `## Impacto en el procedimiento de agentes` |
| `forge614-rule-agent-checklist-impact` | `support-matrix` | `standard/support-matrix.json` is valid and no cell has been in `revalidate` for more than 30 days relative to `--today` |
| `forge614-rule-machine-contracts` | `error-codes` | The codes in `CONTRACT.md` and in every `printError(...)` under `src/` match `^[A-Z][A-Z0-9_]+$` |
| `forge614-rule-machine-contracts` | `ecosystem-contract` | A local copy of `FORGE614_ECOSYSTEM_CONTRACT.md`, if any, is byte-identical to the one in `standard/` |
| `forge614-rule-thin-workflows` | `workflows` | Valid YAML, actions pinned to a 40-hex SHA, `bun run <script>` steps that exist in `package.json`, documented jobs |
| `forge614-rule-context-budget` | `context-budget` | The node pack's index fits in 3,000 tokens (estimate of about 4 characters per token) |

The eight rules without a validator are listed in document 02.

## Report format

The command writes to stderr one line per step (`[verify] <step>: exit N`), one per finding (`[verify] <rule>: <verdict> — <message>`, with each evidence line below it) and the final verdict. To stdout it writes a single `VerifyReport` object:

```json
{
  "schemaVersion": 1,
  "standard": "1.0.0",
  "verdict": "pass",
  "checks": [
    {
      "ruleId": "forge614-rule-bilingual-docs",
      "verdict": "pass",
      "evidence": [],
      "messageKey": "docsParityOk",
      "params": {},
      "message": { "es": "Documentación bilingüe con paridad.", "en": "Bilingual documentation with parity." }
    }
  ]
}
```

`verdict` is `pass`, `caution` or `fail`, and the overall one is the worst of the findings. `--locale` only changes the language of the stderr lines: `message` always carries both languages, taken from the typed catalog in `src/modules/standard/messages/`.

## Exit codes

| Exit | Situation | `code` on stderr |
| --- | --- | --- |
| `0` | Every step and validator in `pass` | — |
| `1` | A step failed | `VERIFY_STEP_FAILED` |
| `1` | The overall verdict is not `pass` (`caution` or `fail`); the report is still printed to stdout | — |
| `2` | Invalid argument: `--today` not in `YYYY-MM-DD` format, `--locale` other than `es`/`en`, unknown flag with a value (the parser reads `--key value` pairs) | `INVALID_ARGS` |

## `standard:pack` and `SHA256SUMS`

`bun run standard:pack` packs `standard/` **reproducibly**: the same files produce the same bytes on Linux, macOS and Windows and, therefore, the same fingerprint. It achieves this without the system's `tar` or `gzip`: the archive is built in memory with TypeScript code from this repository.

| Piece | Where | What it pins |
| --- | --- | --- |
| ustar (POSIX) writer | `src/modules/standard/tar.ts` | `uid` and `gid` 0, empty owner names, `mtime` 0; mode derived from content and never from disk: directory `0755`, file starting with `#!` `0755`, any other `0644` |
| Member order | `src/app/pack-standard.ts` (`collectTarEntries`) | Depth-first walk with each directory's children sorted by name, independent of the filesystem's order; hidden files are skipped |
| Compression | `src/infrastructure/compression.ts` | Raw DEFLATE, level 9, with the zlib bundled in Bun |
| gzip container | `src/modules/standard/gzip.ts` | Constant 10-byte header (`mtime` 0, XFL 2, OS 3) and its own CRC32 |

Before packing, the command runs the same validators as `verify`; if any fails, it exits with `STANDARD_INVALID` and produces nothing. If they pass, it writes into `dist/` (ignored by Git):

| File | Contents |
| --- | --- |
| `dist/standard-<VERSION>.tar.gz` | The archive; `<VERSION>` comes from `standard/VERSION` |
| `dist/SHA256SUMS` | One line `<sha256>  standard-<VERSION>.tar.gz` |
| `dist/pack-manifest.json` | Token estimate (record 0020): for each rule in the pack, `tokens` of its full `RULE.md`, and `packIndex.tokens` of the one-line-per-rule index; every entry carries `estimate: true`, and no manifest in `standard/rules/` is modified |

It prints `{ schemaVersion: 1, version, archive, sha256, entries }`. Two flags:

- `--update-pointer`: additionally rewrites `standard.sha256` in `forge614.node.json`, validating the pointer before and after with `NodePointerSchema`. That pointer is the **committed truth**: today it is the fingerprint `standard:pack --check` compares against, and the one every node copies when pinning its version; each node's verifier, planned for phase 0.2, will compare it against the published archive (record 0009).
- `--check`: packs into a temporary directory, compares the fresh fingerprint with the pointer's and, when present, with `dist/SHA256SUMS`; prints `{ schemaVersion: 1, ok: true, sha256, pointerChecked: true, sumsChecked }` or fails with `STANDARD_PACK_DRIFT`. Running it in CI on the three operating systems (`parity` job, document 05) is the parity proof: if the bytes changed on any platform, the fingerprint would stop matching the pointer. The `standard:check` script, the alias of `standard:pack --check` that job invokes, arrives together with this repository's workflows (phase 0.1); today it is not in `package.json`.

| Exit | `code` | Situation |
| --- | --- | --- |
| `0` | — | Archive written, or `--check` without drift |
| `1` | `STANDARD_INVALID` | Some validator fails before packing |
| `1` | `STANDARD_PACK_DRIFT` | `--check`: the fresh fingerprint does not match the pointer or `dist/SHA256SUMS` |
| `1` | `STANDARD_PACK_FAILED` | Unexpected read or write error; the message leaves in the envelope, never as a stack trace |
| `2` | `INVALID_ARGUMENTS` | Unknown flag or positional argument |

## Relation to `forge614-sentinel check`

Sentinel is the node that judges and never does (record 0007): it receives something and returns `pass`, `caution` or `fail` with evidence. The validators in this repository are its first layer, the one that uses no AI: pure functions over a file tree that return findings with rule, verdict and evidence. Today they run only here, through `bun run verify`. `forge614-sentinel check`, which will run these same checks on any repository in the ecosystem by reading its `forge614.node.json`, arrives in phase 0.2 and does not exist in this tree.
