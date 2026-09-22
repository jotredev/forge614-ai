# Procedure — Adding a new AI agent to the Forge614 ecosystem

Español: [add-agent-runbook.md](add-agent-runbook.md)

> **Analogy:** hiring a new worker for the workshop. First you check whether they have the minimum tools (step 0); if they don't, they don't get in. If they do, every station in the workshop (node) evaluates them in a fixed order, and only when **all** of them sign off do they get their badge.

**Admission rule (record 0017):** an agent enters the ecosystem only when it meets **all** mandatory requirements of **all** nodes. If it lacks one or loses functionality, it does not enter: it stays `unsupported` or `partial` in the matrix, with the reason written down.

**Who does what:** the owner runs each step in a session inside the node's repository, with the prompt that `forge614-ai` hands over (format from the collaboration record); `forge614-ai` coordinates, reviews every result and updates this procedure and the matrix. No node resolves another node's part.

Example used throughout the document: `opencode`.

---

## Step 0 — Preliminary investigation (without touching any repository)

Done in `forge614-ai`, with the agent's CLI **installed and authenticated** on the machine. Everything is checked **by running the binary**, never by reading its documentation alone.

| # | Question | How it is checked | If the answer is "no" |
|---|---|---|---|
| 0.1 | Does it have a headless (non-interactive) mode? | `opencode --help`, `opencode run --help` or equivalent; run a real request and capture stdout | Without headless there is no Workers or Atlas: it enters as `partial` (chat/MCP only) or does not enter |
| 0.2 | Can it receive the prompt through stdin? | `echo "say hello" \| opencode <flag>` | Mandatory for headless (the prompt never goes in `argv`): if it cannot, headless stays `unsupported` |
| 0.3 | Flags for model and for reasoning level? | Try `--model` and the effort mechanism; note the exact syntax | Without configurable reasoning: documented; Atlas and the orchestrator never request it |
| 0.4 | Does it support MCP servers? Where and in what format does its configuration live? | Locate the real file (`~/.config/opencode/...`), the format (JSON/JSONC/TOML/YAML), the shape of each entry | Without MCP there is no Engram memory through tools: `partial` |
| 0.5 | Does it have session-start hooks (a hook on startup)? | Configure a test hook and verify it runs (real evidence, not assumption) | Without hooks, startup memory depends on instructions (0.6) |
| 0.6 | Does it have an official, stable global instructions file? | Official documentation + test: write a marker and see that the session reads it | Without instructions or hooks: `partial` (MCP only) |
| 0.7 | Does it emit a token usage report in headless mode? | JSON/structured output with `usage` | Recorded as `null` ("not measured"); does not block |
| 0.8 | How does it authenticate? Subscription or API key only? | Official login; confirm it does not require an API key | Shell never accepts API keys: chat in Shell `unsupported` |
| 0.9 | Does it reject untrusted directories (like Codex without a Git repo)? | Run it in an empty temporary folder | Note the flag that avoids it |
| 0.10 | What is the exact "quota exhausted" text? | Force a real error; capture stderr/stdout | Without a confirmed pattern, Workers cannot detect quota: blocks Workers |

**Output of step 0:** a new row in `support-matrix.json` with status `evaluating`, a decision record in `forge614-ai/docs/decisions/` ("Evaluation of `opencode`") with the table filled in and evidence, and the decision: **continue** or **does not enter** (with reason). Without the record, no node is touched.

---

## Step 1 — Engines (mandatory; always first)

Repository: `forge614-engines`. Reference section: "`forge614-engines`" in the checklist.

| What | Where |
|---|---|
| Add the id to the `AgentId` type | `src/modules/agents/types.ts` |
| Create the adapter with real capabilities (`supportsMcp`, `supportsHooks`, `supportsHeadlessExec`), executable and configuration paths, config format, MCP entry shape, `headlessCommand()` (if applicable), `instructions` (only if 0.6 is yes), `--readable-dir` mapping | `src/infrastructure/agents/opencode.ts` |
| Register it | `src/app/default-registry.ts` |
| Adapter tests (headless with/without stdin, with/without reasoning; capability manifest) | `src/infrastructure/agents/opencode.test.ts` |
| Startup hook, if 0.5 is yes (delegating to `forge614-engram startup-context`; treat `unbound` as success) | hook path in the adapter + `src/app/run-memory-hook.ts` |
| `CONTRACT.md` es/en: agent added to the supported list | repository root |
| Plan with section "Impact on the agent procedure: Yes" | `.agents/plans/` |

