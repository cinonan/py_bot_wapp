## Parent PRD

`issues/prd.md`

## What to build

Flujo conversacional completo de identificación y registro de clientes sobre Redis Streams.

Ordering-Service implementa `GetClientByPhone`, `RegisterClient` y eventos `ClientFound` / `ClientNotFound` / `ClientRegistered`. Bot-Conversation-Service implementa estados `AWAITING_REGISTRATION_NAME`, `AWAITING_REGISTRATION_ADDRESS` y `CONFIRMING_ADDRESS` (saludo por nombre para recurrentes), bloqueando acceso al menú hasta identificación completa.

Validación con Zod en dominio de Ordering; validadores conversacionales en dominio del Bot. Demoable enviando mensajes simulados de webhook: usuario nuevo completa registro; usuario existente elige MISMA/NUEVA (la resolución de dirección de pedido se completa en slice 008).

## Acceptance criteria

- [x] `GetClientByPhone` consulta PostgreSQL y responde con `ClientFound` o `ClientNotFound`.
- [x] `RegisterClient` persiste cliente con `telefono`, `nombre`, `direccion_principal` y responde `ClientRegistered`.
- [x] Bot reconoce teléfono al primer mensaje y consulta existencia vía stream.
- [x] Usuario nuevo pasa por registro de nombre y dirección principal con mensajes de error claros ante entrada vacía o inválida.
- [x] Usuario recurrente recibe saludo por nombre y transiciona a `CONFIRMING_ADDRESS`.
- [x] Menú bloqueado hasta identificación completa (estado no avanza a catálogo sin cliente registrado).
- [x] Sesión Redis persiste estado conversacional con TTL de una hora.
- [x] Pruebas unitarias de transiciones de estado y esquemas Zod de registro.
- [x] Prueba de integración: registro nuevo cliente visible en PostgreSQL tras flujo simulado.

## Blocked by

- `issues/003-bus-redis-streams-request-reply.md`

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 4
- User story 6
- User story 7
- User story 38
- User story 70
- User story 78
- User story 87

## Alcance reproceso

Refactor incremental alineado a SAD § 3.1: router conversacional por estado, parser Meta inyectado en composition root, esquemas Zod de eventos cliente en ambos servicios, JSDoc de puertos.
