# Mandatory macOS, Linux and Windows support

> Like a door that opens the same no matter which house you come from.

**Rule.** Every node in the ecosystem publishes, on each release, binaries and an installer for macOS (arm64 and x64), Linux (arm64 and x64) and Windows (x64); its template `release.yml` builds and tests each target on a native runner for that platform. There are no exceptions and no "pending" state: a node missing one of the three systems does not ship.

**Scope.** Every published node in the Forge614 ecosystem.

**Why.** Only one node published for all three systems and tested on real Windows; leaving coverage to each node's discretion means a person on Windows gets half the ecosystem (acta 0018).

**Verification.** Human review of the CI configuration for now; `validator: release` arrives in a later phase.
