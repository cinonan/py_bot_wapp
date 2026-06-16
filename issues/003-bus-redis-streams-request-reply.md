## Parent PRD

`issues/prd.md`

## What to build

Infraestructura de mensajería asíncrona end-to-end entre ambos microservicios: streams `bot:events` y `ordering:events`, Consumer Groups con entrega at-least-once, `XACK` explícito y patrón request-reply por `correlationId`.

Implementar un comando de prueba (p. ej. `Ping` / evento `Pong`) que demuestre publicación desde Bot-Conversation-Service, consumo en Ordering-Service, respuesta correlacionada y acknowledgment. Incluir graceful shutdown básico del consumidor para no perder mensajes in-flight.

Contratos documentados en el bounded context de ordering (referencia PRD sección **Contratos de mensajería**).

## Acceptance criteria

- [x] Streams `bot:events` y `ordering:events` creados con Consumer Groups operativos.
- [x] Bot publica comando con metadatos obligatorios: `wamid`, `correlationId`, `phone`, `timestamp`.
- [x] Ordering consume, procesa y publica evento de respuesta correlacionado por `correlationId`.
- [x] Mensaje recibe `XACK` solo tras procesamiento exitoso.
- [x] Bot espera respuesta con timeout configurable; ante timeout envía mensaje de espera sin perder sesión.
- [x] Graceful shutdown: al recibir SIGTERM el consumidor completa o devuelve mensajes in-flight a PEL.
- [x] Prueba de integración verifica round-trip completo Bot → Ordering → Bot.
- [x] Contratos de mensajes documentados (comandos/eventos base + metadatos).

## Blocked by

- `issues/002-estructura-microservicios-docker-compose.md`

## User stories addressed

- User story 38
- User story 39
- User story 40
- User story 41
- User story 49
- User story 66
- User story 82

## Alcance reproceso: 
solo refactor incremental