# Decision records (ADRs)

> Like a ship's logbook: every important decision is written down with a date, forever.

**Rule.** Every architecture or contract decision is recorded as an ADR at `docs/decisions/NNNN-slug.md`, numbered consecutively from `0001`, with a date, a state (`propuesta | aceptada | revocada | reemplazada por NNNN`), an Engram session, and the sections `## Contexto`, `## Decisión`, `## Alternativas descartadas` and `## Consecuencias`. An ADR is never deleted; it changes state. `docs/decisions/INDEX.json` lists every existing ADR and never loses an entry.

**Scope.** `docs/decisions/` of every repository in the ecosystem.

**Why.** This is the second layer of the four-layer decision record: whoever asks "why is this the way it is" years later needs an auditable answer, not just what an AI happens to remember (acta 0015).

**Verification.** `validator: decision-records`. If `docs/decisions/INDEX.json` does not exist yet in the repository (it is produced by `bun run decisions:index`), the validator reports a single finding saying so, instead of a pile of partial evidence.
