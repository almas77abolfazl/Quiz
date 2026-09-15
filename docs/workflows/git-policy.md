# Git Policy

## 1. Clean-Tree Checks
Agents must always check that the working tree is clean and synchronized with `origin/main` at the beginning of a task (`git status --short --branch`, `git log -3 --oneline`). If the tree is dirty, the agent must stop immediately and report the untracked/modified files.

## 2. Preservation of User Work
Agents must never reset, clean, stash, checkout, amend, rebase, or otherwise rewrite history, ensuring any concurrent user work is preserved.

## 3. Allowed Inspection Commands
Agents may use non-destructive Git commands to inspect history and state, such as `git diff`, `git log`, `git status`, `git branch`.

## 4. Prohibited Destructive Operations
Agents are strictly prohibited from modifying `.gitignore`.

## 5. Commit and Push Rules
**STRICT PROHIBITION**: Agents must **NOT** run `git commit` or `git push` unless the user directly and explicitly authorizes it for that specific task.

## 6. Final Status Reporting
At the end of a task, agents must report the final Git status (`git status --short`) and confirm that no unauthorized commits or pushes were made.

