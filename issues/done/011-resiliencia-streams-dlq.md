## Parent PRD

`issues/prd.md`

## What to build

Política de errores del consumidor Ordering-Service según PRD (**Política de errores en consumidores**):

| Tipo | Comportamiento |
|------|----------------|
| Transitorio | Sin `XACK`; mensaje en PEL, reintento |
| Permanente — validación | `XACK` + evento `*Failed` correlacionado |
| Agotamiento | Tras `STREAM_MAX_RETRIES` (default 5) → `XACK` + copia a DLQ `ordering:dlq` |

Incluye eventos de fallo faltantes (`CatalogLoadFailed`, etc.), clasificación Zod vs errores de infraestructura, y logs con `correlationId`/`wamid` sin PII explícita.

## Acceptance criteria

- [x] Errores transitorios (timeout DB/Redis simulado) no hacen `XACK`; mensaje reintentado desde PEL.
- [x] Payload inválido (Zod) → `XACK` inmediato + evento de fallo correlacionado; sin reintento.
- [x] Tras N fallos no clasificados (`STREAM_MAX_RETRIES`, default 5), mensaje va a stream `ordering:dlq`.
- [x] DLQ es append-only; no bloquea consumer group principal.
- [x] `CatalogLoadFailed` y demás eventos `*Failed` publicados según contrato.
- [x] Variable `STREAM_MAX_RETRIES` configurable por entorno.
- [x] Pruebas unitarias: clasificación transitorio vs permanente.
- [x] Prueba de integración: payload inválido → `XACK` + fallo; mensaje agotado → entrada en `ordering:dlq`.

## Blocked by

- `issues/003-bus-redis-streams-request-reply.md`

## User stories addressed

- User story 50
