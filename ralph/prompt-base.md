# Ralph — Shared rules (all phases)

## Sources of truth

- Functional + data model: `issues/prd.md`
- Architecture: `.cursor/arquitecture/SAD.md`
- Current task: the resolved issue file under `issues/`

## Feedback loops (before commit)

Run tests in every service touched:

```bash
cd services/ordering-service && npm test
cd services/bot-conversation-service && npm test
```

If only one service exists yet, run that one only.

**Do not run `npm run typecheck`** — project is JavaScript.

For infra issues with Docker integration tests, ensure Docker Desktop is available; use ephemeral containers via `docker compose` (see `prompt-infra.md`).

## Commit message

1. Key decisions made
2. Files changed (summary)
3. Blockers or notes for the next issue

## Done criteria

- Acceptance criteria in the issue are satisfied or explicitly documented as deferred
- Tests relevant to the phase pass
- Issue file moved to `issues/done/` when complete (except HITL awaiting human steps — see `prompt-hitl.md`)

## Scope discipline

- Greenfield under `services/` — do not copy patterns from `bot-whatsapp/src/` legacy monolith
- Bot-Conversation-Service never accesses PostgreSQL
- One issue, one commit (when complete)
