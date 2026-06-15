## Parent PRD

`issues/prd.md`

## What to build

Middleware JWT con firma RS256 preparado en Ordering-Service para futuros consumidores HTTP, sin exponer endpoints públicos de negocio en esta fase. Claves asimétricas desde variables de entorno en composition root.

Código listo para enchufar cuando exista panel web u otro cliente HTTP; incluye prueba unitaria de verificación de token.

## Acceptance criteria

- [ ] Middleware JWT implementado y registrable en composition root del Ordering-Service.
- [ ] Verificación RS256 con clave pública desde `process.env.*` (sin secretos en código).
- [ ] Ningún endpoint HTTP de negocio expuesto públicamente en esta fase (solo streams + health).
- [ ] Middleware exportado/documentado para uso futuro en rutas protegidas.
- [ ] Prueba unitaria: token firmado válido pasa; token inválido o expirado rechazado.
- [ ] Sin endpoints que requieran JWT en producción hasta fase posterior (Out of Scope del PRD).

## Blocked by

- `issues/002-estructura-microservicios-docker-compose.md`

## User stories addressed

- User story 58
- User story 59
