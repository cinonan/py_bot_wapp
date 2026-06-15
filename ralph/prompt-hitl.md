# Ralph — HITL phase (issues 015–016)

Human-in-the-loop deployment tasks. The agent **prepares** artifacts and documentation; the **human validates** environment-specific steps.

## Agent responsibilities

- Implement or refine compose files, README, `.env.example`, scripts, checklists
- Automate only what runs locally without secrets (health checks, compose structure)
- Document step-by-step what the human must do manually
- Do **not** claim production or E2E success without human confirmation

## Human responsibilities

### 015 — Local Windows dev

- Docker Desktop + WSL2 running
- Copy `.env.example` → `.env` with real dev secrets
- HTTPS tunnel to bot webhook (ngrok / Cloudflare Tunnel)
- Full E2E: registro → menú → carrito → pedido → despacho

### 016 — Production VPS

- VPS access, DNS, Certbot/Nginx TLS
- Meta webhook URL pointing to production HTTPS
- Smoke test on live environment

## Workflow

1. Implement all automatable acceptance criteria.
2. Add `## Human validation checklist` to the issue with unchecked items for manual steps.
3. Run `npm test` for any automated parts.
4. **Do not move to `issues/done/`** until the user confirms human checklist items — OR move with explicit `## Progress` note listing pending human steps (user preference: ask if unclear).

## Do not use

- `/tdd` for tunnel setup, DNS, or Meta console configuration
- Committed secrets or real tokens in repo

Follow [prompt-base.md](prompt-base.md) for commit rules.
