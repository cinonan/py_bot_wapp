# PRD — Ecosistema Distribuido «El Sabor de la Selva»

## Problem Statement

«El Sabor de la Selva» necesita un sistema de pedidos conversacional por WhatsApp que soporte el flujo completo de negocio — registro de clientes, menú, carrito multiproducto, cierre de pedido y despacho administrativo — sobre una arquitectura preparada para crecer sin reescribir el núcleo.

Existe código legado monolítico (un único controlador Express con acceso directo a PostgreSQL, Redis y Meta API) que cumplió una función exploratoria, pero **su retiro es inminente** y no debe condicionar las decisiones de diseño ni de implementación del sistema objetivo.

Los requisitos del negocio y la plataforma exigen:

- **Extensibilidad:** futuros módulos (pasarela de pagos, facturación electrónica, gestión de cocina, tracking de motorizados) deben integrarse sin modificar el núcleo conversacional.
- **Separación de responsabilidades:** la interfaz de chat no debe poseer credenciales ni acceso a la base de datos relacional de pedidos.
- **Comunicación asíncrona:** operaciones de negocio desacopladas en tiempo mediante un bus de eventos con garantías de entrega.
- **Modelo de datos sólido:** el esquema relacional inicial del legado es solo un punto de partida básico; el sistema objetivo requiere integridad referencial, snapshots de pedido, ciclo de vida de estados y soporte de idempotencia en persistencia.
- **Seguridad operativa:** configuración por entorno, validación de webhooks de Meta y perímetro de red acotado en producción.
- **Despliegue estandarizado:** orquestación por contenedores con paridad entre desarrollo local y VPS de producción.

La referencia arquitectónica aprobada es el Documento de Diseño Arquitectónico (SAD) bajo ISO/IEC/IEEE 42010. Este PRD es la fuente de verdad funcional; el código legado no lo es.

## Solution

Implementar desde cero el ecosistema objetivo de dos microservicios Node.js comunicados por Redis Streams, con esquema relacional nuevo inicializado mediante seed y retiro del monolito legado. Stack unificado: Express, PostgreSQL, Redis.

1. **Bot-Conversation-Service:** interfaz conversacional pura (CUI). Recibe y valida webhooks de Meta, gestiona la máquina de estados y la sesión volátil en Redis, publica comandos al bus de eventos y consume eventos de dominio para generar respuestas al usuario. No accede a PostgreSQL.

2. **Ordering-Service:** núcleo de negocio. Consume comandos desde Redis Streams, ejecuta casos de uso (gestión de carrito, registro de clientes, colocación y despacho de pedidos), persiste en PostgreSQL con transacciones ACID y publica eventos de dominio de vuelta al bus.

3. **Infraestructura compartida:** Redis actúa como caché de sesión/carrito y como message broker (Streams con Consumer Groups). PostgreSQL queda restringido al Ordering-Service bajo el patrón Database-per-Service. El despliegue se estandariza con Docker Compose en un VPS Linux, exponiendo únicamente el webhook conversacional al exterior mediante proxy inverso con TLS.

La implementación adopta Clean Architecture interna por módulo, validación de dominio con Zod, contratos de comandos/eventos asíncronos, idempotencia conversacional por wamid (caché Redis + registro en PostgreSQL), validación de firma de webhook Meta (`X-Hub-Signature-256`) y un modelo relacional evolucionado respecto al esquema básico del legado.

## User Stories

### Cliente final — identificación y registro

1. Como cliente final, quiero que el bot reconozca mi número de teléfono automáticamente cuando envíe cualquier mensaje, para no tener que volver a registrarme en cada interacción.
2. Como nuevo cliente final, quiero que el bot me pida mi nombre cuando no esté en el sistema, para que el negocio pueda dirigirse a mí de forma personalizada.
3. Como nuevo cliente final, quiero que el bot me pida mi dirección de entrega principal durante el registro, para que los pedidos futuros se asignen por defecto a una ubicación conocida.
4. Como cliente final recurrente, quiero que el bot me salude por mi nombre, para que la experiencia se sienta familiar y sin fricciones.
5. Como cliente final recurrente, quiero elegir entre usar mi dirección guardada (MISMA) o proporcionar una nueva (NUEVA), para poder hacer pedidos a diferentes ubicaciones sin tener que registrarme de nuevo.
6. Como cliente final, quiero que el flujo del pedido bloquee el acceso al menú hasta que esté completamente identificado, para evitar que se realicen pedidos anónimos.
7. Como cliente final, quiero mensajes de error claros cuando los datos de mi registro sean inválidos o estén vacíos, para saber cómo corregir mi respuesta.
8. Como cliente final, quiero que mi sesión expire tras un periodo de inactividad, para que un estado conversacional obsoleto no cause confusión al regresar.

### Cliente final — catálogo y carrito

