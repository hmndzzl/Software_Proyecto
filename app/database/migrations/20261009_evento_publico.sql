-- Agenda pública (HU-32): ejecutar una vez sobre bases existentes.
-- Ningún evento existente se publica automáticamente; no elimina datos.
ALTER TABLE evento
  ADD COLUMN IF NOT EXISTS publico tinyint(1) NOT NULL DEFAULT 0;
