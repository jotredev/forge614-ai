# Plan before code

> Like a blueprint before raising a wall: it is drawn first, built second.

**Rule.** No non-trivial change is implemented without a plan written at `.agents/plans/YYYY-MM-DD--slug.md`, with goal, context, scope, decisions with their reasoning and the discarded alternative, a checklist, real validations and a result. A non-trivial change with no plan is not reviewed.

**Scope.** Every code, contract or documentation change that is not a trivial fix, in any repository of the ecosystem.

**Why.** The plan is the first layer of the four-layer decision record (acta 0015): if a decision is not written there, it does not exist.

**Verification.** Human review at merge time. The mandatory `## Impacto en el procedimiento de agentes` section of closed plans does have its own verifier (acta 0017, `validator: agent-checklist-impact`).
