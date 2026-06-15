## Parent PRD

`issues/prd.md`

## What to build

Capa HTTP de entrada del Bot-Conversation-Service: verificación GET del webhook Meta, recepción POST con validación `X-Hub-Signature-256` antes de procesar payload, respuesta HTTP 200 rápida tras encolar trabajo, e ignorar payloads de estado (delivery receipts).

Gestión de sesión conversacional en Redis (TTL 1 h) independiente del carrito. Credenciales vía `process.env.*` (`WA_VERIFY_TOKEN`, `WA_APP_SECRET`, tokens Meta).

Verificable con tests del validador de firma y simulación de POST válido/inválido sin depender del flujo de negocio completo.

## Acceptance criteria

- [ ] `GET /webhook` valida `hub.verify_token` contra `WA_VERIFY_TOKEN` y responde challenge de Meta.
- [ ] `POST /webhook` rechaza con HTTP 401/403 si `X-Hub-Signature-256` es inválida o ausente.
- [ ] `POST /webhook` con firma válida responde HTTP 200 en menos de 5 s tras encolar procesamiento.
- [ ] Payloads de status/delivery no disparan máquina de estados.
- [ ] Adaptador Redis de sesión operativo con TTL configurable (default 1 h).
- [ ] Sin secretos hardcodeados; composition root inyecta configuración desde entorno.
- [ ] Pruebas unitarias del validador HMAC (payload + secreto → aceptar/rechazar).
- [ ] Prueba de integración: POST firmado correctamente retorna 200; POST sin firma retorna 401/403.

## Blocked by

- `issues/002-estructura-microservicios-docker-compose.md`

## User stories addressed

- User story 8
- User story 49
- User story 53
- User story 55
- User story 71
- User story 86
