## Parent PRD

`issues/prd.md`

## What to build

Eliminación del código monolítico legado en `bot-whatsapp/src/` (controlador único, modelos acoplados, servicios legacy) una vez validado el ecosistema nuevo en desarrollo local y desplegado en producción.

El repositorio queda con únicamente la estructura objetivo bajo `services/` + infraestructura (compose, nginx, sql/migraciones del Ordering-Service). Sin referencias operativas al monolito.

## Acceptance criteria

- [ ] Flujo E2E completo verificado en local (`015`) y smoke test en producción (`016`) antes del retiro.
- [ ] Eliminados del repositorio: `bot-whatsapp/src/controllers/webhookController.js`, modelos legacy, `app.js` monolítico y dependencias exclusivas del monolito.
- [ ] `package.json` raíz o de `bot-whatsapp/` actualizado para apuntar a microservicios (sin scripts rotos).
- [ ] No quedan imports ni documentación que dirijan al monolito como punto de entrada.
- [ ] README actualizado con instrucciones únicamente del ecosistema distribuido.
- [ ] Búsqueda en repo de rutas legacy (`webhookController`, acceso directo pg desde bot) sin resultados operativos.

## Blocked by

- `issues/015-despliegue-desarrollo-local-windows.md`
- `issues/016-despliegue-produccion-vps.md`

## User stories addressed

- User story 67
- User story 69

## Notas

- No migrar datos del monolito (PRD: esquema nuevo + seed).
- El retiro es el paso final; no condiciona diseño de slices anteriores.
