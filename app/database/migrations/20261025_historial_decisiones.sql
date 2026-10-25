-- No se reconstruyen decisiones anteriores: no se conoce su autor ni su fecha.
CREATE TABLE IF NOT EXISTS reserva_decision (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reserva_id INT NOT NULL,
  resultado ENUM('aprobada','rechazada','pendiente','cancelada') NOT NULL,
  actor_id INT DEFAULT NULL,
  actor_nombre VARCHAR(100) NOT NULL,
  fecha_utc DATETIME(3) NOT NULL,
  KEY idx_reserva_decision (reserva_id, fecha_utc, id),
  CONSTRAINT fk_decision_reserva FOREIGN KEY (reserva_id) REFERENCES reserva(id) ON DELETE CASCADE,
  CONSTRAINT fk_reserva_decision_actor FOREIGN KEY (actor_id) REFERENCES persona(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS cuenta_decision (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cuenta_id INT NOT NULL,
  resultado ENUM('aprobada','rechazada') NOT NULL,
  actor_id INT DEFAULT NULL,
  actor_nombre VARCHAR(100) NOT NULL,
  fecha_utc DATETIME(3) NOT NULL,
  KEY idx_cuenta_decision (cuenta_id, fecha_utc, id),
  CONSTRAINT fk_decision_cuenta FOREIGN KEY (cuenta_id) REFERENCES persona(id) ON DELETE CASCADE,
  CONSTRAINT fk_cuenta_decision_actor FOREIGN KEY (actor_id) REFERENCES persona(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
