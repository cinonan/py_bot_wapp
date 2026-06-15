## Parent PRD

`issues/prd.md`

## What to build

Cierre de pedido end-to-end: estado `CONFIRMING_ORDER` con resumen de carrito, captura opcional de DNI (8 dígitos), comandos `UpdateClientDni` (perfil) y `PlaceOrder` con `direccion_entrega` obligatoria y `dni_facturacion` opcional.

Ordering-Service persiste transacción atómica (cabecera + detalle con snapshots), estado inicial `pendiente`, registro en `pedido_historial_estados`, limpia carrito Redis y publica `OrderPlaced` / `OrderPlaceFailed`. Bot envía confirmación al cliente con ID y total en `S/ X.XX`, notifica administradora con desglose completo, y limpia sesión/carrito tras éxito.

## Acceptance criteria

- [ ] Resumen de carrito (ítems, cantidades, precios unitarios, total) mostrado antes de confirmar.
- [ ] DNI opcional: 8 dígitos válidos vía Zod; omitir confirma sin DNI.
- [ ] `UpdateClientDni` actualiza perfil cuando usuario proporciona DNI.
- [ ] `PlaceOrder` exige `direccion_entrega`; persiste `dni_facturacion` como snapshot en `pedidos`.
- [ ] Transacción atómica: cabecera + líneas; rollback ante fallo parcial.
- [ ] Líneas de `detalle_pedidos` incluyen snapshot de precio y nombre desde carrito Redis.
- [ ] Estado inicial `pendiente`; fila en `pedido_historial_estados` con origen `PlaceOrder`.
- [ ] `OrderPlaced` dispara mensaje de confirmación al cliente y notificación detallada a administradora (`ADMIN_ORDER_NOTIFY_PHONE`).
- [ ] Tras éxito: carrito Redis y sesión conversacional limpiados.
- [ ] Montos formateados en moneda local en mensajes al cliente.
- [ ] Pruebas de integración: `PlaceOrder` con `direccion_entrega` obligatoria; pedido completo en PostgreSQL.

## Blocked by

- `issues/008-confirmacion-direccion-misma-nueva.md`

## User stories addressed

- User story 20
- User story 21
- User story 22
- User story 23
- User story 24
- User story 25
- User story 26
- User story 27
- User story 28
- User story 29
- User story 30
- User story 31
- User story 51
- User story 74
- User story 91