9. Como cliente final, quiero ver una lista numerada de los productos activos disponibles con sus precios cuando llegue al menú, para poder tomar una decisión informada.
10. Como cliente final, quiero seleccionar un producto mediante su identificador numérico, para que realizar el pedido por texto siga siendo sencillo en dispositivos móviles.
11. Como cliente final, quiero especificar la cantidad de porciones para cada producto seleccionado, para poder pedir la cantidad correcta.
12. Como cliente final, quiero que el bot rechace cantidades que no sean números enteros o positivos, para evitar pedidos inválidos antes de la confirmación.
13. Como cliente final, quiero añadir múltiples productos diferentes a mi carrito antes de pagar, para poder realizar un pedido combinado en una sola transacción.
14. Como cliente final, quiero que si añado el mismo producto dos veces se fusionen las cantidades en mi carrito, para que el resumen de mi pedido se mantenga coherente.
15. Como cliente final, quiero ver un subtotal actualizado de mi carrito después de cada adición, para saber el costo aproximado antes de confirmar.
16. Como cliente final, quiero que los precios de los productos se congelen en el momento en que los añado al carrito, para que los cambios de precio del menú durante mi sesión no me sorprendan al pagar.
17. Como cliente final, quiero elegir entre volver a ver el menú o proceder a la confirmación del pedido después de añadir un artículo, para tener el control del ritmo de mi compra.
18. Como cliente final, quiero recibir un mensaje claro cuando seleccione un ID de producto inválido o inactivo, para poder elegir una opción válida sin tener que reiniciar el flujo.
19. Como cliente final, quiero que el bot gestione el caso en que el catálogo de productos esté vacío, para estar informado en lugar de ver un menú sin productos.

### Cliente final — cierre de pedido y facturación básica

20. Como cliente final, quiero revisar un resumen de mi carrito (artículos, cantidades, precios unitarios, total) antes de confirmar, para poder verificar mi pedido.
21. Como cliente final, quiero tener la opción de proporcionar mi DNI de exactamente 8 dígitos para la facturación, para poder recibir una boleta cuando lo necesite.
22. Como cliente final, quiero omitir el ingreso del DNI y confirmar sin él, para que los pedidos ocasionales sigan siendo rápidos.
23. Como cliente final, quiero que mi DNI se guarde en mi perfil de cliente cuando lo proporcione, para no tener que volver a ingresarlo en futuros pedidos.
24. Como cliente final, quiero que el DNI utilizado para un pedido quede registrado en ese pedido concreto, para que la facturación futura refleje el documento vigente en el momento de la compra.
25. Como cliente final, quiero que se registre la dirección de entrega de este pedido específico incluso si difiere de la dirección de mi perfil, para permitir entregas ocasionales.
26. Como cliente final, quiero recibir un mensaje de confirmación del pedido con mi ID de pedido y el total después de realizarlo con éxito, para tener una referencia para el seguimiento.
27. Como cliente final, quiero que mi carrito y mi sesión conversacional se limpien después de un pedido exitoso, para empezar desde cero en mi próxima compra.
28. Como cliente final, quiero ser notificado cuando mi pedido sea despachado, para saber que mi comida está en camino.
29. Como cliente final, quiero que los mensajes de confirmación y despacho del pedido muestren los montos en el formato de moneda local, para que los precios sean fáciles de leer.

### Administradora — operaciones de cocina

30. Como administradora, quiero recibir una notificación automática cuando se realice un nuevo pedido, para poder prepararlo sin tener que monitorear la base de datos manualmente.
31. Como administradora, quiero que la notificación incluya el ID del pedido, el nombre del cliente, la dirección de entrega, el desglose detallado de los artículos y el total, para tener todo lo necesario para atender el pedido.
32. Como administradora, quiero despachar un pedido enviando un comando de texto estructurado con el ID del pedido, para activar la notificación al cliente desde el propio WhatsApp.
33. Como administradora, quiero que solo mi número de teléfono autorizado pueda ejecutar comandos de despacho, para evitar que los clientes puedan suplantar al personal de cocina.
34. Como administradora, quiero que los comandos de despacho se intercepten antes de que se ejecute cualquier lógica de la máquina de estados del cliente, para que las operaciones de administración nunca colisionen con las sesiones activas de los clientes.
35. Como administradora, quiero una confirmación cuando un despacho se realice con éxito, para saber que el cliente fue notificado.
36. Como administradora, quiero un error claro cuando intente despachar un ID de pedido inexistente o en un estado no despachable, para poder corregir el comando.
37. Como administradora, quiero que al despachar el pedido pase al estado `en_camino` y quede registrada la marca de tiempo de atención, para que el cumplimiento sea auditable y coherente con el mensaje al cliente.

### Arquitectura — desacoplamiento conversacional

38. Como arquitecto de sistemas, quiero que el servicio conversacional trate a WhatsApp puramente como un canal de interfaz de usuario (UI), para que las reglas de negocio se mantengan independientes de las especificidades de la API de Meta.
39. Como arquitecto de sistemas, quiero que todas las interacciones entre servicios fluyan a través de Redis Streams, para que los servicios estén desacoplados temporalmente y puedan escalar de forma independiente.
40. Como arquitecto de sistemas, quiero que el bot publique comandos (por ejemplo, AddItem, PlaceOrder, RegisterClient) y consuma eventos de dominio (por ejemplo, CartUpdated, OrderPlaced), para que el contrato asíncrono sea explícito y versionable.
41. Como arquitecto de sistemas, quiero grupos de consumidores (Consumer Groups) en Redis Streams con entrega de al menos una vez (at-least-once) y confirmación explícita (acknowledgment), para que la pérdida de mensajes se minimice en caso de fallos.
42. Como arquitecto de sistemas, quiero que el Ordering-Service sea el único componente con credenciales de PostgreSQL, para que se respete el límite de una base de datos por servicio (Database-per-Service).
43. Como arquitecto de sistemas, quiero que cada microservicio implemente Arquitectura Limpia (Clean Architecture) con capas de dominio, aplicación e infraestructura, para que la lógica de negocio sea testeable de forma aislada.
44. Como arquitecto de sistemas, quiero que la validación de dominio esté centralizada con esquemas de Zod, para que las reglas de entrada sean consistentes y declarativas en todos los servicios.
45. Como arquitecto de sistemas, quiero raíces de composición (composition roots) manuales sin frameworks de inyección de dependencias (DI), para que el cableado de dependencias siga siendo explícito y depurable.
46. Como arquitecto de sistemas, quiero contextos delimitados (bounded contexts) empaquetados verticalmente bajo árboles de código fuente modulares, para que se puedan añadir futuros contextos sin contaminación cruzada.

