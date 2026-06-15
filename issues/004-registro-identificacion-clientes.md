## Parent PRD

`issues/prd.md`

## What to build

Flujo conversacional completo de identificación y registro de clientes sobre Redis Streams.

Ordering-Service implementa `GetClientByPhone`, `RegisterClient` y eventos `ClientFound` / `ClientNotFound` / `ClientRegistered`. Bot-Conversation-Service implementa estados `AWAITING_REGISTRATION_NAME`, `AWAITING_REGISTRATION_ADDRESS` y `CONFIRMING_ADDRESS` (saludo por nombre para recurrentes), bloqueando acceso al menú hasta identificación completa.

Validación con Zod en dominio de Ordering; validadores conversacionales en dominio del Bot. Demoable enviando mensajes simulados de webhook: usuario nuevo completa registro; usuario existente elige MISMA/NUEVA (la resolución de dirección de pedido se completa en slice 008).

## Acceptance criteria

- [ ] `GetClientByPhone` consulta PostgreSQL y responde con `ClientFound` o `ClientNotFound`.
- [ ] `RegisterClient` persiste cliente con `telefono`, `nombre`, `direccion_principal` y responde `ClientRegistered`.
- [ ] Bot reconoce teléfono al primer mensaje y consulta existencia vía stream.
- [ ] Usuario nuevo pasa por registro de nombre y dirección principal con mensajes de error claros ante entrada vacía o inválida.
- [ ] Usuario recurrente recibe saludo por nombre y transiciona a `CONFIRMING_ADDRESS`.
- [ ] Menú bloqueado hasta identificación completa (estado no avanza a catálogo sin cliente registrado).
- [ ] Sesión Redis persiste estado conversacional con TTL de una hora.
- [ ] Pruebas unitarias de transiciones de estado y esquemas Zod de registro.
- [ ] Prueba de integración: registro nuevo cliente visible en PostgreSQL tras flujo simulado.

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
