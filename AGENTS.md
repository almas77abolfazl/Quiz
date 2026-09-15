# Agent Guidelines & Repository Map

## 1. Workspace Map

- `apps/game`: Angular v20+ Web & Mobile (Capacitor) game application (Port 4200)
- `apps/admin`: Angular Admin control panel (Port 4201)
- `apps/api`: NestJS API and Realtime Socket.IO server (Port 3000)
- `packages/contracts`: Shared TypeScript DTOs, interfaces, and API contracts (`@quiz/contracts`)
- `.agents/skills`: Portable, tool-agnostic Agent Skills repository (Canonical source)
- `.kilo`: Kilo IDE specific settings and configurations
- `docs/product`: Comprehensive product, architecture, and game specifications

## 2. Product Documentation References

Product rules and specifications are maintained in `docs/product`. Refer to:
- [Product Brief](file:///e:/Projects/Quiz/docs/product/product-brief.md)
- [Game Rules & Scoring](file:///e:/Projects/Quiz/docs/product/game-rules.md)
- [Architecture Direction](file:///e:/Projects/Quiz/docs/product/architecture-direction.md)
- [Open Decisions](file:///e:/Projects/Quiz/docs/product/open-decisions.md)

## 3. Directory Responsibilities

- `.agents/skills`: Primary canonical location for portable agent skills (`angular-component`, `angular-signals`, `webapp-testing`).
- `.kilo`: Reserved strictly for Kilo-specific IDE settings (`kilo.json`, agent profiles).
- `docs`: Product rules, architectural decisions, and development documentation.

## 4. Required Angular Skills & Coding Standards

When working on Angular applications (`apps/game`, `apps/admin`), follow the skills:
- `angular-component` (`.agents/skills/angular-component/SKILL.md`)
- `angular-signals` (`.agents/skills/angular-signals/SKILL.md`)

### Modern Angular Standards (v20+)
- **Standalone by Default**: Components are standalone by default in Angular v20+. Do **NOT** set `standalone: true`.
- **Inputs**: Use `input()` / `input.required()` signal inputs instead of `@Input()` decorators.
- **Outputs**: Use `output()` instead of `@Output()` or `EventEmitter`.
- **Output Naming**: Use natural action names without `on` prefix (e.g., `clicked = output<void>()`, `profileClicked = output<void>()`).
- **State Management**:
  - `signal()` for owned synchronous component state.
  - `computed()` for derived reactive state.
  - `linkedSignal()` only when dependent state requires explicit reset on source change.
  - `toSignal()` / `toObservable()` for RxJS stream interop.
  - Do **NOT** use `effect()` for state derivation.
- **Change Detection**: Always use `ChangeDetectionStrategy.OnPush`.
- **Control Flow**: Use native `@if`, `@else`, `@for`, `@switch`, `@case`, `@default`. Do **NOT** use `*ngIf`, `*ngFor`, `*ngSwitch`.
- **Class & Style Bindings**: Use direct class/style bindings (`[class.active]="..."`, `[style.width.%]="..."`). Avoid `ngClass` and `ngStyle`.
- **Dependency Injection**: Use `inject(Service)` instead of constructor parameter injection.
- **Subscriptions & Timers**: Always handle subscription cleanup using `takeUntilDestroyed()`. Clean up all timers on component destroy or when resetting state.
- **File Structure**: Split substantial feature components into `.component.ts`, `.component.html`, and `.component.scss`. Keep components inline only when they are small presentational primitives (< 150 lines).

## 5. API & Contract Boundaries

- All cross-package API payloads must use types from `@quiz/contracts`.
- Feature UI components in `apps/game` must **never** directly depend on concrete demo data services.
- Access data exclusively through the `GameFacade` and the `GAME_DATA_SOURCE` abstraction layer.
- Never expose correct answer indices or answers to client-facing question view models.

## 6. Verification Commands

Before completing any task, run:
- `pnpm --filter @quiz/game build`
- `pnpm --filter @quiz/game test`
- `pnpm run build`
- `git diff --check`

## 7. Git Safety Rules

- **STRICT PROHIBITION**: Do **NOT** run `git commit` or `git push` without explicit user request.
- Keep all temporary review files and screenshot artifacts outside tracked source directories.

