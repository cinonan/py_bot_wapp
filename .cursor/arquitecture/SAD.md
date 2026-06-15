DOCUMENTO DE DISEÑO ARQUITECTÓNICO (SAD)
Ecosistema Distribuido y Conversacional «El Sabor de la Selva»
Estándar de Referencia: ISO/IEC/IEEE 42010 / Modelo de Vistas 4+1 de Kruchten

Arquitecto Responsable: Carlos Inonan (Senior Backend Developer / Systems Engineer)

Fecha: Junio de 2026

Estado: Aprobado para Implementación

1. Introducción y Metas Arquitectónicas (ISO/IEC/IEEE 42010)
El presente documento define la transición del bot conversacional de «El Sabor de la Selva» desde una implementación monolítica en un único controlador Express hacia un ecosistema distribuido basado en microservicios y dirigido por eventos (Event-Driven Architecture).

Metas Fundamentales
Extensibilidad Estricta: Habilitar el acoplamiento inmediato de futuros módulos de negocio (Pasarela de Pagos, Facturación Electrónica para boletas con DNI, Gestión de Cocina, Tracking de Motorizados) sin alterar el código del núcleo conversacional.

Desacoplamiento de Canales: Aislar las reglas de negocio de la lógica del cliente de mensajería (WhatsApp Cloud API de Meta), tratando al chat puramente como una Interfaz de Usuario Conversacional (CUI).

Eficiencia Operativa: Mantener un consumo mínimo de recursos de infraestructura y una curva de aprendizaje plana utilizando un stack unificado en Node.js, Express, Redis y PostgreSQL.

2. Vista de Casos de Uso (El "+1" de Kruchten)
Esta vista representa las fuerzas que dirigen la arquitectura (Invariantes de negocio).

  +------------------+         ( Envía mensaje / Inicia flujo )         +-----------------------+
  |  Cliente Final   | -----------------------------------------------> | Bot WhatsApp (UI/CUI) |
  +------------------+                                                  +-----------------------+
           |                                                                        |
           | (Interactúa con catálogo/carrito)                                      | (Publica Eventos)
           v                                                                        v
  +------------------+        ( Procesa reglas, snapshots e I/O )       +-----------------------+
  |   Uso del Core   | <----------------------------------------------- |  Ordering Service     |
  +------------------+                                                  +-----------------------+
           ^                                                                        |
           | (Monitorea y despacha órdenes sin depender del estado del bot)         | (Notifica estados)
           |                                                                        v
  +------------------+                                                  +-----------------------+
  |  Administradora  | -----------------------------------------------> |  Despacho de Cocina   |
  +------------------+                                                  +-----------------------+
3. Vista Lógica (Clean Architecture Interna)
Cada microservicio del ecosistema implementa de forma interna una Clean Architecture Pragmática (Hexagonal) utilizando empaquetamiento vertical por contextos delimitados (Bounded Contexts) dentro de la ruta src/modules/.

Regla de Dependencia
El Dominio (domain/) contiene lógica pura y validadores estructurados con Zod. No posee dependencias ni importaciones de Express, pg, redis ni axios.

Organización de Capas Internas (Ejemplo: Ordering Service)
src/modules/ordering/domain/: Entidades ligeras (Cart, Order), calculadores de precios y esquemas Zod para cantidades, DNI de 8 dígitos y teléfonos.

src/modules/ordering/application/: Casos de uso (PlaceOrder, AddToCart), interfaces de puertos (OrderRepositoryPort, CartStorePort).

src/modules/ordering/infrastructure/: Adaptadores concretos. Repositorios pg para PostgreSQL (transacción createWithDetails), clientes HTTP para endpoints, drivers de conexión a bases de datos y manejadores de eventos distribuidos(Código tecnológico que escucha Redis y atrapa el evento).

4. Vista de Procesos (Comunicación Asíncrona y Redis Streams)
La comunicación inter-servicio es completamente asíncrona y desacoplada en tiempo, utilizando Redis Streams como Message Broker de alta velocidad en memoria.

+------------------------+                      +-----------------------+                      +--------------------------+
|  Bot-WhatsApp Service  |                      |     Redis Streams     |                      |     Ordering Service     |
+------------------------+                      +-----------------------+                      +--------------------------+
            |                                               |                                                |
            |-- 1. Publica Comando ------------------------>|                                                |
            |   stream:bot:events                           |                                                |
            |   payload: { action: "ADD_ITEM", ... }        |                                                |
            |                                               |-- 2. Consume mediante Consumer Group --------->|
            |                                               |                                                | [Procesa Reglas]
            |                                               |                                                | [Persiste Carrito]
            |                                               |<-- 3. Publica Evento de Dominio ---------------|
            |                                               |    stream:ordering:events                      |
            |                                               |    payload: { status: "UPDATED", ... }         |
            |<-- 4. Consume Evento y genera Replies --------|                                                |
            |                                               |                                                |
            |-- 5. Envía HTTP Post ------------------------------------------------------------------------->| [Meta WhatsApp API]
            v                                               v                                                v
