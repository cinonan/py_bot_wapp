-- 001_initial_schema.sql
-- Target relational model for Ordering-Service (PRD § Evolución del modelo de datos)

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100),
    direccion_principal TEXT,
    dni VARCHAR(15) UNIQUE,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    estado VARCHAR(32) NOT NULL DEFAULT 'pendiente',
    direccion_entrega TEXT,
    dni_facturacion VARCHAR(15),
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_atencion TIMESTAMPTZ,
    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_pedidos_estado
        CHECK (estado IN ('pendiente', 'en_camino', 'entregado'))
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    nombre_producto VARCHAR(255) NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (id_producto)
        REFERENCES productos (id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_detalle_pedido ON detalle_pedidos (id_pedido);

CREATE TABLE IF NOT EXISTS pedido_historial_estados (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL,
    estado_anterior VARCHAR(32),
    estado_nuevo VARCHAR(32) NOT NULL,
    origen VARCHAR(64) NOT NULL,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_historial_pedido
        FOREIGN KEY (pedido_id)
        REFERENCES pedidos (id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedido_historial_pedido_id
    ON pedido_historial_estados (pedido_id);

CREATE INDEX IF NOT EXISTS idx_pedido_historial_registrado_en
    ON pedido_historial_estados (registrado_en);

CREATE TABLE IF NOT EXISTS comandos_procesados (
    wamid VARCHAR(128) PRIMARY KEY,
    tipo_comando VARCHAR(64) NOT NULL,
    procesado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comandos_procesados_procesado_en
    ON comandos_procesados (procesado_en);
