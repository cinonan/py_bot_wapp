# Contratos de mensajería (Redis Streams)

Referencia: `issues/prd.md` — sección **Contratos de mensajería**.

## Streams

| Stream | Dirección | Propósito |
|--------|-----------|-----------|
| `bot:events` | Bot → Ordering | Comandos de negocio y health-check (`Ping`) |
| `ordering:events` | Ordering → Bot | Eventos de respuesta correlacionados |
| `ordering:dlq` | — | Dead letter queue (issue 011) |

## Consumer groups

| Stream | Group | Consumidor |
|--------|-------|------------|
| `bot:events` | `ordering-service` | Ordering-Service |
| `ordering:events` | `bot-conversation-service` | Bot-Conversation-Service |

## Metadatos obligatorios

Todo mensaje en ambos streams incluye:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | string | Nombre del comando o evento |
| `wamid` | string | ID del mensaje WhatsApp (idempotencia) |
| `correlationId` | string | UUID para request-reply |
| `phone` | string | Teléfono E.164 del cliente |
| `timestamp` | string | ISO-8601 de publicación |
| `payload` | string (JSON) | Campos de negocio serializados |

## Comandos base (bot → ordering)

| Comando | Payload | Respuesta |
|---------|---------|-----------|
| `Ping` | `{}` | `Pong` |
| `GetClientByPhone` | `{}` | `ClientFound` / `ClientNotFound` |
| `RegisterClient` | `{ nombre, direccion_principal }` | `ClientRegistered` / `RegisterClientFailed` |
| `GetProductCatalog` | `{}` | `CatalogLoaded` / `CatalogLoadFailed` |
| `GetProductById` | `{ productId }` | `ProductResolved` / `ProductNotFound` |

Comandos de negocio (`RegisterClient`, `GetProductCatalog`, etc.) se documentan en el PRD y se implementan en issues de features.

## Eventos base (ordering → bot)

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `Pong` | `{}` | Respuesta a `Ping` (health / tracer bullet) |
| `ClientFound` | `{ client }` | Cliente existente para el teléfono consultado |
| `ClientNotFound` | `{}` | Sin cliente registrado para el teléfono |
| `ClientRegistered` | `{ client }` | Cliente creado exitosamente |
| `RegisterClientFailed` | `{ reason, issues? \| message? }` | Validación o duplicado al registrar |
| `CatalogLoaded` | `{ products: [{ id, nombre, precio }] }` | Catálogo activo disponible |
| `ProductResolved` | `{ product: { id, nombre, precio } }` | Producto activo encontrado |
| `ProductNotFound` | `{}` | Producto inexistente o inactivo |
| `CatalogLoadFailed` | `{ reason, issues? \| message? }` | Error al obtener catálogo |
| `OrderPlaceFailed` | `{ reason, issues? \| message? }` | Error al colocar pedido |
| `OrderDispatchFailed` | `{ reason, issues? \| message? }` | Error al despachar pedido administrativo |

## Política de errores (consumidor Ordering)

| Clasificación | Comportamiento |
|---------------|----------------|
| Transitorio | Sin `XACK`; mensaje permanece en PEL |
| Permanente — validación | `XACK` + evento `*Failed` correlacionado |
| Agotamiento | Tras `STREAM_MAX_RETRIES` (default 5) → `XACK` + copia a `ordering:dlq` |

La DLQ es append-only y no bloquea el consumer group principal.

## Request-reply

1. Bot publica comando en `bot:events` con `correlationId` único.
2. Bot registra espera por evento con el mismo `correlationId` en `ordering:events`.
3. Ordering procesa, publica evento correlacionado, luego `XACK`.
4. Ante timeout (`STREAM_REPLY_TIMEOUT_MS`, default 5000 ms), el bot devuelve estado de espera sin alterar sesión.

## Acknowledgment

- `XACK` solo tras procesamiento exitoso.
- Detalle de clasificación transitorio / permanente / DLQ: sección **Política de errores** arriba.
