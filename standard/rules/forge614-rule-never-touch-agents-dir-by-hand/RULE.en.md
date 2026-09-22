# Never touch .agents/ by hand

> Like a building's machine room: only authorized staff, with the right tools, get in.

**Rule.** `.agents/`, `forge614.node.json` and any generated file are never created or edited by hand; only through the Forge614 ecosystem's own tools (`forge614 init`, `forge614 update`, the Hub). `forge614 doctor` and the Sentinel detect by fingerprint if someone touched them by hand.

**Scope.** Every AI agent and every person working in a repository with Forge614 installed.

**Why.** This core rule was born together with the three-level classification of rules (acta 0005), to protect the integrity of what the Hub installs and to stop the standard and the support matrix from silently going stale.

**Verification.** Human review and the Sentinel's fingerprint check; the automated fingerprint verifier arrives in a later phase.
