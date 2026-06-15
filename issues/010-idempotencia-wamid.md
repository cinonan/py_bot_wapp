## Parent PRD

`issues/prd.md`

## What to build

Idempotencia conversacional end-to-end: cada comando publicado en `bot:events` incluye `wamid` de Meta. Ordering-Service deduplica en caché Redis y en tabla `comandos_procesados` (PostgreSQL) antes de ejecutar efectos secundarios.

Reintentos de webhook con mismo `wamid` no crean pedidos duplicados ni duplican registros de cliente. Comportamiento silencioso o respuesta idempotente correlacionada según tipo de comando.

## Acceptance criteria

- [ ] Bot adjunta `wamid` real (o simulado en tests) a todos los comandos de escritura y consulta.
- [ ] Ordering consulta caché Redis antes de procesar; hit → ignora o responde con resultado previo.
- [ ] Tras procesamiento exitoso, persiste fila en `comandos_procesados` con `wamid` UNIQUE.
- [ ] Segundo `PlaceOrder` con mismo `wamid` no inserta segundo pedido en PostgreSQL.
- [ ] Idempotencia sobrevive reinicio: registro en PostgreSQL evita duplicados si caché Redis expiró.
- [ ] Pruebas unitarias: caso de uso ignora wamid duplicado.
- [ ] Prueba de integración: doble entrega simulada → un solo pedido persistido.

## Blocked by

- `issues/003-bus-redis-streams-request-reply.md`
- `issues/009-cierre-pedido-dni-notificacion-admin.md`

## User stories addressed

- User story 47
- User story 48
- User story 76