Mecanismos de Concurrencia y Resiliencia
Garantía de Entrega (At-Least-Once): Los microservicios consumen los Streams mediante Consumer Groups nativos de Redis. Un mensaje solo se elimina de la lista de pendientes (PEL) cuando el servicio destino procesa con éxito la transacción y envía el comando XACK.

Idempotencia Conversacional: El microservicio de conversación inyecta el identificador único del mensaje de Meta (wamid) como metadato en el payload del evento enviado a Redis Streams. El servicio de pedidos valida este ID contra una caché rápida para ignorar solicitudes duplicadas por reintentos de red.

5. Vista de Desarrollo (Estructura de Carpetas en Cursor)
Para asegurar el crecimiento modular físico del proyecto, la raíz se organiza por servicios verticales independientes, rompiendo el esquema monolítico clásico.

bot-whatsapp/
├── docker-compose.yml              # Orquestación de infraestructura local y producción
├── sql/                            # Esquemas DDL puros e históricos para PostgreSQL
│
├── services/
│   ├── bot-conversation-service/   # Microservicio UI Conversacional (Proceso Node.js 1)
│   │   ├── src/
│   │   │   ├── modules/bot-conversation/
│   │   │   │   ├── domain/         # State Machine de conversación y validadores de texto
│   │   │   │   ├── application/    # Manejadores de estados por router conversacional (M1)
│   │   │   │   └── infrastructure/ # Adaptador de sesión Redis y Gateway HTTP cliente para Meta
│   │   │   ├── app.js              # Bootstrap Express (solo Webhook de entrada)
│   │   │   └── composition/        # createDependencies() - Raíz de composición manual (sin DI Frameworks)
│   │   └── package.json            # Dependencias: express, redis, axios, zod, jest
│   │
│   └── ordering-service/           # Microservicio Core de Negocio (Proceso Node.js 2)
│       ├── src/
│       │   ├── modules/ordering/
│       │   │   ├── domain/         # Validadores puros de negocio (Zod), Snapshots de precio, DNI
│       │   │   ├── application/    # Casos de uso (PlaceOrder, AddToCart, ClearCart)
│       │   │   └── infrastructure/ # Repositorios pg (Postgres SQL), Adaptador de Carrito Redis
│       │   ├── app.js              # Bootstrap Express / Consumidor activo de Redis Streams
│       │   └── composition/        # createDependencies() manual para base de datos
│       └── package.json            # Dependencias: express, pg, redis, zod, jest
6. Vista de Despliegue (Infraestructura Física VPS)
El despliegue está optimizado para garantizar un rendimiento óptimo con un costo fijo predecible y controlado, ideal para un modelo de negocio local administrado desde el distrito de Pueblo Libre.

Host físico: Servidor Privado Virtual (VPS) basado en Linux (Ubuntu Server) con recursos mínimos garantizados (1 vCPU, 1GB-2GB RAM).

Aislamiento por Contenedores: Se utiliza Docker y Docker Compose para garantizar la paridad absoluta entre el entorno de desarrollo local en Cursor y el servidor de producción.

Red Aislada: Los contenedores comparten una red virtual interna mutable (backend-network). PostgreSQL y Redis no exponen puertos al internet público, protegiendo las bases de datos relacionales y en memoria. Solo el puerto del microservicio de Conversación mapea hacia el exterior mediante un proxy inverso (Nginx / Certbot SSL) para recibir de forma segura los payloads del webhook de Meta.

7. Vista de Seguridad (Perímetros y Restricciones)
Aislamiento de Persistencia (Database-per-Service): El Bot-Conversation-Service no posee credenciales ni acceso de red al servidor de PostgreSQL. El acceso a las tablas relacionales (clientes, productos, pedidos, detalle_pedidos) queda restringido en exclusiva para el Ordering-Service.

Control de Comandos Administrativos (A0): El comando global "Despachar [ID]" se intercepta en la capa HTTP del microservicio de Conversación antes de disparar cualquier flujo en la máquina de estados o leer la sesión del cliente. Se valida estrictamente contra la variable de entorno protegida ADMIN_ORDER_NOTIFY_PHONE.

