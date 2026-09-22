# Minimal footprint in the AI's context

> Like a well-packed carry-on: only the essentials fit, and the rest is checked in only if it's needed.

**Rule.** Everything Forge614 injects at the start of a session (memory protocol + skill index + applicable rule pack) fits within **≤ 3,000 tokens**. No skill, rule or policy loads in full until it is used: at the start, only the index exists (name and one line). An MCP or skill unused for 30 days is proposed for shutdown. Every package declares its estimated cost in the manifest's `tokens` field, measured when packaged.

**Scope.** Everything Forge614 injects into an AI agent's context at session start, and every package manifest.

**Why.** AI harnesses commonly inject full skills, dozens of MCP servers and extra steps into every session; the known result is a slower agent that spends more tokens without the work improving. Forge614's complexity must live in the builder (nodes, verifier, CI), never in the AI's context (acta 0020).

**Verification.** `validator: context-budget` computes, for the ecosystem pack, each rule's index line (name + the first line of its `RULE.md`) and estimates its cost as `characters / 4` (labeled as an estimate in the finding); it fails if the sum exceeds 3,000 tokens. Exact measurement at packaging time (the manifest's `tokens` field) arrives in a later phase.
