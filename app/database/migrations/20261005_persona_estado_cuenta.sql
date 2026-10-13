-- Aprobación de cuentas: ejecutar una vez sobre bases existentes; no elimina datos.
-- Las personas existentes quedan 'activa'. Las cuentas que llegan por Clerk sin una
-- persona registrada se crean como 'pendiente' hasta que Admin o Sacerdote las apruebe.
ALTER TABLE persona
  ADD COLUMN IF NOT EXISTS estado_cuenta ENUM('pendiente','activa','rechazada') NOT NULL DEFAULT 'activa';
