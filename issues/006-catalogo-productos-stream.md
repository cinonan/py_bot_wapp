## Parent PRD

`issues/prd.md`

## What to build

Flujo end-to-end de catálogo: comando `GetProductCatalog` en Ordering-Service (solo productos con `activo = true`), eventos `CatalogLoaded` / `CatalogLoadFailed`, y estados conversacionales `AWAITING_CATALOG` → renderizado de menú numerado con precios en formato `S/ X.XX`.

Bot cachea `CatalogLoaded` en sesión Redis para reutilizar al volver a «Ver Menú» sin republicar comando, salvo TTL expirado. Manejo de catálogo vacío e ID de producto inválido/inactivo en selección inicial (`GetProductById` → `ProductResolved` / `ProductNotFound`).

Requiere webhook seguro (005) y cliente identificado (004).

## Acceptance criteria

- [ ] `GetProductCatalog` publica `CatalogLoaded` con productos activos desde seed/PostgreSQL.
- [ ] Bot entra en `AWAITING_CATALOG`, espera evento correlacionado y muestra menú numerado con precios.
- [ ] Catálogo cacheado en sesión; «Ver Menú» reutiliza caché sin nuevo `GetProductCatalog` mientras TTL de sesión/caché vigente.
- [ ] Catálogo vacío produce mensaje informativo al usuario (no menú roto).
- [ ] `GetProductById` rechaza productos inactivos con `ProductNotFound`.
- [ ] Selección de ID inválido muestra mensaje claro sin reiniciar flujo ni carrito.
- [ ] Bot no envía precios en comandos de escritura; solo muestra precios recibidos en eventos.
- [ ] Pruebas de integración: seed → `CatalogLoaded` → menú renderizable.

## Blocked by

- `issues/004-registro-identificacion-clientes.md`
- `issues/005-webhook-seguro-sesion-redis.md`

## User stories addressed

- User story 6
- User story 9
- User story 10
- User story 18
- User story 19
- User story 75
- User story 87
