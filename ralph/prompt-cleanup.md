# Ralph — Cleanup phase (issue 017)

Retire the legacy monolith after the new ecosystem is validated.

## Preconditions (blockers)

- `issues/done/015-*` — local E2E validated
- `issues/done/016-*` — production smoke validated

If blockers are not done, stop.

## Workflow

1. Verify no operational docs point to `bot-whatsapp/src/` monolith entrypoints.
2. Remove legacy files listed in the issue (controllers, models, monolithic `app.js`, etc.).
3. Update root/`bot-whatsapp` `package.json` and README for `services/` only.
4. Grep repo for `webhookController` and direct pg access from bot — remove or update stale references.
5. Run `npm test` in both microservices.
6. Optional manual smoke after deletion.

## Testing

No new feature TDD. Verification = tests pass + acceptance criteria + optional human smoke.

Agent or human may execute; follow [prompt-base.md](prompt-base.md).
