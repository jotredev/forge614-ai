# No external product mentions

> Like a brand that explains itself, without pointing at the competition.

**Rule.** No node, contract, spec, documentation, README, code comment, commit message or product message mentions an external product, framework or project as a reference or inspiration. Decisions are described as Forge614's own. The list of forbidden terms lives as data in `standard/forbidden-mentions.json`, controlled by the ecosystem's owner, not in this rule.

**Scope.** Code, documentation, contracts and commits of every repository in the ecosystem. The data file itself (`standard/forbidden-mentions.json`) and `.superpowers/` are excluded from the scan.

**Why.** Forge614 is its own product; its decisions explain themselves rather than by comparison with third parties (acta 0012).

**Verification.** `validator: forbidden-mentions`.
