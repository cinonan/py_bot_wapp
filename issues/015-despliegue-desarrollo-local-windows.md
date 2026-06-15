## Parent PRD

`issues/prd.md`

## What to build

Entorno de **desarrollo local en laptop Windows** listo para desarrollo y pruebas end-to-end del ecosistema completo, sin requisitos de VPS ni Certbot.

Incluye Docker Compose optimizado para **Docker Desktop en Windows** (WSL2 backend), scripts de arranque documentados, `.env.example` por servicio, aplicación automática de migraciones + seed al iniciar, y estrategia documentada para recibir webhooks HTTPS de Meta en local (túnel: ngrok, Cloudflare Tunnel u equivalente).

Este slice consolida la paridad dev descrita en el PRD pero **acotada al entorno local**: red Docker interna, servicios accesibles desde host para depuración, health checks operativos. No expone PostgreSQL/Redis a internet; el túnel apunta únicamente al puerto del Bot-Conversation-Service.

Verificable levantando el stack en Windows, ejecutando flujo completo (registro → menú → carrito → pedido → despacho) contra Meta sandbox o payloads simulados.

## Acceptance criteria

- [ ] `docker-compose.yml` (o `docker-compose.dev.yml`) documentado y probado en Windows con Docker Desktop.
- [ ] README de arranque local: prerequisitos (Docker Desktop, WSL2), copia de `.env.example`, comandos `docker compose up`.
- [ ] Migraciones y seed se aplican automáticamente o vía script documentado en primer arranque.
- [ ] Todos los servicios (`postgres`, `redis`, `ordering`, `bot-conversation`) healthy vía `/health`.
- [ ] Puertos de PostgreSQL y Redis no publicados a internet; acceso solo red Docker + host para depuración opcional.
- [ ] Documentación de túnel HTTPS para webhook Meta en desarrollo (URL pública → puerto local del bot).
- [ ] Flujo E2E manual documentado: checklist registro → catálogo → carrito → `PlaceOrder` → `Despachar`.
- [ ] Variables `STREAM_MAX_RETRIES`, tokens Meta, `ADMIN_ORDER_NOTIFY_PHONE` configurables en `.env` local sin commitear secretos.
- [ ] Validación exitosa del flujo completo en máquina de desarrollo Windows antes de considerar producción.

## Blocked by

- `issues/012-despacho-administrativo-whatsapp.md`
- `issues/013-robustez-conversacional.md`

## User stories addressed

- User story 61
- User story 62
- User story 64
- User story 65
- User story 79

## Notas de alcance (desarrollo vs producción)

- **Incluido aquí:** compose local, seed, túnel dev, E2E en laptop, health checks, red Docker aislada entre contenedores.
- **Excluido (ver `issues/016-despliegue-produccion-vps.md`):** Nginx, Certbot, VPS Ubuntu, hardening de red en servidor remoto, DNS de producción.
- **Impacto del split:** este slice absorbe la validación E2E que antes precedía al despliegue único; producción (`016`) depende de flujo completo verificado aquí.
