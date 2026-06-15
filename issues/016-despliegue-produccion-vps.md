## Parent PRD

`issues/prd.md`

## What to build

Despliegue en **producción** sobre VPS Linux (Ubuntu): Docker Compose con red `backend-network` aislada, Nginx como proxy inverso con terminación TLS (Certbot / Let's Encrypt), webhook del Bot-Conversation-Service expuesto únicamente vía HTTPS, PostgreSQL y Redis sin puertos públicos.

Requiere interacción humana (HITL): acceso VPS, DNS del dominio, configuración de webhook en Meta Developer Console, rotación inicial de secretos.

Asume flujo E2E ya validado en desarrollo local (`issues/015-despliegue-desarrollo-local-windows.md`).

## Acceptance criteria

- [ ] `docker-compose.prod.yml` (o perfil `production`) desplegable en VPS Ubuntu.
- [ ] Nginx termina TLS; certificados Let's Encrypt renovables vía Certbot.
- [ ] Solo el endpoint del webhook conversacional es accesible desde internet.
- [ ] PostgreSQL y Redis accesibles únicamente desde red interna de contenedores.
- [ ] Webhook Meta configurado con URL HTTPS de producción y verify token.
- [ ] Health checks operativos; reinicio de contenedores no corrompe datos persistentes (volúmenes PostgreSQL).
- [ ] Seed/migraciones aplicadas en primer despliegue de entorno vacío.
- [ ] Checklist de smoke test en producción: pedido de prueba + despacho administrativo.
- [ ] Documentación de rollback básico y variables de entorno de producción (sin valores en repo).

## Blocked by

- `issues/015-despliegue-desarrollo-local-windows.md`

## User stories addressed

- User story 56
- User story 57
- User story 61
- User story 62
- User story 63

## Tipo

**HITL** — requiere VPS, DNS, certificados SSL y configuración manual en Meta.

## Notas de alcance (impacto del split)

- El entorno local Windows (**015**) valida funcionalidad; este slice (**016**) valida **operabilidad en producción** (TLS, perímetro de red, dominio público).
- No repetir configuración de túnel dev; producción usa dominio fijo con Certbot.
- `STREAM_MAX_RETRIES` y demás variables deben replicarse en `.env` de producción vía gestión segura (no commitear).
