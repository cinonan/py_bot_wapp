## Parent PRD

`issues/prd.md`

## What to build

Capa de robustez conversacional transversal: ignorar mensajes no-texto, manejar payloads de estado de webhook, mensajes fallback ante errores inesperados, re-prompt en opciones inválidas sin reiniciar carrito, e indicaciones consistentes por estado.

Complementa flujos ya implementados en slices 004–009; verificable con casos borde simulados vía webhook.

## Acceptance criteria

- [ ] Mensajes de voz, imagen u otros tipos no-texto ignorados con respuesta opcional amigable o silencio seguro (sin crash).
- [ ] Payloads de delivery/status de Meta no alteran sesión ni carrito.
- [ ] Error inesperado en handler → mensaje fallback al usuario; servicio sigue operativo.
- [ ] Opción de menú inválida en `PROVIDING_MENU` u otros estados → re-prompt sin `ClearCart`.
- [ ] Cada estado emite prompt claro sobre la entrada esperada (documentado o testeado por transición).
- [ ] Pruebas unitarias cubren transiciones con entrada inválida y recuperación.
- [ ] Prueba de integración: secuencia con error de usuario recuperable mantiene carrito intacto.

## Blocked by

- `issues/007-carrito-multiproducto-snapshots.md`

## User stories addressed

- User story 83
- User story 84
- User story 85
- User story 86
- User story 87
