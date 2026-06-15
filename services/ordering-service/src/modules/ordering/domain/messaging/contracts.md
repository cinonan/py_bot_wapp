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

Comandos de negocio (`RegisterClient`, `GetProductCatalog`, etc.) se documentan en el PRD y se implementan en issues de features.

## Eventos base (ordering → bot)

| Evento | Payload | Cuándo |
|--------|---------|--------|
| `Pong` | `{}` | Respuesta a `Ping` (health / tracer bullet) |

## Request-reply

1. Bot publica comando en `bot:events` con `correlationId` único.
2. Bot registra espera por evento con el mismo `correlationId` en `ordering:events`.
3. Ordering procesa, publica evento correlacionado, luego `XACK`.
4. Ante timeout (`STREAM_REPLY_TIMEOUT_MS`, default 5000 ms), el bot devuelve estado de espera sin alterar sesión.

## Acknowledgment

- `XACK` solo tras procesamiento exitoso.
- Errores transitorios: sin `XACK` (mensaje permanece en PEL).
- Errores permanentes de validación: `XACK` + evento `*Failed` (issues posteriores).
