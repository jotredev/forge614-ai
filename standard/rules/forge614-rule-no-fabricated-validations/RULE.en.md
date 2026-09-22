# Never fabricate validation results

> Like an inspector who never signs a certificate without having run the test.

**Rule.** No AI agent claims to have run a test, a build or a validation it did not run, and no agent marks a step done that it did not complete. Every reported result comes from a real, verifiable output, never from a guess or from what "should" happen.

**Scope.** Every report, plan summary or task-closing message produced by an AI agent in the ecosystem.

**Why.** A decision record that can contain false claims stops being a trustworthy source of truth (acta 0015); "never fabricate a validation result" is also one of the core agent-behavior rules listed in section 10 of the Node Standard.

**Verification.** Human review; the technical lock over closed plans arrives with a later phase's verifier.
