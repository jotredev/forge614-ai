# Replaceable pieces as the model evolves

> Like a standardized spare part: it swaps out on its own, without taking the rest of the machine apart.

**Rule.** Every package and every node declares `compensates: "model-limitation" | "structural"`. *Structural* is what does not move into the model even as it improves: durable memory, contracts between nodes, accounting, verification, install, project identity. *Model-limitation* is what exists because the model cannot do it on its own today, and that kind of package carries a mandatory `sunset` (a verifiable retirement condition and a review date). No package depends on another internally, so the Hub can disable any `model-limitation` package by policy without anything else breaking. Before adding a new skill, MCP or plugin, the question "does the model already do this on its own?" is answered with evidence; if the answer is yes, the package does not get added.

**Scope.** Every package and node manifest in the ecosystem.

**Why.** AI models evolve faster than the procedures encoded in a harness; without classification and scheduled retirement, the orchestration layer outlives its reason for existing and becomes dead weight (acta 0021).

**Verification.** Human review for now; the manifest schema already validates `compensates`/`sunset` (this task), and the periodic review of active `sunset` entries is automated in a later phase.