### Arquitectura — resiliencia e idempotencia

47. Como operador del sistema, quiero que el servicio conversacional adjunte los ID de mensaje de Meta (wamid) a cada comando publicado en Redis, para evitar que las entregas duplicadas de webhooks generen pedidos duplicados.
48. Como operador del sistema, quiero que el Ordering-Service deduplique comandos por wamid mediante caché en Redis y registro persistente en PostgreSQL, para que los reintentos se ignoren incluso tras pérdida de la caché volátil.
49. Como operador del sistema, quiero que el endpoint del webhook responda rápidamente con HTTP 200 después de encolar la tarea, para evitar que Meta realice reintentos agresivos por timeout.
50. Como operador del sistema, quiero que los consumidores de stream reintenten mensajes con errores transitorios manteniéndolos en la PEL hasta éxito, y que los errores permanentes se muevan a una cola de mensajes fallidos (DLQ) tras un límite acotado de reintentos con `XACK`, para equilibrar recuperación ante fallos transitorios y evitar bucles infinitos por mensajes corruptos o bugs de formato.
51. Como operador del sistema, quiero que la creación transaccional del pedido (cabecera + líneas de detalle) sea atómica, para evitar que se guarden pedidos parciales en la base de datos.
52. Como operador del sistema, quiero que cada línea de detalle almacene snapshot de precio y nombre del producto al momento del pedido, para que el historial sea legible aunque el catálogo cambie después.

### Arquitectura — seguridad

53. Como ingeniero de seguridad, quiero que todas las credenciales sensibles se inyecten a través de variables de entorno en la raíz de composición, para que los secretos nunca aparezcan en el código fuente ni en la documentación.
54. Como ingeniero de seguridad, quiero que el teléfono de autorización para el despacho de la administradora se configure a través de una variable de entorno, para que pueda rotarse sin cambiar el código.
55. Como ingeniero de seguridad, quiero validar la firma `X-Hub-Signature-256` en cada webhook POST de Meta antes de procesar el payload, para rechazar solicitudes falsificadas.
56. Como ingeniero de seguridad, quiero que los puertos de PostgreSQL y Redis no estén expuestos al internet público en producción, para que los almacenamientos de datos queden protegidos detrás de la red de contenedores.
57. Como ingeniero de seguridad, quiero que el webhook esté expuesto únicamente a través de HTTPS mediante un proxy inverso, para que los payloads viajen cifrados en tránsito.
58. Como ingeniero de seguridad, quiero un middleware de autenticación JWT preparado en el Ordering-Service para futuros consumidores HTTP, para que los paneles web puedan integrarse de forma segura.
59. Como ingeniero de seguridad, quiero que los tokens JWT estén firmados con claves asimétricas RS256 provenientes de la configuración del entorno, para que la rotación y verificación de claves sigan estándares de la industria.
60. Como ingeniero de seguridad, quiero que la información de identificación personal (PII) esté abstraída en los requisitos y registros (logs), para preservar la privacidad del cliente en los artefactos operativos.

### Despliegue y operaciones

61. Como ingeniero de DevOps, quiero una definición de Docker Compose que orqueste ambos microservicios, PostgreSQL y Redis, para que los entornos local y de producción sean idénticos.
62. Como ingeniero de DevOps, quiero que los servicios estén conectados a través de una red de backend aislada, para que solo el puerto del webhook conversacional sea accesible externamente.
63. Como ingeniero de DevOps, quiero Nginx con Certbot para la terminación TLS en el VPS, para cumplir los requisitos HTTPS de los webhooks de Meta.
64. Como ingeniero de DevOps, quiero migraciones SQL versionadas junto al Ordering-Service y un script de seed para datos iniciales, para que cada entorno parta de un esquema conocido y reproducible.
65. Como ingeniero de DevOps, quiero endpoints de health check en cada servicio, para que la orquestación de contenedores detecte instancias en mal estado.
66. Como ingeniero de DevOps, quiero graceful shutdown en los consumidores de stream, para que los mensajes in-flight no se pierdan durante reinicios.

### Implementación y retiro de legado

