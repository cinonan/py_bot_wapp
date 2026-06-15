## Parent PRD

`issues/prd.md`

## What to build

Resolución de dirección de entrega antes de `PlaceOrder`, según tabla del PRD (**Resolución de dirección antes de PlaceOrder**):

- **MISMA:** `direccion_entrega` = `clientes.direccion_principal`; no invoca `UpdateClientAddress`.
- **NUEVA:** captura en `AWAITING_DELIVERY_ADDRESS`, guarda en sesión como `direccionEntrega`; no invoca `UpdateClientAddress`.

Estado `CONFIRMING_ADDRESS` para clientes recurrentes; flujo integrado con carrito existente hacia `CONFIRMING_ORDER` (sin persistir pedido aún — eso es slice 009).

## Acceptance criteria

- [ ] Cliente recurrente elige MISMA o NUEVA en `CONFIRMING_ADDRESS`.
- [ ] MISMA resuelve `direccion_entrega` desde perfil (`GetClientByPhone` / sesión) sin `UpdateClientAddress`.
- [ ] NUEVA transiciona a `AWAITING_DELIVERY_ADDRESS`, captura texto y guarda `direccionEntrega` en sesión.
- [ ] Dirección NUEVA no modifica `clientes.direccion_principal`.
- [ ] Entrada vacía o inválida en dirección produce mensaje de error sin perder carrito.
- [ ] Tras resolver dirección, flujo avanza a resumen/`CONFIRMING_ORDER` con carrito intacto.
- [ ] Pruebas unitarias de resolución MISMA/NUEVA en dominio conversacional.

## Blocked by

- `issues/007-carrito-multiproducto-snapshots.md`

## User stories addressed

- User story 5
- User story 7
- User story 25
- User story 87
