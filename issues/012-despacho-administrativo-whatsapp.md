## Parent PRD

`issues/prd.md`

## What to build

Operaciones de cocina end-to-end: interceptación del comando administrativo `Despachar [ID]` antes de la máquina de estados (validación contra `ADMIN_ORDER_NOTIFY_PHONE`), publicación de `DispatchOrder`, transición a `en_camino` con `fecha_atencion`, registro en `pedido_historial_estados`, notificación al cliente («en camino») y confirmación a administradora.

Rechazo claro para pedido inexistente o estado no despachable (solo `pendiente`).

## Acceptance criteria

- [ ] Mensaje `Despachar [ID]` interceptado antes de lógica de cliente; parser extrae ID numérico.
- [ ] Solo teléfono configurado en `ADMIN_ORDER_NOTIFY_PHONE` ejecuta despacho.
- [ ] `DispatchOrder` actualiza pedido a `en_camino`, setea `fecha_atencion` e inserta historial.
- [ ] Cliente recibe mensaje coherente con estado `en_camino`.
- [ ] Administradora recibe confirmación de éxito o error descriptivo.
- [ ] Pedido inexistente → error claro sin efectos en BD.
- [ ] Pedido en `en_camino` o `entregado` → rechazo con mensaje claro.
- [ ] Pruebas unitarias: parser de despacho, regla «solo desde pendiente».
- [ ] Prueba de integración: despacho exitoso persiste estado e historial.

## Blocked by

- `issues/009-cierre-pedido-dni-notificacion-admin.md`
- `issues/005-webhook-seguro-sesion-redis.md`

## User stories addressed

- User story 32
- User story 33
- User story 34
- User story 35
- User story 36
- User story 37
- User story 54
