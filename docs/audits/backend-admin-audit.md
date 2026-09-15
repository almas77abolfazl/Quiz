# Backend, Database and Admin Audit

## 1. Executive Summary

The Quiz monorepo demonstrates a solid foundation with an established NestJS backend API (`apps/api`), standalone Angular Admin control panel (`apps/admin`), standalone Angular Web/Mobile Game application (`apps/game`), shared contracts package (`packages/contracts`), and a 24-model Prisma PostgreSQL schema. All monorepo projects compile successfully (`build` commands exit 0).

However, the current codebase is **not ready for production or public MVP release**. Significant security vulnerabilities, data integrity risks, product rule mismatches, and architectural gaps exist:
1. **Critical Security & Data Leakage**: Public endpoints return question options containing `isCorrect: true`, allowing client-side answer theft. WebSocket 1v1 matchmaking lacks authentication and relies on client-provided `userId` payloads (enabling user impersonation). Season prize claiming endpoint lacks ownership authorization.
2. **Missing Database Migration Baseline**: The database schema was applied using `prisma db push` without formal Prisma migration files (`prisma/migrations`) or seed data (all 24 tables have 0 rows).
3. **Product Rule Mismatches**: Single-player quiz flow awards 10 coins per correct answer + 50 bonus coins (instead of difficulty-based 1-3 coins + 2 bonus), uses variable per-difficulty time limits (instead of fixed 30 seconds), lacks daily 15-game limit enforcement, and does not prevent question repeats.
4. **Incomplete Admin Panel**: `apps/admin` lacks authentication, route guards, four-option question editor, difficulty selectors, status filtering, and publication workflow enforcement.
5. **Contract & Packaging Deficiencies**: `@quiz/contracts` contains only enums (no shared request/response DTO interfaces) and builds to CommonJS, causing build warnings in ESM Angular consumers.

---

## 2. Verified Environment State

- **Database Engine**: PostgreSQL 16 Alpine running in Docker (`quiz-postgres` container on port 5432, healthcheck active and healthy).
- **Database Schema**: 24 Prisma models applied directly to `quiz_db` via `prisma db push`.
- **Database Row Counts**: All 24 tables contain 0 rows (no seed data populated).
- **Prisma Migrations**: No `_prisma_migrations` table exists in PostgreSQL. No `apps/api/prisma/migrations` directory exists on disk.
- **Environment Configuration**: `.env` and `.env.example` contain identical development defaults (`DATABASE_URL`, `JWT_SECRET`, `OTP_PEPPER`, `PORT=3000`).
- **Monorepo Build Status**:
  - `@quiz/contracts`: PASS (`tsc`)
  - `@quiz/api`: PASS (`prisma generate && nest build`)
  - `@quiz/admin`: PASS (`ng build`)
  - `@quiz/game`: PASS (`ng build`)
  - `git diff --check`: PASS (clean)

---

## 3. Prisma / Schema Assessment

### Existing Models (24 total)
`User`, `AuthSession`, `OtpChallenge`, `UsernameHistory`, `Category`, `Tag`, `CategoryFollow`, `Question`, `QuestionOption`, `QuestionCategory`, `QuestionTag`, `QuestionSuggestion`, `Season`, `SeasonEntry`, `SeasonPrize`, `PrizeClaim`, `CoinTransaction`, `QuizSession`, `QuizSessionQuestion`, `Match`, `MatchParticipant`, `MatchQuestion`, `MatchAnswer`, `Report`.

### Strengths
- Comprehensive relational modeling covering users, sessions, categories, questions, seasons, leaderboard entries, coin ledger transactions, and 1v1 matches.
- Enums defined for roles (`UserRole`), difficulties (`Difficulty`), statuses, and transaction types.
- Soft delete timestamps (`deletedAt`) present on core entities like `User`, `Category`, and `Question`.
- Compound indexes and unique constraints on critical join tables (e.g. `[questionId, sortOrder]`, `[seasonId, userId]`).

