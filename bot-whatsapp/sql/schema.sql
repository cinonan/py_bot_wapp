-- Esquema inicial: productos y pedidos
-- Ejecutar con: psql "$DATABASE_URL" -f sql/schema.sql

-- 1. Tabla de clientes con DNI opcional
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    telefono VARCHAR(20) UNIQUE NOT NULL, -- Identificador principal para el Bot
    nombre VARCHAR(100),
    dni VARCHAR(15) UNIQUE,                -- Campo opcional y único
    direccion_principal TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  estado VARCHAR(64) NOT NULL DEFAULT 'pendiente',
  direccion_entrega TEXT,
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_atencion TIMESTAMPTZ,

  CONSTRAINT fk_cliente_telefono 
        FOREIGN KEY (cliente) 
        REFERENCES clientes(telefono) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos (cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    -- Columna calculada automáticamente para evitar errores de redondeo o lógica
    monto_total NUMERIC(12, 2) NOT NULL GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    
    -- Si se borra el pedido, se borra el detalle (Limpieza lógica)
    CONSTRAINT fk_pedido 
        FOREIGN KEY(id_pedido) 
        REFERENCES pedidos(id) 
        ON DELETE CASCADE,
        
    -- Si el producto tiene pedidos, NO se puede borrar del catálogo (Integridad histórica)
    CONSTRAINT fk_producto 
        FOREIGN KEY(id_producto) 
        REFERENCES productos(id) 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_detalle_pedido ON detalle_pedidos (pedido_id);
