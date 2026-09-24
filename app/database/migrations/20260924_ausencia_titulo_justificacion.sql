-- Ejecutar después de 20260923_periodo_ausencia.sql en bases existentes.
-- Los registros históricos conservan cadenas vacías: no se inventa su justificación.
ALTER TABLE periodo_ausencia
  ADD COLUMN IF NOT EXISTS titulo varchar(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS justificacion text NOT NULL DEFAULT '';

ALTER TABLE periodo_ausencia
  ALTER COLUMN titulo DROP DEFAULT,
  ALTER COLUMN justificacion DROP DEFAULT;
