# Ralph — Features phase (issues 004–014)

**Use the `/tdd` skill** for all implementation work on this issue.

## Specifications (read, do not duplicate)

Follow the hierarchy in `issues/prd.md` → **Jerarquía de especificaciones y herramientas del agente**.

| Need | Read |
|------|------|
| Acceptance criteria | Current issue `issues/{NNN}-*.md` |
| Functional rules, contracts, testing scope | PRD sections cited by the issue |
| Layers, ports, streams, composition | `.cursor/arquitecture/SAD.md` § 3.1 |
| Commands/events in code | `services/ordering-service/.../domain/messaging/contracts.md` |
| RED-GREEN-REFACTOR, Jest patterns | `/tdd` skill |

Do **not** restate PRD or SAD rules in code comments or new docs. If specs change, update PRD/SAD/contracts — not this file.

## Before coding

1. Current issue + PRD sections for this slice (skip files already in chat context).
2. SAD § 3.1 if touching layers, streams, or composition.
3. `/tdd` skill (`SKILL.md`, `tests.md`, `mocking.md`, `interface-design.md`).
4. List behaviors to test from acceptance criteria — ask user only if ambiguous.

## Execute

- One acceptance criterion (or tight group) per RED → GREEN → REFACTOR cycle (`/tdd`).
- Run `npm test` in each touched service before commit.

Follow [prompt-base.md](prompt-base.md) for commit and close rules.