Seguridad de Extensibilidad: Cualquier módulo de interfaz futuro (por ejemplo, una pantalla web para cocina en Node.js) que requiera comunicarse directamente por HTTP con el Ordering-Service, deberá cruzar obligatoriamente un middleware de autenticación por Tokens JWT (JSON Web Tokens) firmados asíncronamente en las variables de entorno del microservicio de negocio.

ANEXOS: MODELO DIAGRAMACIÓN C4
Anexo A: Diagrama de Contexto (Nivel 1 C4)
                                  +------------------------------------+
                                  |         Meta WhatsApp Cloud        |
                                  |    (API Externa de Mensajería)     |
                                  +------------------------------------+
                                         ^                      |
                       Envia Respuestas  |                      | Payload de Webhook
                            HTTP POST    |                      | HTTP POST
                                         |                      v
   +------------------+           +------------------------------------+           +-------------------+
   |  Cliente Final   | --------> |     Ecosistema Conversacional      | <-------- |   Administradora  |
   | (Compra Comida)  |  Mensajes |       «El Sabor de la Selva»       | Comandos  | (Despacha Cocina) |
   +------------------+  WhatsApp +------------------------------------+ «Despachar»+-------------------+
Anexo B: Diagrama de Contenedores (Nivel 2 C4)
+---------------------------------------------------------------------------------------------------------+
| Ecosistema «El Sabor de la Selva» (VPS Boundary)                                                        |
|                                                                                                         |
|  +---------------------------+    Comandos/Eventos Async     +---------------------------------------+  |
|  | Bot-Conversation Service  | ----------------------------> |             Redis Streams             |  |
|  | (Express Node.js UI Chat) | <---------------------------- |            (Message Broker)           |  |
|  +---------------------------+     Eventos de Dominio        +---------------------------------------+  |
|                |                                                                 ^                      |
|                | Consulta Estado Conversación                                    | Consulta / Actualiza |
|                v                                                                 | ítems de Carrito     |
|  +---------------------------+                                                   |                      |
|  |    Redis Session Cache    |                                    +-----------------------------------+ |
|  |  (DB Volátil de Estados)  |                                    |          Ordering Service         | |
|  +---------------------------+                                    |    (Express Core de Negocio)      | |
|                                                                   +-----------------------------------+ |
|                                                                                     |                   |
|                                                                                     | Lectura/ Escritura|
|                                                                                     | Transaccional ACID|
|                                                                                     v                   |
|                                                                   +-----------------------------------+ |
|                                                                   |         PostgreSQL Server         | |
|                                                                   |      (Base de Datos Relacional)   | |
|                                                                   +-----------------------------------+ |
+---------------------------------------------------------------------------------------------------------+
Anexo C: Diagrama de Secuencia UML - Flujo Crítico de Compra (PlaceOrder)
El siguiente diagrama modela el comportamiento secuencial asíncrono y la interacción exacta de componentes desde que el cliente confirma el pedido por el chat hasta la persistencia y la limpieza de caché.

Cliente       Meta Webhook     Bot-Service      Redis Streams    Ordering-Service      PostgreSQL
   |               |                |                 |                  |                  |
   |-- Confirma -->|                |                 |                  |                  |
   |   Pedido      |-- HTTP POST -->|                 |                  |                  |
   |               |   (Payload)    |                 |                  |                  |
   |               |                |-- XADD -------->|                  |                  |
   |               |<-- HTTP 200 ---|   OrderRequested|                  |                  |
   |               |    (ACK Meta)  |                 |-- Read Event --->|                  |
   |               |                |                 |   (Group Cons.)  |                  |
   |               |                |                 |                  |-- BEGIN Trans. ->|
   |               |                |                 |                  |   Insert Order   |
   |               |                |                 |                  |   Insert Details |
   |               |                |                 |                  |<- COMMIT --------|
   |               |                |                 |<-- XADD ---------|                  |
   |               |                |                 |    OrderPlaced   |                  |
   |               |                |<-- Read Event --|                  |                  |
   |               |                |    (OrderPlaced)|                  |                  |
   |               |                |                 |                  |                  |
   |               |                |-- Clear --------|                  |                  |
   |               |                |   Session/Cart  |                  |                  |
   |               |<-- HTTP POST --|                 |                  |                  |
   |               |   (Replies UI) |                 |                  |                  |
   |<- Mensaje ----|                |                 |                  |                  |
   |   Confirmado  |                |                 |                  |                  |