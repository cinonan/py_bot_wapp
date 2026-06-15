# Issue phase routing

Used by `/ralph {NNN}` to select implementation mode.

| Issue | Phase | Mode |
|-------|-------|------|
| 001 | infra | Integration-first + ephemeral Docker for PG tests |
| 002 | infra | Scaffold + compose; manual health verify |
| 003 | infra | Integration-first + ephemeral Docker for Redis round-trip |
| 004 | features | `/tdd` |
| 005 | features | `/tdd` |
| 006 | features | `/tdd` |
| 007 | features | `/tdd` |
| 008 | features | `/tdd` |
| 009 | features | `/tdd` |
| 010 | features | `/tdd` |
| 011 | features | `/tdd` |
| 012 | features | `/tdd` |
| 013 | features | `/tdd` |
| 014 | features | `/tdd` |
| 015 | hitl | Agent prepares; human runs E2E + tunnel |
| 016 | hitl | Agent prepares; human configures VPS/DNS/Meta |
| 017 | cleanup | Agent or manual; smoke gates required |

## Dependency order (reference)

```
001 → 002 → 003 ─┬→ 004 ─┐
                 ├→ 005 ─┼→ 006 → 007 → 008 → 009 ─┬→ 010
                 ├→ 011  │                           ├→ 012 ─┐
                 └→ 014  │                           └→ (013 after 007)
                          └───────────────────────────────────────────┘
012 + 013 → 015 → 016 → 017
```

Parallel after 003: `004`, `005`, `011`, `014` (014 only needs 002).