67. Como desarrollador, quiero implementar el ecosistema objetivo desde cero según el SAD, sin heredar limitaciones estructurales del código monolítico legado.
68. Como desarrollador, quiero un esquema relacional nuevo inicializado con seed (sin migración de datos del monolito), para partir de una base limpia y coherente con el diseño objetivo.
69. Como desarrollador, quiero eliminar el código monolítico del repositorio una vez validado el nuevo sistema, para evitar ambigüedad operativa y deuda de mantenimiento.
70. Como desarrollador, quiero que el servicio conversacional no acceda a PostgreSQL bajo ninguna circunstancia, para que el límite Database-per-Service sea efectivo.
71. Como desarrollador, quiero sesión conversacional y carrito en Redis con TTL de una hora bajo convenciones unificadas del SAD, para gestión volátil predecible entre servicios.

### Modelo de datos y persistencia

72. Como desarrollador, quiero que los pedidos referencien clientes por `cliente_id` (FK a `clientes.id`) y no por el número de teléfono, para un modelo relacional estándar y desacoplado del canal.
73. Como desarrollador, quiero que `pedidos.estado` esté restringido a valores válidos (`pendiente`, `en_camino`, `entregado`) mediante constraint en base de datos, para garantizar integridad del ciclo de vida.
74. Como desarrollador, quiero una tabla de historial de estados de pedido que registre cada transición con timestamp y origen, para auditoría y preparación de módulos de cocina y tracking.
75. Como desarrollador, quiero que los productos tengan un indicador `activo` para filtrar el catálogo conversacional sin eliminar registros históricos.
76. Como desarrollador, quiero una tabla de comandos procesados para idempotencia persistente por wamid, para complementar la caché Redis ante reinicios o expiraciones.
77. Como desarrollador, quiero timestamps consistentes en `TIMESTAMPTZ` en todas las entidades principales, para evitar ambigüedad temporal entre tablas.

### Calidad y mantenibilidad

78. Como desarrollador, quiero pruebas unitarias en la lógica pura de dominio (validadores, calculadoras de precios, transiciones de estado), para verificar reglas de negocio sin dependencias externas.
79. Como desarrollador, quiero pruebas de integración en persistencia de pedidos, migraciones de esquema, constraints de estado y consumo de streams, para validar contratos entre capas.
80. Como desarrollador, quiero Jest como test runner en ambos microservicios, para una toolchain consistente en todo el ecosistema.
81. Como desarrollador, quiero que las pruebas evalúen comportamiento externo y resultados observables, no detalles de implementación interna, para que refactorizaciones no rompan la suite innecesariamente.
82. Como desarrollador, quiero los contratos de mensajes de stream documentados dentro del bounded context de pedidos, para añadir nuevos tipos de comandos de forma predecible.

### Experiencia conversacional — robustez

83. Como cliente final, quiero que el bot ignore de forma segura los mensajes que no sean de texto, para que notas de voz o imágenes accidentales no rompan el flujo.
84. Como cliente final, quiero un mensaje de fallback amigable cuando ocurra un error inesperado, para no quedarme sin respuesta.
85. Como cliente final, quiero que las opciones de menú inválidas me re-pregunten sin reiniciar mi carrito, para recuperarme fácilmente de errores.
86. Como cliente final, quiero que el bot gestione payloads de estado del webhook sin procesarlos como mensajes de usuario, para que los recibos de entrega no interfieran con el pedido.
87. Como cliente final, quiero indicaciones conversacionales consistentes en cada transición de estado, para saber siempre qué información se espera a continuación.

### Extensibilidad futura (preparación, no implementación en esta fase)

88. Como product owner, quiero que el Ordering-Service exponga un contrato de eventos internos estable, para que un módulo de pasarela de pagos se suscriba sin modificar el código conversacional.
89. Como product owner, quiero la transición de pedido a estado `entregado` disponible en el modelo y el historial, para que el tracking de motorizados o la confirmación de entrega se implementen como capa adicional sin rediseñar el esquema.
90. Como product owner, quiero el canal conversacional desacoplado de la persistencia, para que canales adicionales (web, app) reutilicen el núcleo de pedidos.
91. Como product owner, quiero los datos de DNI y snapshots de pedido persistidos, para integrar facturación electrónica en una fase posterior sin cambios estructurales mayores.

## Implementation Decisions

### Alcance de esta fase

- Implementación **greenfield** del ecosistema de dos microservicios descrito en el SAD aprobado: flujo conversacional completo de pedidos, bus asíncrono Redis Streams, modelo relacional evolucionado, idempotencia, seguridad de webhook y despliegue containerizado con pruebas.
- **Esquema nuevo + seed:** no hay migración de datos desde el monolito; cada entorno se inicializa con DDL versionado y datos semilla (catálogo de productos, configuración mínima).
- **Retiro del legado:** el código monolítico se elimina del repositorio tras validación end-to-end del nuevo sistema; no condiciona decisiones de diseño ni de implementación.
- **Fuera de alcance:** pasarela de pagos, emisión de comprobantes fiscales electrónicos, panel web de cocina, tracking de motorizados con geolocalización, CRUD administrativo de productos vía interfaz, historial de pedidos para el cliente por chat, UI enriquecida de WhatsApp, canales adicionales, observabilidad avanzada, pipeline CI/CD.

### Módulos a construir

