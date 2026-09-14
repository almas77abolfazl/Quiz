# Quiz Platform - Implementation Plan

## Goal
Rebuild the quiz platform from scratch as a modern, production-ready application with Angular 22, NestJS 11, PostgreSQL, Docker, and a monthly competition system with real prizes via Zarinpal.

---

## Core Decisions

### Tech Stack (Latest Versions)
- **Frontend**: Angular 22 + Angular Material 22 + Signals + standalone components (NgRx can be introduced when global client state warrants it)
- **Backend**: NestJS 11 + TypeScript
- **Database**: PostgreSQL 16 (replaces MongoDB)
- **Real-time**: Socket.IO (via NestJS WebSocket gateway)
- **Payments**: Zarinpal (sandbox → production via env)
- **Mobile**: Capacitor 6 (wraps Angular app for Android/iOS)
- **Infrastructure**: Docker + Docker Compose

### Architecture Principles
- Fresh start — do not refactor existing code
- All project documentation lives in `docs/` folder (agent-readable)
- Environment config via `.env` files, no hardcoded secrets
- Soft deletes everywhere (`deletedAt`)
- Iranian timezone (Asia/Tehran) for all date operations

---

## Project Structure

```
Quiz/
├── client/                 # Angular 22 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Services, guards, interceptors
│   │   │   ├── shared/     # Shared components, pipes, directives
│   │   │   ├── features/   # Feature modules (admin, wallet, competition, 1v1)
│   │   │   └── layouts/    # Layout components
│   │   └── assets/
│   └── ...
├── server/                 # NestJS 11 app
│   ├── src/
│   │   ├── common/         # Shared decorators, filters, pipes
│   │   ├── modules/
│   │   │   ├── auth/       # Authentication (JWT + bcrypt)
│   │   │   ├── user/       # User management
│   │   │   ├── category/   # Quiz categories
│   │   │   ├── question/   # Questions CRUD
│   │   │   ├── quiz/       # Single-player quiz engine
│   │   │   ├── quiz-1v1/   # 1v1 matchmaking + battle
│   │   │   ├── competition/# Monthly rankings + winners
│   │   │   ├── payment/    # Zarinpal integration + coin purchase
│   │   │   ├── chat/       # Global chat
│   │   │   └── admin/      # Admin dashboard (merged into features)
│   │   └── main.ts
│   └── ...
├── docs/                   # Agent-readable documentation
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── deployment.md
│   └── decisions.md
├── docker-compose.yml
├── Dockerfile.client
├── Dockerfile.server
└── README.md
```

---

## Database Schema (PostgreSQL via Prisma ORM)

### User
```prisma
model User {
  id            String   @id @default(uuid())
  phone         String   @unique
  password      String?  // Optional: set when user creates password after OTP registration
  firstName     String?
  lastName      String?
  role          Role     @default(USER)
  coins         Int      @default(0)
  monthlyScore  Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  
  transactions  Transaction[]
  competitions  CompetitionEntry[]
  quizzes       Quiz[]
  messages      Message[]
  matches1v1    MatchParticipant[]
}
```

### Category
```prisma
model Category {
  id          String   @id @default(uuid())
  title       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  questions   Question[]
}
```

### Question
```prisma
model Question {
  id          String   @id @default(uuid())
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  questionText String
  options     Json     // [{id, text, isAnswer}]
  level       Level    @default(EASY)
  timeLimit   Int      @default(20) // seconds, overridable per question
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  
  quizAnswers QuizAnswer[]
  matchRounds MatchRound[]
}
```

### Quiz (single-player)
```prisma
model Quiz {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  categoryId  String
  level       Level
  score       Int
  totalQuestions Int
  coinsEarned Int      @default(0)
  completedAt DateTime?
  createdAt   DateTime @default(now())
  
  answers     QuizAnswer[]
}
```

### QuizAnswer
```prisma
model QuizAnswer {
  id         String  @id @default(uuid())
  quizId     String
  quiz       Quiz    @relation(fields: [quizId], references: [id])
  questionId String
  answerId   String?
  isCorrect  Boolean
  createdAt  DateTime @default(now())
}
```

### Transaction (coin purchases only — no wallet)
```prisma
model Transaction {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  amount        Int           // Toman
  coins         Int           // Coins purchased
  status        PaymentStatus @default(PENDING)
  authority     String?       // Zarinpal authority
  refId         String?       // Zarinpal refId after success
  description   String?
  createdAt     DateTime      @default(now())
}
```

### Competition
```prisma
model Competition {
  id          String   @id @default(uuid())
  year        Int
  month       Int      // 1-12
  startDate   DateTime
  endDate     DateTime
  prizes      Json     // [{rank: 1, amount: 5000000}, ...]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  entries     CompetitionEntry[]
}
```

