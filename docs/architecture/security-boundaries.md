# Security Boundaries

This document defines the critical security guarantees required for the application. Refer to historical audits (e.g., `docs/audits/backend-admin-audit.md`) for point-in-time evidence of known gaps.

## Required Guarantees

- **No Correct Answer Leakage**: Correct answers (`isCorrect` flag or similar indicators) must never be exposed to the client before answer submission or timeout.
- **Untrusted Client Identity**: Client-provided identity is never trusted. All identity must be derived from securely verified authentication tokens.
- **Authentication**: Strict HTTP and WebSocket authentication boundaries must be maintained. WebSockets require explicit token validation.
- **Authorization**: All endpoints accessing or modifying user-specific data must perform strict resource-ownership checks.
- **Role Boundaries**: Clear separation between roles. Specifically, content-publication boundaries must be strictly enforced (e.g., Content Specialists draft, Root Admins publish).
- **Abuse Protection**: OTP endpoints and similar sensitive flows must include abuse protection (rate limiting, throttling).
- **Secrets Management**: Secrets and `.env` values must never be committed to the repository.

## Implementation Status

- **Required guarantee**: The system must enforce these rules before production release.
- **Current known gap**: See `docs/audits/backend-admin-audit.md` for a comprehensive list of currently identified violations (e.g., correct answer leakage, unauthenticated WebSockets, unauthorized prize claiming, and role hierarchy violations).
- **Implemented**: To be updated as gaps are resolved.