| Módulo | Responsabilidad |
|--------|-----------------|
| **Bot-Conversation-Service** | Webhook HTTP de Meta con validación de firma, parsing de mensajes entrantes, máquina de estados conversacional, gestión de sesión Redis, publicación de comandos a Redis Streams, consumo de eventos de dominio, envío de respuestas vía Meta Graph API, interceptación de comandos administrativos. |
| **Ordering-Service** | Consumo de comandos desde Redis Streams, casos de uso de dominio, persistencia transaccional PostgreSQL, publicación de eventos de dominio, carrito Redis, idempotencia por wamid (Redis + PostgreSQL). |
| **Infraestructura Redis** | Caché volátil (sesión y carrito) y message broker (Streams con Consumer Groups y stream DLQ `ordering:dlq`). |
| **Infraestructura PostgreSQL** | Base de datos exclusiva del Ordering-Service con esquema evolucionado (ver sección siguiente). |
| **Orquestación Docker Compose** | Servicios, redes internas, variables de entorno, volúmenes y seed para paridad dev/prod. |
| **Proxy TLS (Nginx + Certbot)** | Terminación HTTPS para el webhook en producción. |

### Evolución del modelo de datos

El esquema del legado (cuatro tablas básicas con FK de pedidos al teléfono del cliente, estados libres y sin snapshots de nombre) se sustituye por un modelo relacional objetivo. Entidades principales:

**clientes**
- Identificador surrogate `id` (PK).
- `telefono` UNIQUE NOT NULL — identificador de canal para el bot.
- `nombre`, `direccion_principal`, `dni` (opcional, UNIQUE), `fecha_registro TIMESTAMPTZ`.

**productos**
- `id`, `nombre`, `precio`, `activo BOOLEAN DEFAULT true`.
- Productos inactivos excluidos del catálogo conversacional; registros preservados para integridad histórica.

**pedidos**
- `id`, `cliente_id` FK → `clientes.id` (ON DELETE RESTRICT para preservar historial).
- `total`, `estado` con CHECK (`pendiente`, `en_camino`, `entregado`).
- `direccion_entrega`, `dni_facturacion` (nullable, snapshot del pedido).
- `fecha_solicitud`, `fecha_atencion` TIMESTAMPTZ.

**detalle_pedidos**
- `id_pedido` FK, `id_producto` FK (ON DELETE RESTRICT).
- `cantidad`, `precio_unitario`, `nombre_producto` (snapshot).
- `monto_total` GENERATED ALWAYS AS (cantidad × precio_unitario) STORED.
- Índice en `id_pedido`.

**pedido_historial_estados**
- `id`, `pedido_id` FK, `estado_anterior`, `estado_nuevo`, `origen` (p. ej. `PlaceOrder`, `DispatchOrder`), `registrado_en TIMESTAMPTZ`.

**comandos_procesados**
- `wamid` UNIQUE, `tipo_comando`, `procesado_en TIMESTAMPTZ`.
- Complementa caché Redis para idempotencia durable.

**Inicialización:** migraciones versionadas aplican el DDL; script de seed carga productos de ejemplo y cualquier dato de referencia necesario para desarrollo y primer despliegue.

### Contratos de mensajería (Redis Streams)

**Stream de comandos (bot → ordering):** `bot:events`

| Comando | Descripción |
|---------|-------------|
| `RegisterClient` | Crear cliente con teléfono, nombre y dirección principal. |
| `GetClientByPhone` | Consultar existencia y datos de cliente. |
| `UpdateClientDni` | Actualizar DNI del perfil de cliente. |
| `UpdateClientAddress` | Actualizar dirección principal. |
| `GetProductCatalog` | Solicitar catálogo de productos con `activo = true`; respuesta vía evento `CatalogLoaded`. |
| `GetProductById` | Solicitar producto individual; rechazar si inactivo; respuesta vía `ProductResolved` / `ProductNotFound`. |
| `AddToCart` | Agregar o incrementar ítem en carrito Redis; el Ordering-Service congela snapshot de precio y nombre al procesar el comando. |
| `GetCart` | Obtener carrito actual. |
| `ClearCart` | Limpiar carrito. |
| `PlaceOrder` | Persistir pedido con detalle (desde carrito Redis), `direccion_entrega`, `dni_facturacion` y total; estado inicial `pendiente`. |
| `DispatchOrder` | Transicionar a `en_camino`, registrar `fecha_atencion` e insertar en historial de estados. |
| `GetOrderById` | Consultar pedido con datos de cliente para despacho. |

Cada comando incluye metadatos obligatorios: `wamid`, `correlationId`, `phone`, `timestamp`.

**Campos de negocio por comando (además de metadatos):**

| Comando | Campos de negocio | Responsable del dato |
|---------|-------------------|----------------------|
| `RegisterClient` | `nombre`, `direccion_principal` | Bot (captura conversacional) |
| `GetClientByPhone` | — | Ordering consulta PostgreSQL |
| `UpdateClientDni` | `dni` | Bot (captura conversacional) |
| `UpdateClientAddress` | `direccion_principal` | Bot; solo para cambio explícito del perfil maestro, **no** para dirección puntual de un pedido |
| `GetProductCatalog` | — | Ordering consulta PostgreSQL |
| `GetProductById` | `productId` | Ordering consulta PostgreSQL |
| `AddToCart` | `productId`, `cantidad` | Bot envía identificadores; Ordering lee precio/nombre actuales y congela snapshot en carrito Redis |
| `GetCart` | — | Ordering lee carrito Redis |
| `ClearCart` | — | Ordering limpia carrito Redis |
| `PlaceOrder` | `direccion_entrega` (obligatorio), `dni_facturacion` (opcional) | Bot resuelve dirección (MISMA o NUEVA) antes de publicar; detalle y total los calcula Ordering desde carrito Redis |
| `DispatchOrder` | `orderId` | Bot (comando administrativo) |
| `GetOrderById` | `orderId` | Ordering consulta PostgreSQL |