### Missing Constraints & Risks
- **Option Count Constraint**: Schema allows any number of options per question (DB allows 0..N, whereas product rules require exactly 4).
- **Correct Option Count Constraint**: Schema relies on application code to ensure exactly 1 option has `isCorrect = true`.
- **Migration Tracking Absence**: Using `prisma db push` means production schema evolution cannot be safely versioned, tracked, or rolled back. A migration baseline must be created before adding production data.

---

## 4. API Endpoint Inventory

| Method | Route | Auth | Role | Consumer | Status | Risk |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/otp` | Public | None | Game / Admin | Implemented | Low (dev logger only; needs rate limiting) |
| `POST` | `/api/auth/verify` | Public | None | Game / Admin | Implemented | Medium (OTP hash verify; needs brute-force limit) |
| `POST` | `/api/auth/refresh` | Public | None | Game / Admin | Implemented | Low |
| `POST` | `/api/auth/logout` | Public | None | Game / Admin | Implemented | Low |
| `GET` | `/api/auth/me` | JWT | Any | Game / Admin | Implemented | Low |
| `GET` | `/api/categories` | Public | None | Game / Admin | Implemented | Low |
| `GET` | `/api/categories/:id` | Public | None | Game / Admin | Implemented | Low |
| `POST` | `/api/categories` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Low |
| `PUT` | `/api/categories/:id` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Low |
| `DELETE` | `/api/categories/:id` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Low |
| `GET` | `/api/questions` | Public | None | Admin | Implemented | **CRITICAL** (Leaks `isCorrect` flag) |
| `GET` | `/api/questions/:id` | Public | None | Admin | Implemented | **CRITICAL** (Leaks `isCorrect` flag) |
| `POST` | `/api/questions` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Medium (allows invalid option count) |
| `PUT` | `/api/questions/:id` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Medium |
| `PUT` | `/api/questions/:id/publish` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | **HIGH** (Role mismatch: Content Specialist can publish) |
| `DELETE` | `/api/questions/:id` | JWT | `ROOT_ADMIN`, `CONTENT_SPECIALIST` | Admin | Implemented | Low |
| `POST` | `/api/quiz/start` | JWT | Player | Game | Implemented | **CRITICAL** (Leaks `isCorrect` in session payload & rule mismatches) |
| `POST` | `/api/quiz/:id/answer` | JWT | Player | Game | Implemented | Medium (Server validates timing, but relies on flawed rules) |
| `POST` | `/api/quiz/:id/finish` | JWT | Player | Game | Implemented | **HIGH** (Flawed coin/score calculation & duplication risk) |
| `GET` | `/api/quiz/history` | JWT | Player | Game | Implemented | Low |
| `GET` | `/api/coins/history` | JWT | Player | Game | Implemented | Low |
| `GET` | `/api/users/me` | JWT | Any | Game | Implemented | Low |
| `PATCH` | `/api/users/me` | JWT | Any | Game | Implemented | Low |
| `POST` | `/api/users/me/categories/:id/follow` | JWT | Player | Game | Implemented | Low |
| `DELETE` | `/api/users/me/categories/:id/follow` | JWT | Player | Game | Implemented | Low |
| `GET` | `/api/users/me/categories/following` | JWT | Player | Game | Implemented | Low |
| `GET` | `/api/seasons` | Public | None | Game / Admin | Implemented | Low |
| `GET` | `/api/seasons/active` | Public | None | Game / Admin | Implemented | Low |
| `GET` | `/api/seasons/:id` | Public | None | Game / Admin | Implemented | Low |
| `GET` | `/api/seasons/entries/:id/me` | JWT | Player | Game | Implemented | Low |
| `POST` | `/api/seasons` | JWT | `ROOT_ADMIN` | Admin | Implemented | Low |
| `PUT` | `/api/seasons/:id/activate` | JWT | `ROOT_ADMIN` | Admin | Implemented | Low |
| `POST` | `/api/seasons/entries/:id/claim` | JWT | Any | Game | Implemented | **CRITICAL** (Missing ownership check on `seasonEntryId`) |
| WS | `join_matchmaking` | None | None | Game | Implemented | **CRITICAL** (Unauthenticated WS; client-provided `userId`) |
| WS | `submit_answer` | None | None | Game | Implemented | **CRITICAL** (Unauthenticated WS; client-provided `userId`) |

---

## 5. Critical Security Findings

### SEC-01: Correct Answer Leakage (`isCorrect` Field Exposed)
- **Severity**: CRITICAL
- **File Path**: [question.service.ts](file:///e:/Projects/Quiz/apps/api/src/modules/question/question.service.ts#L21-L37) and [quiz.service.ts](file:///e:/Projects/Quiz/apps/api/src/modules/quiz/quiz.service.ts#L65)
- **Relevant Methods**: `QuestionService.findAll`, `QuestionService.findOne`, `QuizService.startQuiz`
- **Evidence**:
  ```typescript
  // question.service.ts
  return this.prisma.question.findMany({
    where,
    include: { options: { orderBy: { sortOrder: 'asc' } } } // includes isCorrect!
  });
  ```
- **Impact**: Any user or client script calling public `/api/questions` or authenticated `/api/quiz/start` receives the full question option list with `isCorrect: true`/`false`. Clients can automatically select the correct answer without playing.
- **Recommended Fix**: Define separate client-facing DTO/view models that explicitly exclude `isCorrect` from question options returned during game play or public catalog queries. Only return `isCorrect` in Admin endpoints.

### SEC-02: Unauthenticated & Spoofable WebSocket Gateway
- **Severity**: CRITICAL
- **File Path**: [match.gateway.ts](file:///e:/Projects/Quiz/apps/api/src/modules/match/match.gateway.ts#L42-L105)
- **Relevant Gateway Handlers**: `handleConnection`, `handleJoinMatchmaking`, `handleSubmitAnswer`
- **Evidence**:
  ```typescript
  @SubscribeMessage('join_matchmaking')
  async handleJoinMatchmaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; ... },
  ) {
    const match = await this.matchService.joinMatchmaking(data.userId, ...);
  ```
- **Impact**: The Socket.IO gateway accepts any socket connection without verifying JWT credentials. Message payloads accept `userId` directly from client JSON data, enabling malicious users to impersonate any player, submit answers on their behalf, or manipulate match outcomes.
- **Recommended Fix**: Implement WsGuard using `@nestjs/websockets` / Socket.IO handshake auth header verification. Extract `userId` strictly from validated socket authentication payload (`client.user.userId`).

### SEC-03: Unauthorized Season Prize Claiming
- **Severity**: CRITICAL
- **File Path**: [season.controller.ts](file:///e:/Projects/Quiz/apps/api/src/modules/season/season.controller.ts#L61-L68) and [season.service.ts](file:///e:/Projects/Quiz/apps/api/src/modules/season/season.service.ts#L139-L156)
- **Relevant Methods**: `SeasonController.claimPrize`, `SeasonService.claimPrize`
- **Evidence**:
  ```typescript
  // season.controller.ts
  @Post('entries/:seasonEntryId/claim')
  @UseGuards(AccessTokenGuard)
  claimPrize(@Param('seasonEntryId') seasonEntryId: string) {
    return this.seasonService.claimPrize(seasonEntryId); // userId ignored!
  }
  ```
- **Impact**: Any authenticated user can submit a POST request to `/api/seasons/entries/:seasonEntryId/claim` specifying another player's `seasonEntryId` and trigger a prize claim.
- **Recommended Fix**: Pass `request.user.userId` into `seasonService.claimPrize()` and verify that `entry.userId === userId` before creating a `PrizeClaim`.

### SEC-04: Role Hierarchy Violation in Question Publishing
- **Severity**: HIGH
- **File Path**: [question.controller.ts](file:///e:/Projects/Quiz/apps/api/src/modules/question/question.controller.ts#L53-L58)
- **Relevant Method**: `QuestionController.publish`
- **Evidence**:
  ```typescript
  @Put(':id/publish')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ROOT_ADMIN, UserRole.CONTENT_SPECIALIST)
  publish(...)
  ```
- **Impact**: Product specification states: *"Content Specialist creates draft; only Root Admin approves and publishes."* Currently, `CONTENT_SPECIALIST` can self-approve and publish questions.
- **Recommended Fix**: Restrict `@Roles(UserRole.ROOT_ADMIN)` on the `/publish` endpoint.

### SEC-05: Unauthenticated Public Catalog Access & Lack of Rate Limiting
- **Severity**: MEDIUM
- **File Path**: [question.controller.ts](file:///e:/Projects/Quiz/apps/api/src/modules/question/question.controller.ts#L26-L37) and [auth.controller.ts](file:///e:/Projects/Quiz/apps/api/src/modules/auth/auth.controller.ts#L12-L22)
- **Relevant Endpoints**: `GET /api/questions`, `POST /api/auth/otp`
- **Impact**: Absence of NestJS `ThrottlerModule` enables OTP SMS spamting/abuse and scraping of questions.
- **Recommended Fix**: Install and configure `@nestjs/throttler` globally with tight limits on `/api/auth/otp` (e.g. 3 requests per minute per IP).

---

## 6. Single-Player Rule Mismatch Table

| Product Rule | Current API Implementation | Status | Required Change |
|---|---|---|---|
| Fixed 30 seconds per question | `DEFAULT_TIME_LIMIT_BY_DIFFICULTY` sets 5s–20s based on difficulty | **NON-COMPLIANT** | Set fixed 30-second `deadlineAt` calculation for all questions |
| Season score: EASY=1, MEDIUM=2, HARD=3, VERY_HARD=5 | Fixed 10 points per correct answer regardless of difficulty | **NON-COMPLIANT** | Calculate season score per question based on difficulty map `(EASY: 1, MEDIUM: 2, HARD: 3, VERY_HARD: 5)` |
| Coins: EASY=1, MEDIUM=1, HARD=2, VERY_HARD=3 | Fixed 10 coins per correct answer regardless of difficulty | **NON-COMPLIANT** | Award coins per question based on difficulty map `(EASY: 1, MEDIUM: 1, HARD: 2, VERY_HARD: 3)` |
| Completion bonus: 2 coins | Fixed 50 coins completion bonus | **NON-COMPLIANT** | Set completion bonus to exactly 2 coins in `finishQuiz` |
| Max 15 daily season-scored solo games | No daily limit count or check implemented in `QuizService` | **NON-COMPLIANT** | Track daily solo count; set `countedForDaily = false` once 15 reached; enforce quitting count |
| Avoid repeat questions while unused exist | `QuizService.startQuiz` picks random published questions without user history filter | **NON-COMPLIANT** | Filter out `questionId`s already answered by `userId` until pool exhausted |
| No correct answer disclosure before submission | `startQuiz` payload embeds option `isCorrect` boolean flags | **NON-COMPLIANT** | Omit `isCorrect` from quiz session question options; return correct option ID only after answer submission |

---

## 7. Admin Readiness Table

| Admin Feature | Implementation Status | Current Classification | Deficiencies / Gaps |
|---|---|---|---|
| Admin Authentication / Login Page | Missing | **MISSING** | No login component, no token storage, no auth header interceptor |
| Route Security & Guards | Missing | **MISSING** | Routes defined without Angular `CanActivate` guards |
| Category Management List | Real API Connected | **PARTIAL / UI-ONLY** | Displays category list; delete works; Create dialog is unbuilt (`// Dialog implementation would go here`) |
| Question Management List | Real API Connected | **PARTIAL / UI-ONLY** | Displays text and difficulty; publish button triggers API; no status filter |
| Four-Option Question Editor | Missing | **MISSING** | No UI component for adding/editing questions or options |
| Correct Answer Selection UI | Missing | **MISSING** | No radio/checkbox toggle to designate correct option |
| Difficulty & Category Selectors | Missing | **MISSING** | No dropdowns for setting question difficulty or associating categories |
| Draft / Review / Published Workflow | Partial API / Missing UI | **MISSING** | API exists but UI lacks review status tabs or role permission toggles |
| Role Permissions & Access Control | Missing | **MISSING** | Admin UI does not enforce `ROOT_ADMIN` vs `CONTENT_SPECIALIST` views |
| Loading, Error & Empty States | Missing | **MISSING** | RxJS subscriptions use empty `error: () => {}` error handlers |

