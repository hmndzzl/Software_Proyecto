-- HU-31: ejecutar una vez sobre bases existentes; no elimina datos.
CREATE TABLE IF NOT EXISTS periodo_ausencia (
  id int(11) NOT NULL AUTO_INCREMENT,
  ministro_id int(11) NOT NULL,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  notificacion_id int(11) DEFAULT NULL,
  creado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ausencia_ministro_fechas (ministro_id, fecha_inicio, fecha_fin),
  CONSTRAINT chk_ausencia_fechas CHECK (fecha_inicio <= fecha_fin),
  CONSTRAINT fk_ausencia_ministro FOREIGN KEY (ministro_id) REFERENCES persona (id),
  CONSTRAINT fk_ausencia_notificacion FOREIGN KEY (notificacion_id) REFERENCES notificacion (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