**Reglas de contrato:**

- El Bot-Conversation-Service **no** envía `precio`, `nombre` ni totales en comandos de escritura. Puede **mostrar** precios recibidos en eventos (`CatalogLoaded`, `ProductResolved`, `CartUpdated`) exclusivamente como caché de presentación.
- El snapshot de precio y nombre se crea en dos momentos, ambos en Ordering-Service: (1) al procesar `AddToCart` en carrito Redis (HU-16); (2) al persistir líneas en `detalle_pedidos` durante `PlaceOrder` (HU-52).
- `UpdateClientAddress` y `PlaceOrder.direccion_entrega` son operaciones distintas: una dirección NUEVA para el pedido actual (HU-5, HU-25) viaja solo en `PlaceOrder` y se persiste en `pedidos.direccion_entrega` sin modificar `clientes.direccion_principal`.

**Patrón request-reply asíncrono (consultas):**

- Comandos de lectura (`GetClientByPhone`, `GetProductCatalog`, `GetProductById`, `GetCart`, `GetOrderById`) publican en `bot:events` y el bot espera el evento de respuesta en `ordering:events` correlacionado por `correlationId`.
- Tras recibir `CatalogLoaded`, el bot **cachea** el catálogo en la sesión Redis conversacional para reutilizarlo al volver a «Ver Menú» sin republicar `GetProductCatalog`, salvo TTL expirado o invalidación explícita.
- Si el evento no llega en un umbral configurable (p. ej. 5 s), el bot envía mensaje de espera/reintento y permanece en estado pendiente sin perder carrito ni sesión.

**Política de errores en consumidores (Ordering-Service):**

| Clasificación | Ejemplos | Comportamiento |
|---------------|----------|----------------|
| Transitorio | Timeout PostgreSQL, Redis no disponible, deadlock | No `XACK`; mensaje permanece en PEL y se reintenta |
| Permanente — validación | Payload inválido (Zod), `productId` inexistente, comando desconocido | `XACK` inmediato; publicar evento de fallo correlacionado (`*Failed`); no reintentar |
| Permanente — agotamiento | Mismo mensaje falla N veces (p. ej. N=5) por error no clasificado | `XACK`; copiar payload a stream DLQ `ordering:dlq`; registrar en logs con `correlationId` y `wamid` |

- La DLQ es de solo append; los mensajes no bloquean el consumer group principal.
- Variable de entorno `STREAM_MAX_RETRIES` (default `5`) controla el límite antes de DLQ.

**Stream de eventos (ordering → bot):** `ordering:events`

| Evento | Descripción |
|--------|-------------|
| `ClientRegistered` | Cliente creado exitosamente. |
| `ClientFound` / `ClientNotFound` | Resultado de búsqueda por teléfono. |
| `CatalogLoaded` | Catálogo disponible para renderizar menú. |
| `CatalogLoadFailed` | Error al obtener catálogo (técnico o de negocio). |
| `ProductResolved` / `ProductNotFound` | Resultado de selección de producto. |
| `CartUpdated` | Carrito modificado con nuevo subtotal. |
| `OrderPlaced` | Pedido persistido con ID y total. |
| `OrderPlaceFailed` | Error de negocio o técnico al colocar pedido. |
| `OrderDispatched` / `OrderDispatchFailed` | Resultado de despacho administrativo. |

### Capas internas (Clean Architecture por servicio)

**Bot-Conversation-Service:**

- **Domain:** estados conversacionales y transiciones, validadores de entrada (MISMA/NUEVA, cantidades, DNI, IDs de producto), parser del comando administrativo de despacho.
- **Application:** manejadores por estado, orquestador de publicación/consumo de streams, coordinador de flujo conversacional.
- **Infrastructure:** adaptador Redis para sesión, cliente HTTP para Meta Graph API, validador de firma de webhook, adaptador Redis Streams (productor y consumidor).

**Ordering-Service:**

- **Domain:** entidades ligeras (Cart, Order, OrderLine, Client), esquemas Zod, calculador de totales, reglas de snapshot, máquina de estados de pedido (`pendiente` → `en_camino` → `entregado`).
- **Application:** casos de uso con puertos (OrderRepositoryPort, ClientRepositoryPort, ProductRepositoryPort, CartStorePort, IdempotencyStorePort, OrderHistoryPort, EventPublisherPort).
- **Infrastructure:** repositorios PostgreSQL, adaptador Redis para carrito e idempotencia volátil, consumidor/productor Redis Streams, middleware JWT (preparado, sin endpoints HTTP públicos en esta fase).

### Decisiones de persistencia volátil

- Carrito en Redis, TTL una hora, gestionado por el Ordering-Service. Cada ítem almacena `productId`, `cantidad`, `precio_unitario` y `nombre_producto` como snapshot congelado por Ordering al procesar `AddToCart`.
- Sesión conversacional en Redis, TTL una hora, gestionada exclusivamente por el Bot-Conversation-Service. Puede incluir caché de catálogo (`CatalogLoaded`) y metadatos de dirección pendiente (`direccionEntrega` cuando el cliente elige NUEVA).
- Convenciones de claves alineadas al SAD; sin compatibilidad con nomenclatura del legado.

