# Contracts Architecture

This document describes the boundaries and rules for the `@quiz/contracts` package.

## Package Responsibilities

The `@quiz/contracts` package serves as the shared boundary between the frontend applications (Game, Admin) and the backend API.

## Technical Boundaries

- **Dual Module Support**: The package must be distributed supporting both ESM and CommonJS. This ensures compatibility with modern Angular build tools (ESM) and NestJS/legacy Node environments.
- **Root Imports**: The package must support public root imports.
- **Runtime Enums**: Enums must be compatible at runtime across environments.
- **Framework Agnosticism**: Shared contracts must **not** depend on NestJS, Angular, Prisma, or class-validator. Framework-specific validation DTOs must remain inside the API package.

## Security & Privacy Rules

- **Player vs. Admin Views**: Strict separation is required between player-safe and admin question contracts.
- **No Correct Answer Leakage**: The `PlayerQuestionOptionDto` (or equivalent client view model) must **never** contain the `isCorrect` flag.
- **Feedback Disclosure**: `AnswerFeedbackDto` must reveal correctness only after an answer is explicitly submitted by the player or the time limit expires.

## Data Types

- **Timestamps**: All network timestamps must use ISO string formats.

