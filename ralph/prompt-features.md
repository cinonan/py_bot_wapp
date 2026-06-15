# Ralph — Features phase (issues 004–014)

**Use the `/tdd` skill** for all implementation work on this issue.

## Before coding

1. Read `/tdd` skill and linked files (`tests.md`, `mocking.md`, `interface-design.md`).
2. Read PRD **Testing Decisions** and **Contratos de mensajería** for this slice.
3. List behaviors to test (from acceptance criteria) — confirm with user only if ambiguous.

## Stack and architecture

- **JavaScript + Jest** (not TypeScript)
- **Clean Architecture**: domain pure → application use cases + ports → infrastructure adapters
- **Mock** at port boundaries in application unit tests; **real** PostgreSQL/Redis in integration tests where PRD requires
- Bot never sends price/name in write commands; Ordering owns snapshots
- `PlaceOrder` must include `direccion_entrega`; NUEVA address does not call `UpdateClientAddress`

## TDD loop (vertical slices)

For each acceptance criterion (or small group):

```
RED   → one test, one behavior, public interface
GREEN → minimal code to pass
REFACTOR → extract duplication; run tests after each step
```

Do **not** write all tests then all code (horizontal slicing).

## Test layers for this project

| Layer | What | How |
|-------|------|-----|
| Domain | Validators, state machine, Zod schemas, cart merge, order state rules | Unit, no mocks |
| Application | Use cases with ports | Unit, mock ports |
| Infrastructure | Webhook signature, stream adapters, repositories | Integration with Docker PG/Redis when AC requires |
| Bot flows | Command publish + event consume | Integration streams tests |

## Boundaries — do not mock

- Domain logic
- Zod validation rules
- Internal modules you own

## Boundaries — mock or fake

- `OrderRepositoryPort`, `CartStorePort`, `EventPublisherPort`, etc. in application tests
- Meta Graph API (manual sandbox only per PRD)

## Feedback

Run `npm test` in each touched service before commit.

Follow [prompt-base.md](prompt-base.md) for commit and close rules.
