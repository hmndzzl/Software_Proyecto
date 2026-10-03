-- Integración con Clerk: ejecutar una vez sobre bases existentes; no elimina datos.
-- Vincula cada persona con su usuario de Clerk. Los roles siguen viviendo en
-- persona.rol_id, así que el acceso a rutas no cambia durante la migración.
ALTER TABLE persona
  ADD COLUMN IF NOT EXISTS clerk_user_id varchar(64) DEFAULT NULL;

ALTER TABLE persona
  ADD UNIQUE KEY IF NOT EXISTS uq_persona_clerk_user_id (clerk_user_id);
