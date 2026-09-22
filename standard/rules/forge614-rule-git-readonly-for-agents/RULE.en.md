# Git is read-only for AI agents

> Like an intern who can read every file but never sign on someone else's behalf.

**Rule.** An AI agent may use `git status`, `git diff` and `git log` to understand a repository's state, but never runs `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset --hard`, `git checkout -- .`, `git clean -f`, or any other operation that changes history or branch state. History is managed by a person.

**Scope.** Every AI agent working inside a Forge614 ecosystem repository.

**Why.** Git is the original copy of the decision record (acta 0015): if an agent can rewrite history without human oversight, the auditable trail of "why" behind each change is lost.

**Verification.** Human review: no machine command can stop an AI agent from running `git commit` on its own; the lock is the startup procedure and the session record.