---

## 8. Contracts Assessment

### 1. CommonJS vs. ESM Output Deficit
- **Location**: `packages/contracts/tsconfig.json`
- **Issue**: `tsconfig.json` specifies `"module": "commonjs"`. Angular CLI (v20+) uses ESM bundling. When `@quiz/contracts` is imported by Angular apps (`apps/game` or `apps/admin`), build tools produce warnings (`@quiz/contracts is not ESM`).
- **Required Fix**: Update `packages/contracts` to output dual CommonJS/ESM or standard ES2022 module format, with `"type": "module"` or properly configured `exports` block.

### 2. Missing Shared DTO & Interface Declarations
- **Location**: `packages/contracts/src/index.ts`
- **Issue**: `packages/contracts` currently exports **only enums** (`UserRole`, `Difficulty`, `QuestionStatus`, etc.).
- **Impact**: `apps/api`, `apps/admin`, and `apps/game` duplicate TypeScript interfaces independently (e.g. `AdminApiService` defines local `Category` and `Question` interfaces).
- **Required Fix**: Add shared Request/Response DTOs and view models to `@quiz/contracts`:
  - `CategoryDto`, `CreateCategoryDto`, `UpdateCategoryDto`
  - `QuestionDto`, `QuestionOptionDto` (client view vs admin view), `CreateQuestionDto`
  - `QuizSessionDto`, `StartQuizDto`, `SubmitAnswerDto`, `QuizResultDto`
  - `UserDto`, `AuthResponseDto`

