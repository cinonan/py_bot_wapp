## Parent PRD

`issues/prd.md`

## What to build

Gestión de carrito end-to-end: comandos `AddToCart`, `GetCart`, `ClearCart` y evento `CartUpdated`. Ordering-Service congela snapshot de `precio_unitario` y `nombre_producto` en Redis al procesar `AddToCart` (solo recibe `productId` + `cantidad` desde el Bot).

Estados conversacionales: `SELECTING_PRODUCT` → `AWAITING_QUANTITY` → `PROVIDING_MENU` con opción ver menú (1) o confirmar pedido (2). Merge de cantidades para mismo producto, subtotal actualizado, rechazo de cantidades no enteras o ≤ 0.

Verificable añadiendo varios productos y comprobando carrito Redis + mensajes al usuario.

## Acceptance criteria

- [x] `AddToCart` lee precio/nombre actuales de PostgreSQL y persiste snapshot en carrito Redis (TTL 1 h).
- [x] Bot envía únicamente `productId` y `cantidad`; nunca precio ni nombre en comando.
- [x] Mismo `productId` añadido dos veces fusiona cantidades en un ítem.
- [x] `CartUpdated` incluye subtotal; Bot lo muestra al usuario.
- [x] Cantidades inválidas rechazadas con mensaje claro sin vaciar carrito.
- [x] Usuario puede añadir N productos diferentes antes de confirmar.
- [x] Estado `PROVIDING_MENU` permite volver al menú o avanzar hacia confirmación.
- [x] Pruebas unitarias: merge de carrito, cálculo de subtotales, validación Zod de cantidades.
- [x] Prueba de integración: `AddToCart` congela snapshot aunque precio cambie en PostgreSQL después.

## Blocked by

- `issues/006-catalogo-productos-stream.md`

## User stories addressed

- User story 11
- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
- User story 51
- User story 52
- User story 78
- User story 85
