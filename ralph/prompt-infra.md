# Ralph — Infra phase (issues 001–003)

**Do not use `/tdd`.** Use **integration-first**: implement the tracer bullet, then add Jest integration tests that assert observable behavior against **real PostgreSQL and/or Redis** via **ephemeral Docker** (same images as `docker-compose.yml`).

## Workflow

1. **Plan** — List acceptance criteria from the issue; identify which need automated integration tests vs manual verify.
2. **Implement** — Minimal code to satisfy the slice (migrations, seed, compose, stream adapters, health endpoints).
3. **Integrate test** — Add tests under `services/*/tests/integration/` (or documented equivalent).
4. **Manual verify** (when AC requires) — Document commands in issue progress or README.
5. **Refactor** — Only after tests pass.

## Integration test strategy (ephemeral Docker)

- Start dependencies with `docker compose` (profile `test` or documented one-off `docker run`) before the suite; tear down after.
- Use `globalSetup` / `globalTeardown` in Jest, or a small npm script `test:integration` that wraps compose lifecycle.
- Never hit production compose services; use isolated ports/volumes for test runs.
- Prefer the same PostgreSQL and Redis image versions as dev compose.

## Per-issue expectations

### 001 — PostgreSQL schema + seed

Automated (required by AC):

- Apply migrations on empty database
- Run seed twice (repeatable)
- Assert FK, CHECK on `pedidos.estado`, snapshot columns, seed data with `activo = true`

Manual optional: hit `/health` on running service.

### 002 — Microservices + compose

Primary validation **manual**: `docker compose up`, both `/health` endpoints OK, PG/Redis not exposed publicly.

Automated: Jest configured with `npm test`; smoke test allowed but not required for every AC.

### 003 — Redis Streams request-reply

Automated (required by AC):

- Round-trip `Ping` → `Pong` with matching `correlationId`
- Metadatos: `wamid`, `correlationId`, `phone`, `timestamp`
- `XACK` only after successful processing

Manual optional: graceful shutdown under SIGTERM.

## Anti-patterns

- Mocking PostgreSQL or Redis in these integration tests
- Using `/tdd` red-green loops for DDL or compose scaffolding
- Skipping integration tests when the issue AC explicitly requires them (001, 003)

Follow [prompt-base.md](prompt-base.md) for commit and close rules.
