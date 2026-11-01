-- Aplicar antes de desplegar la funcionalidad a bases existentes. No elimina datos.
ALTER TABLE persona ADD COLUMN IF NOT EXISTS foto_url varchar(255) DEFAULT NULL;
