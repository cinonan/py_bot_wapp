## Parent PRD

`issues/prd.md`

## What to build

Estructura física del ecosistema según vista de desarrollo del SAD: `services/bot-conversation-service/` y `services/ordering-service/` bajo `bot-whatsapp/`, más un `docker-compose.yml` que levante PostgreSQL, Redis y ambos servicios con red interna `backend-network`.

Cada servicio incluye `package.json`, composition root manual, Jest configurado y variables de entorno documentadas (sin secretos en repo). El Bot-Conversation-Service arranca con bootstrap Express mínimo; el Ordering-Service reutiliza el bootstrap de `issues/001-esquema-postgresql-seed-ordering-service.md`.

Verificable ejecutando `docker compose up` en la laptop y confirmando health checks de ambos servicios con PostgreSQL y Redis conectados.

## Acceptance criteria

- [x] Carpetas `services/bot-conversation-service/` y `services/ordering-service/` existen con empaquetamiento vertical por bounded context.
- [x] `docker-compose.yml` orquesta: `postgres`, `redis`, `ordering`, `bot-conversation`.
- [x] Servicios conectados por red aislada; puertos de PostgreSQL y Redis no expuestos al host en configuración base (acceso vía red Docker).
- [x] Variables de entorno inyectadas por servicio vía `.env.example` (sin valores reales).
- [x] Ambos servicios exponen `/health` funcional.
- [x] Jest configurado en ambos `package.json` con script `test`.
- [x] El Bot-Conversation-Service no contiene dependencias ni código de acceso a PostgreSQL.
- [x] Documentación breve de arranque local incluida (README o comentario en compose).

## Blocked by

- `issues/001-esquema-postgresql-seed-ordering-service.md`

## User stories addressed

- User story 43
- User story 45
- User story 46
- User story 61
- User story 62
- User story 65
- User story 67
- User story 70
- User story 71
- User story 80

## Alcance reproceso: 
solo refactor incremental