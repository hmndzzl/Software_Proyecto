-- Ejecutar una vez por ambiente con BD existente; es seguro repetirla.
-- Las reservas históricas conservan NULL (cantidad no registrada).
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS cantidad_personas INT DEFAULT NULL CHECK (cantidad_personas > 0);
