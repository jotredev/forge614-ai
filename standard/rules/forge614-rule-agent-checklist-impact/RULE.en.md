# Agent procedure impact

> Like a safety check repeated on every flight, not just the first time the plane was bought.

**Rule.** Every plan under `.agents/plans/` whose `Status:` is `completed` includes the section `## Impacto en el procedimiento de agentes` with real content: `Sí`, stating which new validation it requires, or `No`, with the reason. A closed plan with no real content there does not pass review.

**Scope.** Every closed plan in every repository of the ecosystem.

**Why.** The new-agent procedure and the support matrix silently go stale if nobody reviews the impact of each node change; relying on "someone will remember" is exactly what fails today (acta 0017).

**Verification.** `validator: agent-checklist-impact`.