### CompetitionEntry
```prisma
model CompetitionEntry {
  id            String      @id @default(uuid())
  competitionId String
  competition   Competition @relation(fields: [competitionId], references: [id])
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  score         Int
  rank          Int?
  prizeAmount   Int?
  prizePaid     Boolean     @default(false)
  createdAt     DateTime    @default(now())
}
```

### Match (1v1)
```prisma
model Match {
  id          String   @id @default(uuid())
  roomId      String   @unique
  categoryId  String
  level       Level
  status      MatchStatus @default(WAITING)
  totalRounds Int      @default(5)
  winnerId    String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
  
  participants MatchParticipant[]
  rounds       MatchRound[]
}
```

### MatchParticipant
```prisma
model MatchParticipant {
  id        String   @id @default(uuid())
  matchId   String
  match     Match    @relation(fields: [matchId], references: [id])
  userId    String
  score     Int      @default(0)
  createdAt DateTime @default(now())
}
```

### MatchRound
```prisma
model MatchRound {
  id         String   @id @default(uuid())
  matchId    String
  match      Match    @relation(fields: [matchId], references: [id])
  roundIndex Int
  questionId String
  createdAt  DateTime @default(now())
}
```

### Message (chat)
```prisma
model Message {
  id        String   @id @default(uuid())
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  deletedAt DateTime?
}
```

---

## API Endpoints

### Auth (Phone + OTP)
- `POST /auth/send-otp` — Send OTP to phone number
- `POST /auth/verify-otp` — Verify OTP, get access token
- `POST /auth/refresh` — Refresh access token
- `GET /auth/validate` — Validate current token
- `POST /auth/set-password` — Set password for account (optional)

### Categories
- `GET /categories` — List all
- `POST /categories` — Create (admin)
- `PUT /categories/:id` — Update (admin)
- `DELETE /categories/:id` — Soft delete (admin)

### Questions
- `GET /questions?categoryId&level` — List/filter
- `POST /questions` — Create (admin)
- `PUT /questions/:id` — Update (admin)
- `DELETE /questions/:id` — Soft delete (admin)
- `PUT /questions/:id/time-limit` — Update time limit (admin)

### Quiz (Single-player)
- `POST /quiz/start` — Start new quiz
- `POST /quiz/:id/answer` — Submit answer
- `POST /quiz/:id/finish` — Finish quiz, earn coins
- `GET /quiz/history` — User's quiz history

### 1v1 Quiz
- `POST /quiz/1v1/join` — Join matchmaking queue
- `GET /quiz/1v1/history` — User's 1v1 match history
- Socket.IO events (see below)

### Competition
- `GET /competition/current` — Active competition + top 10
- `GET /competition/ranking` — Full ranking (paginated)
- `POST /competition/end-month` — Admin ends month, selects winners

### Payment (Zarinpal)
- `POST /payment/request` — Create payment request for coin purchase
- `GET /payment/callback` — Zarinpal callback (public)
- `POST /payment/verify` — Verify payment

### Transactions
- `GET /transactions` — User's transaction history

### Chat
- `GET /chat/messages` — Recent messages
- Socket.IO: `send_message`, `receive_message`

---

## Socket.IO Events (1v1)

| Event | Direction | Payload |
|---|---|---|
| `join_matchmaking` | Client → Server | `{ categoryId, level }` |
| `match_found` | Server → Client | `{ matchId, roomId, opponent: { userId, username } }` |
| `opponent_joined` | Server → Both | `{ userId, username }` |
| `round_start` | Server → Both | `{ question, roundIndex, totalRounds }` |
| `submit_answer` | Client → Server | `{ matchId, roundIndex, answerId }` |
| `round_result` | Server → Both | `{ yourScore, opponentScore, roundIndex }` |
| `match_end` | Server → Both | `{ winnerId, yourScore, opponentScore, coinsEarned, monthlyScoreEarned }` |

---

## Coin Economy

### Earning
- Offline quiz: 10 coins per correct answer + 50 completion bonus
- 1v1 match: Winner gets 100 coins, loser gets 25 coins

### Spending
- Users can purchase coins via Zarinpal (see Payment section)
- Coin packages: 1000 (50k Toman), 5000 (200k Toman), 10000 (400k Toman)
- Future: hints, cosmetic items, tournament entry fees

---

## Question Timer

### Configuration
- Each difficulty has a default time limit:
  - easy: 20s
  - medium: 15s
  - hard: 10s
  - veryHard: 5s
- Admin can override per question via `PUT /questions/:id/time-limit`
- Timer displayed in quiz UI, auto-submits when time runs out

---

## Monthly Competition

### Scoring
- `monthlyScore` on User increments with each quiz completion
- Reset to 0 on first quiz of a new month
- Ranking: `ORDER BY monthlyScore DESC`