### Decisiones de seguridad

- `ADMIN_ORDER_NOTIFY_PHONE` y `WA_APP_SECRET` (o equivalente para firma HMAC) como variables de entorno.
- Validación `X-Hub-Signature-256` en cada POST al webhook; rechazo con HTTP 401/403 ante firma inválida.
- Credenciales de Meta, PostgreSQL, Redis y claves JWT/RS256 exclusivamente vía `process.env.*` en la raíz de composición.
- PostgreSQL y Redis accesibles solo desde la red interna de contenedores en producción.
- Middleware JWT con RS256 preparado en Ordering-Service para futuros consumidores HTTP.

### Decisiones de ciclo de vida de pedidos

| Transición | Disparador | Estado resultante |
|------------|------------|-------------------|
| Colocación de pedido | Comando `PlaceOrder` | `pendiente` |
| Despacho administrativo | Comando `Despachar [ID]` vía WhatsApp | `en_camino` |
| Confirmación de entrega | Fuera de alcance operativo en esta fase | `entregado` (reservado en esquema e historial) |

- Al despachar, el mensaje al cliente refleja «en camino», coherente con el estado persistido `en_camino`.
- Cada transición registra una fila en `pedido_historial_estados`.
- Solo pedidos en `pendiente` son despachables; intentos sobre otros estados devuelven error claro a la administradora.

### Decisiones de despliegue

- Target: VPS Linux (Ubuntu) con 1–2 vCPU y 1–2 GB RAM.
- `STREAM_MAX_RETRIES` (entero, default `5`) para límite de reintentos antes de enviar mensajes a `ordering:dlq`.
- Docker Compose: bot-conversation, ordering, postgres, redis, nginx.
- Certbot para certificados Let's Encrypt renovables.
- Seed ejecutado en primer arranque de entornos nuevos; migraciones idempotentes por versión.

### Estrategia de transición

- **No hay migración de datos** desde el monolito; entornos nuevos con esquema + seed.
- **Implementación directa** en `services/bot-conversation-service/` y `services/ordering-service/` según vista de desarrollo del SAD.
- **Validación:** criterios de aceptación = user stories de este PRD; pruebas de integración del flujo completo (registro → menú → carrito → pedido → despacho).
- **Retiro del legado:** eliminación del código monolítico del repositorio tras validación; no se mantiene como referencia operativa.

## Testing Decisions

### Principio rector

Las pruebas verifican **comportamiento observable desde el exterior**: respuestas conversacionales ante entradas dadas, comandos publicados con forma esperada, pedidos persistidos con integridad, constraints de base de datos respetados, eventos emitidos tras operaciones exitosas o fallidas. No se acoplan a nombres de funciones privadas, orden de llamadas internas ni estructura de carpetas.

### Módulos con cobertura de pruebas unitarias

| Módulo | Qué probar |
|--------|------------|
| **Domain — Bot-Conversation** | Transiciones de máquina de estados, parser de comando de despacho, validación de entradas conversacionales. |
| **Domain — Ordering** | Esquemas Zod, cálculo de subtotales y totales, merge de carrito, snapshots, transiciones de estado de pedido, reglas de despacho (solo desde `pendiente`). |
| **Application — Ordering** | Casos de uso con puertos mockeados: `PlaceOrder` (con `direccion_entrega` obligatoria), `AddToCart` (snapshot desde repositorio de productos, no desde payload), `DispatchOrder`, idempotencia por wamid duplicado, clasificación de errores transitorio/permanente. |
| **Infrastructure — Bot-Conversation** | Validador de firma de webhook (payload conocido + secreto → aceptar/rechazar). |

### Módulos con cobertura de pruebas de integración

| Módulo | Qué probar |
|--------|------------|
| **Ordering — PostgreSQL** | Transacción atómica pedido + detalle; FK `cliente_id`; CHECK de estados; inserción en historial; tabla `comandos_procesados`. |
| **Ordering — Migraciones** | Aplicación de DDL desde cero; seed idempotente o repetible en entorno de test. |
| **Ordering — Streams** | Consumo de `PlaceOrder` con `direccion_entrega`, publicación de `OrderPlaced`, `XACK` correcto; `AddToCart` con solo `productId` + `cantidad` congela snapshot; payload inválido hace `XACK` + evento de fallo; mensaje agotado va a `ordering:dlq`. |
| **Bot-Conversation — Streams** | Publicación de comando con wamid, consumo de evento, generación de respuesta. |

### Módulos sin pruebas automatizadas en esta fase

- Adaptador HTTP de Meta Graph API (validación manual en sandbox de Meta).
- Nginx/Certbot y configuración de proxy (validación manual en despliegue).
- Middleware JWT (sin endpoint expuesto; se testeará cuando exista consumidor HTTP).

### Herramientas y convenciones

- **Runner:** Jest en ambos microservicios.
- **Aislamiento:** puertos mockeados en aplicación; Testcontainers o instancias Docker para PostgreSQL y Redis en integración.
- **Prior art:** no existe suite previa; tests redactados desde cero alineados a interfaces de dominio y aplicación del sistema objetivo.

## Out of Scope

