# Protection of the `main` branch

Exact configuration the repository must have (Settings → Rules → Rulesets, or Branch protection):

| Setting | Value |
| --- | --- |
| Protected branch | `main` |
| Requires a pull request before merging | Yes; 1 approval minimum; dismiss stale approvals |
| Required status checks | `verify`, `parity (ubuntu-24.04)`, `parity (macos-15)` and `parity (windows-2025)` (all four from workflow `verify.yml`), up to date with the base |
| Direct push to `main` | Forbidden for everyone, including administrators |
| Force push and deletion of `main` | Forbidden |
| Linear history | Required |
| Commit signatures | Recommended |

Rule: a job with a matrix reports one status check per entry, named `job (value)`, which is why `parity` appears three times and no check named just `parity` exists.

In addition, everyone installs the local hook: `git config core.hooksPath .githooks`.
