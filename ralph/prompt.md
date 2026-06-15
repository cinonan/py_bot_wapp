# Ralph (legacy entry — use `/ralph {NNN}` in Cursor)

This file is kept for compatibility. **Prefer invoking the Cursor skill:**

```
/ralph 001
/ralph 006
/ralph 015
```

The skill lives at `.cursor/ralph/SKILL.md` and routes by phase:

| Issues | Prompt |
|--------|--------|
| 001–003 | [prompt-infra.md](prompt-infra.md) |
| 004–014 | [prompt-features.md](prompt-features.md) + `/tdd` |
| 015–016 | [prompt-hitl.md](prompt-hitl.md) |
| 017 | [prompt-cleanup.md](prompt-cleanup.md) |

Routing table: [phases.md](phases.md). Shared rules: [prompt-base.md](prompt-base.md).

## Single-task rule

Each invocation implements **one** issue. Pass the issue number to the skill; do not auto-pick the next task.
