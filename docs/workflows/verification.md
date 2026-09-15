# Verification Workflow

This document defines the mandatory verification commands and expectations for agents before completing a task.

## Monorepo Commands
All commands run from the repository root using `pnpm`.

- **Full Workspace Build**: `pnpm run build`
- **Full Workspace Test**: `pnpm run test`

## Package-Specific Commands
Depending on the scope of the changes, verify the specific packages:

- **Game**: `pnpm --filter @quiz/game build` (and test)
- **Admin**: `pnpm --filter @quiz/admin build` (and test)
- **API**: `pnpm --filter @quiz/api build` (and test)
- **Contracts**: `pnpm --filter @quiz/contracts build` (and test)

## Prisma & Database
For API or schema changes:
- `pnpm --filter @quiz/api prisma:generate`
- `pnpm --filter @quiz/api prisma:validate`

## Pre-Handoff Checks
- Ensure `git diff --check` passes cleanly (no trailing whitespace, conflict markers, etc.).
- Ensure no secrets or `.env` details are accidentally committed or logged.
- For UI changes, utilize the `webapp-testing` skill for browser-based visual and functional verification if required.

