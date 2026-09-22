# Protection of the `main` branch

Exact configuration the repository must have (Settings → Rules → Rulesets, or Branch protection):

| Setting | Value |
| --- | --- |
| Protected branch | `main` |
| Requires a pull request before merging | Yes; 1 approval minimum; dismiss stale approvals |
| Required status checks | `verify` (workflow `verify.yml`), up to date with the base |
| Direct push to `main` | Forbidden for everyone, including administrators |
| Force push and deletion of `main` | Forbidden |
| Linear history | Required |
| Commit signatures | Recommended |

In addition, everyone installs the local hook: `git config core.hooksPath .githooks`.
