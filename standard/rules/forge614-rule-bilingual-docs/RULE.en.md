# Bilingual es/en documentation

> Like a product label printed in two languages, side by side, always updated together.

**Rule.** Every people-facing surface (documentation, Shell messages, package and policy descriptions, Sentinel explanations, summaries) exists in Spanish and English, with the same file numbering and the same heading structure and numbering. Code, identifiers and data keys are in English; they are never translated.

**Scope.** `README.md`, `standard/STANDARD.md`, `CONTRACT.md`, and the `docs/es/NN-slug.md` / `docs/en/NN-slug.md` pairs of every repository in the ecosystem.

**Why.** With the Hub, anyone needs to know what a package is and why a decision exists, in their own language; parity that silently breaks is worse than having no translation at all (acta 0016).

**Verification.** `validator: bilingual-docs`.