---

## 9. Test Coverage

| Package / App | Unit Tests Status | Integration / E2E Tests Status | Coverage |
|---|---|---|---|
| `packages/contracts` | **NOT AVAILABLE** (No test runner configured) | **NOT AVAILABLE** | 0% |
| `apps/api` | **NOT AVAILABLE** (No test script in package.json) | **NOT AVAILABLE** | 0% |
| `apps/admin` | PASS (1 generated `app.spec.ts` sanity test) | **NOT AVAILABLE** | < 5% |
| `apps/game` | PASS (1 generated `app.spec.ts` sanity test) | **NOT AVAILABLE** | < 5% |

---

## 10. Prioritized Vertical-Slice Plan

### Phase 1: Migration Baseline, Idempotent Development Seed & Shared Contracts
- **Scope**:
  - Establish formal Prisma migration baseline (`prisma migrate dev`).
  - Create an idempotent dev seed script (`apps/api/prisma/seed.ts`).
  - Fix `@quiz/contracts` ESM build target.
  - Export core Category and Question DTOs in `@quiz/contracts`.
- **Acceptance Criteria**:
  - `pnpm --filter @quiz/api prisma:migrate` creates migration files.
  - Running `pnpm --filter @quiz/api prisma:seed` populates dev database idempotently.
  - `@quiz/contracts` builds cleanly without ESM warnings in Angular.
