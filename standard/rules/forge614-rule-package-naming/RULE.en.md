# Package names: origin-kind-name

> Like a first and last name: reading it alone tells you whose it is and what it is.

**Rule.** Every package distributed by the Hub (rule, skill, MCP, plugin, policy, pack) is named `origin-kind-name`, in lowercase and hyphens: `forge614-rule-package-naming`, `anthropics-skill-pdf`. Regex: `^([a-z0-9]+)-(rule|skill|mcp|plugin|policy|pack)-([a-z0-9]+(?:-[a-z0-9]+)*)$`. In the catalog, the identifier is `origin/kind/name`.

**Scope.** Mandatory under `standard/rules/`, `standard/packs/` and in any folder with a `manifest.json` under `.agents/`. The person's own folders with no manifest are never touched.

**Why.** Prevents collisions between the person's own packages and the Hub's, and makes any log or run book auditable (acta 0016).

**Verification.** `validator: package-naming`.
