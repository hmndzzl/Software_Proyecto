-- Aplicar ANTES de desplegar SEC-03. Los JWT anteriores sin sesión persistida
-- se rechazan; los usuarios deberán volver a iniciar sesión. No borra personas.
CREATE TABLE IF NOT EXISTS sesion_jwt (
  id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  persona_id int(11) NOT NULL,
  refresh_hash char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expira_en bigint unsigned NOT NULL COMMENT 'Unix timestamp UTC, segundos',
  revocada_en datetime(3) DEFAULT NULL COMMENT 'UTC',
  PRIMARY KEY (id),
  KEY idx_sesion_persona (persona_id),
  KEY idx_sesion_expira (expira_en),
  CONSTRAINT fk_sesion_jwt_persona FOREIGN KEY (persona_id) REFERENCES persona(id) ON DELETE CASCADE
) ENGINE=InnoDB;
