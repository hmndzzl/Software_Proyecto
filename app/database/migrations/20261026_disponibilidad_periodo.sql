CREATE TABLE IF NOT EXISTS disponibilidad_periodo (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ministro_id INT NOT NULL,
  desde DATETIME NOT NULL,
  hasta DATETIME NOT NULL,
  CONSTRAINT fk_disponibilidad_ministro FOREIGN KEY (ministro_id) REFERENCES persona(id) ON DELETE CASCADE,
  CONSTRAINT chk_disponibilidad_rango CHECK (desde < hasta),
  INDEX idx_disponibilidad_rango (ministro_id, desde, hasta)
) ENGINE=InnoDB;