- **Pasarela de pagos:** integración con proveedores de pago digital o contraentrega con registro de transacciones.
- **Facturación electrónica (SUNAT / boleta electrónica):** emisión de comprobantes fiscales; se almacena `dni_facturacion` como dato preparatorio.
- **Panel web de gestión de cocina:** interfaz gráfica para la administradora; el despacho permanece vía comando WhatsApp.
- **Tracking de motorizados:** geolocalización, notificaciones de proximidad; el estado `entregado` existe en esquema pero su transición operativa queda para fase posterior.
- **CRUD administrativo de productos:** gestión del catálogo vía interfaz; catálogo cargado por seed o inserción directa en base de datos.
- **Historial de pedidos para el cliente:** consulta de pedidos anteriores por chat.
- **UI enriquecida de WhatsApp:** botones interactivos, listas, plantillas; solo mensajes de texto en esta fase.
- **Canales adicionales:** web, app móvil o SMS.
- **Observabilidad avanzada:** métricas Prometheus, tracing distribuido, dashboards.
- **Pipeline CI/CD automatizado:** posterior a la estructura de tests.
- **Multi-tenancy:** el sistema sirve exclusivamente a «El Sabor de la Selva».
- **Migración de datos del monolito:** no aplica; esquema nuevo + seed.

## Further Notes

### Relación con artefactos existentes

- El **SAD** es la fuente de verdad arquitectónica. Ante conflicto entre este PRD y el SAD en materia de topología o patrones, prevalece el SAD; en materia funcional y de modelo de datos, prevalece este PRD.
- El documento de **contexto inicial** establece restricciones de PII y credenciales que este PRD respeta.
- El código monolítico legado **no es referencia funcional ni técnica** para la implementación.

### Máquina de estados conversacional

Estados previstos: registro (`AWAITING_REGISTRATION_NAME` → `AWAITING_REGISTRATION_ADDRESS`), confirmación de dirección (`CONFIRMING_ADDRESS`), catálogo (`AWAITING_CATALOG` — espera `CatalogLoaded` tras `GetProductCatalog`), selección de producto (`SELECTING_PRODUCT` → `AWAITING_QUANTITY` → `PROVIDING_MENU`), dirección de entrega puntual (`AWAITING_DELIVERY_ADDRESS` — captura NUEVA sin invocar `UpdateClientAddress`), confirmación de pedido (`CONFIRMING_ORDER`). Sesión nula equivale a inicio de flujo ante cualquier mensaje entrante válido.

**Resolución de dirección antes de `PlaceOrder`:**

| Elección del cliente | Valor de `direccion_entrega` en `PlaceOrder` | ¿Invoca `UpdateClientAddress`? |
|----------------------|---------------------------------------------|--------------------------------|
| MISMA | `clientes.direccion_principal` (obtenida vía `GetClientByPhone` / sesión) | No |
| NUEVA | Texto capturado en `AWAITING_DELIVERY_ADDRESS`, guardado en sesión como `direccionEntrega` | No |

### Riesgos identificados

| Riesgo | Mitigación |
|--------|------------|
| Latencia percibida por el usuario al introducir async | Consumidor de streams con procesamiento inmediato; webhook responde 200 tras encolar; mensaje de espera si el evento tarda; caché de `CatalogLoaded` en sesión para «Ver Menú». |
| Complejidad operativa de dos servicios en VPS limitado | Docker Compose unificado; recursos validados en SAD. |
| Regresión funcional sin monolito como red de seguridad | Criterios de aceptación = user stories de este PRD; pruebas de integración del flujo completo. |
| Mensajes duplicados de Meta | Idempotencia por wamid en Redis y PostgreSQL. |
| Webhooks falsificados | Validación `X-Hub-Signature-256` antes de procesar. |
| Bot como fuente de verdad de precios | `AddToCart` transporta solo `productId` + `cantidad`; snapshot en Ordering-Service. |
| Dirección NUEVA no persistida en pedido | `PlaceOrder` exige `direccion_entrega`; flujo NUEVA no usa `UpdateClientAddress`. |
| Mensaje corrupto bloqueando consumidor | Clasificación transitorio/permanente; `XACK` en validación; DLQ `ordering:dlq` tras `STREAM_MAX_RETRIES`. |

### Orden de implementación sugerido

1. Esquema PostgreSQL (migraciones + seed) y estructura de carpetas de ambos servicios con composition roots.
2. Ordering-Service: dominio, repositorios, carrito Redis, idempotencia, consumidor de streams.
3. Bot-Conversation-Service: dominio de estados, validación de firma, adaptadores Redis y Meta, productor/consumidor de streams.
4. Docker Compose con PostgreSQL, Redis y seed para desarrollo local.
5. Pruebas unitarias de dominio e integración del flujo PlaceOrder y DispatchOrder.
6. Validación end-to-end del flujo conversacional completo.
7. Despliegue en VPS con Nginx/Certbot.
8. Eliminación del código monolítico legado del repositorio.

### Convenciones de nomenclatura

- Comandos en PascalCase (`PlaceOrder`, `AddToCart`).
- Eventos de dominio en PascalCase (`OrderPlaced`, `CartUpdated`).
- Estados conversacionales en SCREAMING_SNAKE_CASE.
- Estados de pedido en minúsculas con guion bajo: `pendiente`, `en_camino`, `entregado`.
