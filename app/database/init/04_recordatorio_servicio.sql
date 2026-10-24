CREATE TABLE IF NOT EXISTS recordatorio_servicio (
  tarea_id INT NOT NULL,
  persona_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  enviado_en DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (tarea_id, persona_id, fecha, hora_inicio),
  CONSTRAINT fk_recordatorio_tarea FOREIGN KEY (tarea_id) REFERENCES tarea(id) ON DELETE CASCADE,
  CONSTRAINT fk_recordatorio_persona FOREIGN KEY (persona_id) REFERENCES persona(id) ON DELETE CASCADE
) ENGINE=InnoDB;
