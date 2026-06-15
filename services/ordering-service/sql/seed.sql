-- Seed data for local development and integration tests.
-- Idempotent: skips products that already exist by name.

INSERT INTO productos (nombre, precio, activo)
SELECT s.nombre, s.precio, s.activo
FROM (
    VALUES
        ('Arroz con pollo', 18.50::numeric, true),
        ('Lomo saltado', 22.00::numeric, true),
        ('Ají de gallina', 16.00::numeric, true),
        ('Ceviche mixto', 28.00::numeric, true),
        ('Chicha morada (1L)', 8.00::numeric, true)
) AS s(nombre, precio, activo)
WHERE NOT EXISTS (
    SELECT 1 FROM productos p WHERE p.nombre = s.nombre
);