- **Tests Required**: Unit test for seed runner idempotency; contract build verification.
- **Explicitly Deferred**: Game UI changes, 1v1 WebSocket refactoring.

### Phase 2: Secure Content Management & Admin Panel Vertical Slice
- **Scope**:
  - Fix API Question endpoints (`isCorrect` stripping for client views; restrict `/publish` to `ROOT_ADMIN`).
  - Build Admin auth/login page with JWT token storage and HTTP Interceptor.
  - Complete Admin Category management (Create/Edit modal dialogs).
  - Complete Admin Question editor (4 options, 1 correct answer selection, difficulty picker, category selector).
- **Acceptance Criteria**:
  - Admin user can log in with OTP/admin credentials.
  - Admin can create categories and draft 4-option questions.
  - Only `ROOT_ADMIN` can publish questions.
- **Tests Required**: API controller unit tests for role guards & question CRUD.
- **Explicitly Deferred**: 1v1 matchmaking, game client integration.

### Phase 3: Secure Single-Player Game Engine & Rule Alignment
- **Scope**:
  - Refactor `QuizService` to comply strictly with product rules (fixed 30s timer, difficulty-based season scores & coins: 1/1, 2/1, 3/2, 5/3 + 2 completion bonus).
  - Implement 15 daily solo game limit and quitting count logic.
  - Implement repeat question avoidance per user.
  - Ensure `startQuiz` response hides `isCorrect` flags.
