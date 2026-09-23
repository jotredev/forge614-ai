# Thin, documented and validated workflows

> Like a theater script: the actors (the scripts) do the work; the program (the YAML) only says the order.

**Rule.** Every step of a CI workflow runs a repository script (`bun run <script>`); no logic lives inside the YAML, so what runs locally is exactly what runs in CI. Every workflow is documented at `docs/es/NN-workflows.md` and its English pair: triggers, jobs, what it tests, what it validates, what it publishes and expected duration. `bun workflows:check` validates syntax, schema, and that actions are pinned by version before integrating; `bun workflows:run` runs locally the same scripts CI would run. The `main` branch is protected: no merge without the `verify` workflow green. Every job declares `timeout-minutes`: no stage runs without a limit and `bun workflows:check` rejects a job that lacks it.

**Scope.** Every CI workflow of every repository in the ecosystem.

**Why.** A change would merge into `main` and the workflow would break afterward, because nobody knew precisely what each one tested and the logic lived inside the YAML, impossible to run locally (acta 0019).

**Verification.** Human review for now; `validator: workflows` arrives in Task 8.
