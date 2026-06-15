# El Sabor de la Selva — Microservices

Distributed conversational ordering stack (Node.js, Express, PostgreSQL, Redis).

## Local stack (Docker Compose)

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```bash
docker compose up --build
```

| Service           | Host URL                    | Internal dependency |
|-------------------|-----------------------------|---------------------|
| bot-conversation  | http://localhost:3000/health | Redis              |
| ordering          | http://localhost:3001/health | PostgreSQL         |

PostgreSQL and Redis are **not** published to the host; only the two app services expose ports. All containers share the `backend-network` bridge.

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

Stop and remove containers:

```bash
docker compose down
```

## Per-service development

Copy `.env.example` to `.env` in each service directory and adjust values. Never commit `.env` files.

```bash
cd services/ordering-service && npm install && npm test
cd services/bot-conversation-service && npm install && npm test
```

Structure follows the SAD (`services/*/src/modules/<bounded-context>/domain|application|infrastructure`).
