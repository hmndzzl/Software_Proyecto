-- Dos pasos: conserva NULL para filas históricas, sin inventar su hora de envío.
ALTER TABLE notificacion ADD COLUMN IF NOT EXISTS enviado_en DATETIME NULL DEFAULT NULL;
ALTER TABLE notificacion ALTER COLUMN enviado_en SET DEFAULT (UTC_TIMESTAMP());
