---
name: tdd
description: >-
  Test-driven development with red-green-refactor loop. Use when a task requires
  TDD, the user mentions red-green-refactor or test-first development, or an
  orchestrator (e.g. /ralph) routes to a features phase.
---

# Test-Driven Development

Generic TDD workflow for this repository. For **scope, architecture, and test layers** per task, consult `issues/prd.md` (**Jerarquía de especificaciones**, **Testing Decisions**) and `.cursor/arquitecture/SAD.md` § 3.1 — do not duplicate those rules here.

## Stack (this project)

- **Language:** JavaScript (not TypeScript)
- **Runtime:** Node.js
- **Test runner:** Jest
- **HTTP:** Express (when applicable)

Run tests in the affected service:

```bash
cd services/<service-name> && npm test
```

Do not run `npm run typecheck` — it does not apply.

Implementation and tests are written in **JavaScript** using **Jest** (`test`, `expect`, `jest.fn`, `jest.mock` at boundaries only).

## Philosophy

**Core principle**: Tests verify behavior through **public interfaces**, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** exercise real code paths through public APIs. They describe _what_ the system does, not _how_. They survive refactors.

**Bad tests** mock internal collaborators, test private methods, or assert call order. If a rename breaks tests but behavior is unchanged, those tests were testing implementation.

See [tests.md](tests.md) and [mocking.md](mocking.md).

## Anti-pattern: horizontal slices

**DO NOT** write all tests first, then all implementation.

```
WRONG:  RED test1, test2, test3…  →  GREEN impl1, impl2, impl3…
RIGHT:  RED test1 → GREEN impl1 → RED test2 → GREEN impl2 …
```

One behavior per cycle (tracer bullet).

## Workflow

### 1. Planning

- [ ] Read the current task's acceptance criteria
- [ ] Identify public interfaces to test ([interface-design.md](interface-design.md))
- [ ] List behaviors to test (WHAT, not HOW)
- [ ] Note which tests are unit vs integration (from project docs)
- [ ] Confirm priorities with user if criteria are ambiguous

### 2. Tracer bullet

```
RED:   One test, one behavior → fails
GREEN: Minimal code → passes
```

### 3. Incremental loop

RED → GREEN for each remaining behavior. Don't anticipate future tests.

### 4. Refactor

After green, apply [refactoring.md](refactoring.md). **Never refactor while RED.**

Run `npm test` in every touched service before commit.

## Checklist per cycle

```
[ ] Test name describes behavior
[ ] Public interface only
[ ] Would survive internal refactor
[ ] Minimal code for this test
[ ] No speculative features
[ ] JavaScript + Jest syntax
```

## When NOT to use this skill

Some tasks are **infra, deployment, or manual validation** — an orchestrator should route those elsewhere. Use TDD only when the task is feature logic with automatable acceptance criteria.
