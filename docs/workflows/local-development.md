# Local Development & Database Setup

This guide explains how to set up, migrate, and seed the local PostgreSQL database for the Quiz monorepo.

> [!WARNING]
> Seed data consists strictly of fixtures for local testing and development. Questions are fixtures and not approved production content. Never run the seed against production environments.

## 1. Start PostgreSQL Container

Ensure Docker Desktop is running, then start the PostgreSQL service:

```bash
pnpm db:up
```

To check container status:

```bash
pnpm db:status
```

## 2. Apply Database Migrations

Apply pending Prisma migrations to synchronize the database schema:

```bash
pnpm prisma:migrate:deploy
```

Or check migration status:

```bash
pnpm prisma:migrate:status
```

## 3. Seed Development Database

Run the idempotent database seed command:

```bash
pnpm prisma:seed
```

Or via the NestJS API package filter:

```bash
pnpm --filter @quiz/api prisma:seed
```

The seed script is safe to rerun multiple times (`pnpm prisma:seed`). It uses deterministic IDs and upserts to avoid duplicate records or unique constraint violations. When the seed runs, the seed-owned active development season is automatically recalculated and updated to match the current Jalali year and month.

## 4. Seeded Development Accounts

The following fictional accounts are seeded for local testing:

| Username | Role | Phone | Usage |
| --- | --- | --- | --- |
| `dev.root` | `ROOT_ADMIN` | `09120000001` | Content reviewer & administrator identity |
| `dev.content` | `CONTENT_SPECIALIST` | `09120000002` | Create & manage category/question drafts |
| `dev.support` | `SUPPORT` | `09120000003` | Support & user reports management |
| `dev.player1` | `PLAYER` | `09120000004` | Solo gameplay & player flows |
| `dev.player2` | `PLAYER` | `09120000005` | 1v1 matchmaking & player flows |

> [!NOTE]
> All accounts are fictional local-development identities with reserved Iranian phone numbers (`09120000001` - `09120000005`). No real person's phone number or personal data is stored.

## 5. Obtaining Development OTPs

Authentication follows the standard OTP flow (`POST /api/auth/otp` -> `POST /api/auth/verify`).

No fixed OTP or bypass exists. In local development (`NODE_ENV=development`), `OtpDeliveryService` outputs generated OTP codes directly to the local API console log:

```text
[Nest] LOG [OtpDeliveryService] Development OTP generated for 09120000001: XXXXXX
```

To log in as development staff:
1. Call `POST /api/auth/otp` with `{"phone": "09120000001"}`.
2. Read the 6-digit code logged in the local API console output.
3. Call `POST /api/auth/verify` with `{"phone": "09120000001", "code": "XXXXXX"}` to receive access tokens.