**Gate:** `bun verify` green; `forge614-engines detect` reports it installed; `capabilities --agent opencode` correct; `plan memory-install` → `apply` → `verify memory-integration` on a real installation. Review by `forge614-ai`. Engines release.

## Step 2 — Workers (mandatory if `supportsHeadlessExec: true`)

Repository: `forge614-workers`.

| What | Where |
|---|---|
| Adapter with `detectQuotaExhausted` using the pattern **confirmed** in 0.10, `extraArgs()` (flag from 0.9 if applicable), fixtures for real quota and for a generic error | `src/adapters/opencode.ts` + test |
| Registration | `src/adapters/registry.ts` |
| Completeness test against the real Engines binary | `src/adapters/registry.completeness.test.ts` (must pass without changes) |
| Verify with a real authenticated session that authentication survives an isolated `cwd` with `HOME` intact | evidence in the plan |
| Verify that `SIGTERM → SIGKILL` kills the process and its children | evidence in the plan |
| `CONTRACT.md`, plan with impact | root, `.agents/plans/` |

**Gate:** a real task executed by Workers with `opencode` returns `task_completed`; quota detected with the real fixture. Review. Release.

## Step 3 — Atlas (only if Workers supports it)

Repository: `forge614-atlas`.

| What | Where |
|---|---|
| `opencode` models per tier (light/standard/deep) and whether it accepts reasoning | today `src/.../task-config.ts`; with the Hub, the model policy (`forge614-policy-*`) |
| Confirm it appears as an option with no code changes in the selector | evidence |

**Gate:** `forge614-atlas init --engine opencode` produces a valid plan and a short real run writes to Engram. Review. Release.

## Step 4 — Engram (normally no changes)

Repository: `forge614-engram`. Not modified: the agent consumes the public protocol (`memory-protocol --json` v1/v2) and the MCP tools `memory_context`, `memory_save`, `memory_session_summary`, `memory_session_end`. It is **verified** (not coded): full cycle start → explicit save → recall in a new conversation → compaction → close; session summary with the six fields; never secrets in memory; `unbound` treated as success.

**Gate:** evidence of the full cycle with `opencode`. If something does not fit the protocol, stop and propose a new protocol version by decision record.

## Step 5 — Shell (for chat; MCP already comes from Engines)

Repository: `forge614-shell`. Today it requires touching five places (until the alignment unifies them into a registry):

| What | Where |
|---|---|
| Own session: subscription login (never API key), model catalog, send/cancel, resume, `getStartupContext` with sanitization | `src/engines/opencode/session.ts` (+ `auth.ts` if applicable) |
| Chat adapter allowlist | `src/infrastructure/forge614-engines.ts` (`supportedShellAdapters`) |
| Engine union type | `src/contracts/available-engine.ts` |
| `--engine` parsing | `src/app/options.ts` |
| Chat startup branch | `src/cli.ts` |
| Model/reasoning preferences | `src/infrastructure/shell-preferences.ts` (`EngineId`) |
| Texts in the es/en i18n catalog | `src/i18n/` |
| Tests with session doubles; visual PTY review; es/en docs; `notion-map` | per checklist |

**Gate:** real chat with `opencode` from Shell, `/login` by subscription, shared memory visible from `~`. Review. Release.

## Step 6 — Closure in `forge614-ai`

1. `support-matrix.json`: `opencode` row with each cell in `supported | partial | unsupported`, date, owner and reason; global status `supported` **only** if all mandatory cells are `supported`.
2. "Agents already evaluated" table in the checklist: new row with the result per node and notes.
3. New lessons: every validation discovered is added to the **node's general checklist**, not only to the agent's row.
4. Evaluation record closed with the result; summary to Engram with `sessionId`.
5. If any node published contract changes: `CONTRACT.md` and `schemaVersion` updated; procedure reviewed (record 0017).

---

## Order and dependencies

```
Step 0 (investigation, record)  →  1 Engines  →  2 Workers  →  3 Atlas
                                        └──────→  4 Engram (verification)
                                        └──────→  5 Shell
                                                        └──→  6 Closure in forge614-ai
```

Workers, Atlas, Engram and Shell depend on Engines having already published the adapter. Workers before Atlas. Shell can run in parallel with Workers.

## What is never done

- Starting with Shell "to see the chat" before Engines reports the agent.
- Copying quota patterns, installation paths or config formats from another agent by resemblance.
- Inventing an instructions file the agent does not document as stable.
- Marking `supported` with pending cells.
- Resolving from one node something that belongs to another: it is noted in the other node's section and handed over as pending.
