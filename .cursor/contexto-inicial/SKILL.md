DOCUMENTO DE TRANSFERENCIA DE CONTEXTO (HANDOVER DOCUMENT)
Proyecto: Ecosistema Distribuido «El Sabor de la Selva»

1. Estado Actual y Contexto del Proyecto
El sistema se encuentra en la fase de transición arquitectónica, evolucionando desde un controlador Express monolítico hacia una arquitectura de microservicios distribuidos, asíncronos y dirigidos por eventos (Event-Driven Architecture). El núcleo técnico está unificado en Node.js, Express, Redis y PostgreSQL.

Se han cerrado con éxito todas las decisiones del nuevo diseño mediante un proceso de interrogación técnica (grill-me) con el ingeniero de sistemas a cargo. Los límites de los componentes, la gestión de la persistencia y las estrategias de integración ya han sido formalizados.

2. Artefactos del Sistema y Referencias
Para evitar la duplicación de información técnica y de negocio, se debe consultar el estado del arte directamente en los siguientes archivos locales:

architecture/SAD (Documento de Diseño Arquitectónico): Contiene la especificación técnica bajo la norma ISO/IEC/IEEE 42010 y el Modelo de Vistas 4+1 de Kruchten. Incluye las definiciones de la consistencia eventual con Redis Streams, el patrón Database-per-Service, el perímetro de seguridad criptográfica asimétrica (RS256) para futuros módulos, y los diagramas C4 (Contexto, Contenedores, Componentes y Secuencia UML).

Documento especificación tecnica.docx (Contexto de Negocio Base): Contiene un ligero borrador de las historias de usuario iniciales y de algunas restricciones

Código fuente del proyecto (Estado actual del proyecto)

3. Habilidades Sugeridas para el Agente Receptor (Suggested Skills)
Para asegurar la continuidad del proyecto con el más alto estándar de calidad, se recomienda que el nuevo agente ejecute las siguientes capacidades y modos de operación de manera estricta:

Agent Mode (Ejecución Autónoma Dirigida): Capacidad para operar de manera autónoma sobre el sistema de archivos del espacio de trabajo con el fin de crear, estructurar y refinar el archivo prd.md directamente en la ruta requerida por el usuario.

Architectural Compliance (Cumplimiento de Restricciones): Habilidad para validar de forma cruzada que cada especificación funcional redactada en el PRD no viole los límites físicos establecidos en la vista lógica y de desarrollo de architecture/SAD.

Asynchronous Pattern Translation (Modelado Asíncrono): Habilidad para traducir flujos de interacción de usuario de un chat secuencial a contratos de eventos asíncronos distribuidos en Redis Streams, diferenciando nítidamente entre comandos (OrderRequested) y eventos de dominio (OrderPlaced).

Clean Architecture Clean-Room Isolation (Aislamiento de Capas): Destreza para estructurar la segmentación vertical del software (src/modules/), garantizando que los nuevos subpaquetes técnicos de infraestructura (infrastructure/messaging/) queden completamente aislados de los casos de uso puros en la capa de aplicación.

4. Control de Información Sensible (PII y Seguridad)
Aislamiento de Identidad: Toda la información de identificación personal relacionada con los clientes finales o el negocio familiar (ej. nombres, ubicaciones geográficas exactas, números de teléfono específicos) se encuentra abstracta en los modelos de datos y no debe plasmarse de forma explícita en los requerimientos del PRD.

Censura de Credenciales: Queda estrictamente prohibido escribir tokens de acceso de Meta, cadenas de conexión a PostgreSQL (DATABASE_URL), credenciales de la instancia de Redis o strings de llaves de firma criptográfica dentro de los archivos Markdown del proyecto. Toda configuración de seguridad debe ser referenciada exclusivamente a través de variables de entorno protegidas (process.env.*) e inyectadas en la raíz de composición manual.