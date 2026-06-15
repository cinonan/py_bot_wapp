## Parent PRD

`issues/prd.md`

## What to build

Primer tracer bullet de persistencia: crear el esquema relacional objetivo del Ordering-Service (migraciones versionadas + seed), junto con el bootstrap mínimo del servicio (`services/ordering-service/`) con composition root manual y health check stub.

Incluye las tablas `clientes`, `productos`, `pedidos`, `detalle_pedidos`, `pedido_historial_estados` y `comandos_procesados` según la sección **Evolución del modelo de datos** del PRD: FK `pedidos.cliente_id → clientes.id`, CHECK de estados (`pendiente`, `en_camino`, `entregado`), snapshots en detalle, `productos.activo`, timestamps `TIMESTAMPTZ`.

Verificable de forma independiente aplicando migraciones contra PostgreSQL vacío, ejecutando seed y comprobando constraints (FK, CHECK, índices).

## Acceptance criteria

- [ ] Existe `services/ordering-service/` con estructura Clean Architecture (`src/modules/ordering/domain|application|infrastructure`, `composition/`, `app.js`).
- [ ] Migraciones SQL versionadas crean el DDL completo desde cero sin dependencia del esquema legado.
- [ ] Script de seed carga productos de ejemplo con `activo = true` y datos mínimos reproducibles.
- [ ] `pedidos.cliente_id` referencia `clientes.id` con `ON DELETE RESTRICT`.
- [ ] `pedidos.estado` restringido por CHECK a `pendiente`, `en_camino`, `entregado`.
- [ ] `detalle_pedidos` incluye `nombre_producto`, `precio_unitario` y `monto_total` generado.
- [ ] Tablas `pedido_historial_estados` y `comandos_procesados` creadas con índices útiles.
- [ ] Endpoint `/health` responde HTTP 200 cuando PostgreSQL está accesible.
- [ ] Pruebas de integración confirman aplicación de migraciones y seed repetible en entorno de test.

## Blocked by

None - can start immediately

## User stories addressed

- User story 42
- User story 45
- User story 46
- User story 64
- User story 67
- User story 68
- User story 72
- User story 73
- User story 74
- User story 75
- User story 76
- User story 77
- User story 78
- User story 79
