-- Columnas de fechas en pedidos (ejecutar si la tabla ya existía sin ellas)
-- psql "$DATABASE_URL" -f sql/migration_pedidos_fechas.sql

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS fecha_atencion TIMESTAMPTZ;
