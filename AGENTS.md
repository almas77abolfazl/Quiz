# Agent Guidelines & Repository Map

This is the permanent instruction entry point for coding agents in the Quiz monorepo.

## 1. Workspace Map

- `apps/game`: Angular v20+ Web & Mobile (Capacitor) game application (Port 4200)
- `apps/admin`: Angular Admin control panel (Port 4201)
- `apps/api`: NestJS API and Realtime Socket.IO server (Port 3000)
- `packages/contracts`: Shared TypeScript DTOs, interfaces, and API contracts (`@quiz/contracts`)
- `docs/`: Product rules, architectural decisions, and development workflows.
- `.agents/skills`: Portable, tool-agnostic Agent Skills repository.

## 2. Mandatory Task-Entry Procedure

Before making any changes, you MUST:
1. Run `git status --short --branch` and `git log -3 --oneline`. The tree must be clean and synced with `origin/main`. If not, STOP and report the exact modified/untracked files.
2. Read this `AGENTS.md` file.
3. Identify the task type and read ONLY the specific documents listed in the Reading Map below.

## 3. Scope Discipline & User Changes

- Keep changes strictly focused on the requested task. Do not perform broad, unrequested audits or refactoring.
- Preserve existing user work. Do not delete or overwrite files outside your explicit scope.

## 4. Rules for Secrets

- NEVER commit secrets, passwords, or `.env` file contents.
- Always use `.env.example` as a template for required environment variables.

## 5. Git Safety Rules

- **STRICT PROHIBITION**: Do **NOT** run `git commit` or `git push` without explicit user request for the current task.
- Do not reset, clean, stash, checkout, amend, rebase, or rewrite history.
- Do not modify `.gitignore`.
- Keep temporary review files outside tracked source directories.

## 6. Build, Test, and Reporting Expectations

Before completing any task, run the relevant verification commands found in [verification.md](docs/workflows/verification.md). At a minimum, ensure:
- `pnpm run build` passes.
- `git diff --check` passes cleanly.

## 7. Documentation Precedence Policy

When resolving conflicts, follow this order of precedence:
1. The user's current explicit instruction.
2. This `AGENTS.md` file.
3. Authoritative documents linked in the Reading Map.
4. Area-specific nested `AGENTS.md` (if any).
5. Existing source code and tests.
6. Historical plans, reports, and audits.

*Note: If product rules conflict with current source code, record the conflict as an implementation gap. Do not change the product rule to match the code.*

## 8. Reading Map

Read ONLY the documents relevant to your current task type:

| Task type | Required reading |
| --- | --- |
| Every task | `AGENTS.md` |
| Product/game logic | [product-brief.md](docs/product/product-brief.md), [game-rules.md](docs/product/game-rules.md) |
| API/security/auth/WebSocket | [architecture-direction.md](docs/architecture/architecture-direction.md), [security-boundaries.md](docs/architecture/security-boundaries.md) |
| Shared network contracts | [contracts.md](docs/architecture/contracts.md) |
| Prisma/database/migrations/seed | [architecture-direction.md](docs/architecture/architecture-direction.md), [verification.md](docs/workflows/verification.md), Prisma schema |
| Game Angular UI | Product rules, relevant design docs, Angular skills |
| Admin Angular UI | Product rules, [security-boundaries.md](docs/architecture/security-boundaries.md), Angular skills |
| Visual/browser verification | [verification.md](docs/workflows/verification.md), `webapp-testing` skill |
| Git/release work | [git-policy.md](docs/workflows/git-policy.md), [verification.md](docs/workflows/verification.md) |

## 9. Skill Discovery & Usage Rules

- This monorepo actively supports both Kilo and Antigravity tooling.
- `.kilo/skills/` is the Kilo-compatible skill location.
- `.agents/skills/` is the Antigravity-compatible skill location.
- Neither directory is universally canonical at this time. Agents must use the native directory supported by their current tool context.
- Before performing specialized tasks, read the relevant `SKILL.md` file from your tool's supported skill directory (e.g., `angular-component`, `angular-signals`, `webapp-testing`).
- Maintaining separate skill directories creates potential drift risk. A future synchronization or single source-of-truth policy remains an open tooling decision.
- Do not move, delete, synchronize, or modify either skill directory unless explicitly authorized.

## 10. Clear Stop Conditions

Stop work and request user feedback when:
- You discover a dirty Git tree during the entry check.
- You encounter conflicting authoritative documentation.
- You identify a need to change core architecture or product rules to proceed.
- The requested task is complete and verified.

## 11. Final Handoff / Report Format

Your final response must include:
1. A summary of what was changed.
2. The results of verification commands (`pnpm run build`, `git diff --check`).
3. The final Git status (`git status --short --branch`).
4. Any identified open decisions or unresolved implementation gaps.
5. Confirmation that no unauthorized commits or pushes were made.