- **Acceptance Criteria**:
  - Completing a 5-question quiz calculates exact product-spec coins and season score.
  - Playing 15 games enforces daily cap.
  - No correct answer leakage in network responses.
- **Tests Required**: `QuizService` unit tests for scoring, timing, daily limit, and answer masking.
- **Explicitly Deferred**: 1v1 WebSocket refactoring, store/purchase integration.

### Phase 4: Frontend Game Integration (`ApiGameDataSource`)
- **Scope**:
  - Implement `ApiGameDataSource` in `apps/game` extending `GAME_DATA_SOURCE` interface.
  - Replace mock/demo data sources with live NestJS API endpoints for single-player mode.
- **Acceptance Criteria**:
  - `apps/game` plays end-to-end against live NestJS API.
- **Tests Required**: E2E webapp integration test via Playwright (`webapp-testing`).
- **Explicitly Deferred**: 1v1 multiplayer UI.

### Phase 5: 1v1 Matchmaking & Gamification (Post-MVP)
- **Scope**: Authenticated Socket.IO WebSocket gateway, 1v1 queue matching, daily streak logic, missions, prize claims.

---

## 11. Development Seed Recommendation

To support immediate testing of the single-player game engine and Admin UI, populate the dev database with an idempotent seed script (`apps/api/prisma/seed.ts`):

- **4 Categories**:
  1. عمومی (General Knowledge)
  2. تاریخ و جغرافیا (History & Geography)
  3. سینما و هنر (Cinema & Art)
  4. ورزش (Sports)
- **4 Difficulties**: `EASY`, `MEDIUM`, `HARD`, `VERY_HARD`
- **Volume**: 5 questions per category/difficulty combination = **80 total fixture questions**.
- **Seed Requirements**:
  - Seed MUST be strictly idempotent (`upsert` operations based on stable unique identifiers).
  - Fixtures are for development and automated testing only (not production content).
  - Every question MUST have exactly four options and exactly one correct answer (`isCorrect = true`).
  - AI-generated facts/texts require content specialist review before migrating to production.

---

## 12. Immediate Next Task

**Task**: Execute **Phase 1, Step 1**:
1. Add `"type": "module"` or ESM output configuration to `packages/contracts/tsconfig.json` and export shared `CategoryDto` and `QuestionDto` interfaces.
2. Initialize Prisma migration baseline by running `prisma migrate dev --name init_baseline` in `apps/api`.
3. Create `apps/api/prisma/seed.ts` with 80 idempotent dev fixture questions (4 categories x 4 difficulties x 5 questions) conforming strictly to 4-option / 1-correct-answer constraints.