### Prizes
- Admin configures prize pool in `Competition.prizes` (JSON)
- Winners selected by rank at month end
- Prize distribution handled **offline** by support:
  - Support contacts winner via phone
  - Arranges bank transfer or in-person delivery
  - Marks `prizePaid = true` in system

### Month Transition
- When user plays first quiz of new month: if no active `Competition`, create one
- Admin can manually trigger `POST /competition/end-month`

---

## 1v1 Matchmaking

### Flow
1. User selects category + level → calls `POST /quiz/1v1/join`
2. Server adds to queue keyed by `categoryId:level`
3. On match: create `Match` + 2 `MatchParticipant` records, emit `match_found`
4. 5 rounds: server sends question, both answer, server tracks scores
5. After 5 rounds: determine winner by score, emit `match_end`
6. Award coins and monthlyScore based on result

### Disconnect Policy
- 15-second timeout: if player disconnects, opponent auto-wins
- Disconnected player gets 0 coins

---

## Zarinpal Integration

### Coin Purchase Flow
1. User selects coin package (e.g., 1000 coins = 50,000 Toman)
2. Client calls `POST /payment/request` with `amount` and `coins`
3. Server creates `Transaction` (status: PENDING), calls Zarinpal API
4. User redirected to Zarinpal gateway
5. Zarinpal redirects to `GET /payment/callback?Authority=...&Status=...`
6. Server verifies, updates `Transaction` to SUCCESS, credits user coins
7. If failed: updates to FAILED, no coins credited

### Environment
- Sandbox: `ZARINPAL_SANDBOX=true`, merchant ID `123456789012345678901234`
- Production: `ZARINPAL_SANDBOX=false`, real merchant ID in `.env`
- Callback URL configurable via `ZARINPAL_CALLBACK_URL` env var

---

## Admin Panel

### Sections
- **Dashboard**: Stats (total users, active quizzes, revenue)
- **Categories**: CRUD
- **Questions**: CRUD, bulk import
- **Users**: View, ban, role management
- **Competitions**: Set prizes, view rankings, end month, mark prizes paid
- **Transactions**: View all payment transactions
- **1v1 Monitor**: Active matches count, recent results

---

## Docker Setup

### Services
- `client`: Angular app (nginx serving built app)
- `server`: NestJS app
- `postgres`: PostgreSQL 16
- `redis`: For Socket.IO scaling (future)
- `pgadmin`: Optional, for DB management

### Volumes
- `postgres_data`: Persistent DB
- `client_build`: Angular dist
- `server_logs`: App logs

### Networks
- `quiz-network`: Internal communication

---

## Documentation (`docs/`)

### Required Documents
1. **architecture.md** — System overview, module diagram, tech choices
2. **database.md** — Schema, relationships, migration guide
3. **api.md** — All endpoints, request/response examples, auth requirements
4. **deployment.md** — Docker setup, env vars, CI/CD
5. **decisions.md** — ADR (Architecture Decision Records)

---

## Implementation Order

1. **Project scaffolding** — new repo structure, Docker, PostgreSQL, Prisma
2. **Auth module** — phone OTP send/verify, JWT, guards, optional password set
3. **User + Category + Question modules** — core CRUD, time limits per question
4. **Quiz engine** — single-player flow, coin awarding, timer logic
5. **Competition module** — ranking, month management
6. **Payment module** — Zarinpal coin purchase
7. **1v1 module** — matchmaking, Socket.IO battles, match history
8. **Chat module** — basic global chat
9. **Admin module** — dashboard, management pages, question time limit editor
10. **Frontend** — Angular 22 app, OTP login, wallet page, competition page, 1v1 UI, match history
11. **Mobile** — Capacitor setup, push notifications
12. **Docker + Deployment** — Compose, env configs

---

## Key Design Decisions

- **Mobile framework**: Capacitor (reuse Angular codebase)
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: Phone number + OTP (no email/username)
- **Login required**: Yes, all quiz features require authentication
- **Ranking basis**: `monthlyScore` field on User, reset at first quiz of new month
- **1v1 entry fee**: Free
- **1v1 match**: 5 questions per match
- **1v1 disconnect**: 15s timeout, opponent auto-wins
- **Coin earning**: 10 per correct answer, 50 quiz completion bonus
- **1v1 rewards**: Winner 100 coins + 50 monthlyScore, loser 25 coins + 10 monthlyScore
- **Coins purchasable**: Yes, via Zarinpal
- **Question timer**: Default per difficulty, overridable per question via admin
- **Match history**: Detailed view per match (answers, opponent, result) like chess.com
- **Question bulk import**: Out of scope for v1
- **Zarinpal**: Sandbox during dev, production via `ZARINPAL_SANDBOX=false` env var

---

## Out of Scope (v1)

- Question bulk import from Excel/CSV
- Coin spending features (hints, cosmetics, tournament entry)
- Push notifications
