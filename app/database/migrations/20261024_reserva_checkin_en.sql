-- HU-15: check-in real de espacio vía QR. Registra cuándo se confirmó presencia
-- en una reserva confirmada; NULL mientras no se haga check-in.
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS checkin_en DATETIME NULL DEFAULT NULL;
