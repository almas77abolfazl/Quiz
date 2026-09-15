# Quiz Monorepo Documentation

Welcome to the Quiz monorepo documentation. This repository relies heavily on automated agents, and the documentation structure is strictly governed.

## Documentation Hierarchy

- `product/`: Authoritative product rules, game logic, and open decisions.
- `architecture/`: Technical boundaries, architecture direction, API contracts, and security boundaries.
- `workflows/`: Repeatable development procedures ([local-development.md](workflows/local-development.md), [verification.md](workflows/verification.md), [git-policy.md](workflows/git-policy.md)).
- `audits/`: Point-in-time historical audit reports.
- `design/`: Design references and visual review artifacts.

## Source of Truth Precedence

1. The user's current explicit instruction.
2. Root `AGENTS.md`.
3. Authoritative documents linked by its Reading Map.
4. Area-specific nested `AGENTS.md` (if any).
5. Existing source code and tests as evidence of current implementation.
6. Historical plans, walkthroughs, reports, and audits.

If product documentation conflicts with current source code, it must be recorded as an implementation gap rather than silently modifying the product rule to match the code.

