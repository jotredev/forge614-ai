# 02 — Rules and packs

> Like the rules of a library: each rule is a card with its number, its text in two languages and who reviews it; the pack is the file box that gathers the cards that apply to one room.

## Anatomy of a rule

A **rule** is a package: a folder named `origin-kind-name` (record 0016) that travels as is between repositories. Each rule lives in `standard/rules/<name>/` with three files:

| File | Contents |
| --- | --- |
| `manifest.json` | `schemaVersion: 1`, `name` (same as the folder name), `version`, `level`, `title` es/en, `appliesWhen`, `validator` (optional), `decisions` (records that originate it), `compensates` and, only for `model-limitation` packages, `sunset` |
| `RULE.md` | Spanish text: title, analogy, the rule, scope, why (with its record) and verification |
| `RULE.en.md` | English twin of the previous one |

The `RuleManifestSchema` schema (`src/modules/standard/schemas/rule-manifest.ts`) validates the manifest: name with kind `rule`, `compensates: "model-limitation" | "structural"` with `sunset` (retirement condition and review date) mandatory only for `model-limitation` (record 0021), and optional `tokens` (record 0020). The `rules-catalog` validator walks every folder and checks a valid manifest, a name equal to the folder, a registered `validator` and the presence of `RULE.md` and `RULE.en.md`.

## Levels and `appliesWhen`

Record 0005 classifies rules into three levels:

| Level | What it is | Installed | Can be switched off |
| --- | --- | --- | --- |
| `core` | How the AI works with the ecosystem, regardless of technology | Always | No |
| `stack` | Depends on the project's technology | Only if the project uses it | Yes, per project and with a record |
| `optional` | Work preference | Proposed unchecked | Yes |

`appliesWhen` is the list of conditions, detectable without AI, that activate a rule: `{ "fileExists": "<path>" }` or `{ "anyFileMatches": "<pattern>" }`. A `stack` rule must declare at least one; core rules carry an empty list. Today the sixteen rules in the tree are core and all declare `compensates: "structural"`.

## The rules in the tree

| Rule | Title | Validator | Record |
| --- | --- | --- | --- |
| `forge614-rule-additive-evolution` | Additive evolution of data and contracts | — | 0024 |
| `forge614-rule-agent-checklist-impact` | Agent procedure impact | `agent-checklist-impact` | 0017 |
| `forge614-rule-agent-questions-before-acting` | The agent questions before acting | — | 0014 |
| `forge614-rule-bilingual-docs` | Bilingual es/en documentation | `bilingual-docs` | 0016 |
| `forge614-rule-context-budget` | Minimal footprint in the AI's context | `context-budget` | 0020 |
| `forge614-rule-decision-records` | Decision records (ADRs) | `decision-records` | 0015 |
| `forge614-rule-git-readonly-for-agents` | Git is read-only for AI agents | — | 0015 |
| `forge614-rule-machine-contracts` | Single machine contract convention | `error-codes` | 0013 |
| `forge614-rule-never-touch-agents-dir-by-hand` | Never touch `.agents/` by hand | — | 0005 |
| `forge614-rule-no-external-product-mentions` | No external product mentions | `forbidden-mentions` | 0012 |
| `forge614-rule-no-fabricated-validations` | Never fabricate validation results | — | 0015 |
| `forge614-rule-package-naming` | Package names origin-kind-name | `package-naming` | 0016 |
| `forge614-rule-plan-before-code` | Plan before code | — | 0015 |
| `forge614-rule-replaceable-pieces` | Replaceable pieces as the model evolves | — | 0021 |
| `forge614-rule-thin-workflows` | Thin, documented and validated workflows | `workflows` | 0019 |
| `forge614-rule-three-operating-systems` | Mandatory macOS, Linux and Windows support | — | 0018 |

Rules without a validator are enforced by human review or by the agent's behavior. Only one has an automatic check with an assigned phase: the `schema-evolution` validator that record 0024 assigns to additive evolution arrives with Sentinel (phase 0.2); for the others no phase has been assigned yet. Besides the validators in the table, `support-matrix`, `ecosystem-contract`, `rules-catalog` and `packs-catalog` report under the identifier of the closest rule (`agent-checklist-impact`, `machine-contracts` and `package-naming`); document 04 lists them in full.

## The node pack

A **pack** groups rules. `standard/packs/forge614-pack-ecosystem-node/pack.json` (`PackSchema` schema: name with kind `pack`, version, es/en title and a non-empty `rules` list) enumerates the sixteen rules above; it is the pack every repository in the ecosystem receives. The `packs-catalog` validator checks that the name matches the folder and that every listed rule exists in `standard/rules/`; the `context-budget` validator estimates the token cost of the pack's index (name and first line of each `RULE.md`) and fails above 3,000 (record 0020).

## How to add a rule

1. **Record first.** Every rule is born from a decision recorded in `docs/decisions/NNNN-slug.md` with the `TEMPLATE.md` template; afterwards, `bun run decisions:index` regenerates `INDEX.json` (the `decision-records` validator demands consecutive numbering, a valid state and the four fixed sections).
2. Create `standard/rules/forge614-rule-<name>/` with `manifest.json`, `RULE.md` and `RULE.en.md`; `decisions` cites the record from step 1.
3. If the rule is machine-checked, write the validator in `src/modules/validators/` (a pure function over the file tree, with its test next to it), register it in `VALIDATORS` (`src/modules/validators/index.ts`) with the same id as `validator` in the manifest, and add the es/en message keys to the typed catalog in `src/modules/standard/messages/`.
4. Add the rule to `pack.json` if it applies to the whole ecosystem.
5. Run `bun run verify` and, since the content of `standard/` changed, `bun run standard:pack --update-pointer` so the pointer carries the new fingerprint (document 04).
