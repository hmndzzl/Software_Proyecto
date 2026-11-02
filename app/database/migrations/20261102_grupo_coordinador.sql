-- Un grupo pastoral puede tener varios coordinadores, pero cada coordinador solo puede
-- estar a cargo de un grupo a la vez (coordinador_id UNIQUE, no en la PK compuesta).
CREATE TABLE IF NOT EXISTS grupo_coordinador (
  grupo_id int(11) NOT NULL,
  coordinador_id int(11) NOT NULL,
  PRIMARY KEY (grupo_id, coordinador_id),
  UNIQUE KEY uq_grupo_coord_coordinador (coordinador_id),
  CONSTRAINT fk_grupo_coord_grupo FOREIGN KEY (grupo_id) REFERENCES grupo (id) ON DELETE CASCADE,
  CONSTRAINT fk_grupo_coord_coordinador FOREIGN KEY (coordinador_id) REFERENCES persona (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO grupo_coordinador (grupo_id, coordinador_id)
SELECT id, coordinador_id FROM grupo WHERE coordinador_id IS NOT NULL;

ALTER TABLE grupo DROP FOREIGN KEY fk_grupo_coordinador;
ALTER TABLE grupo DROP KEY uq_grupo_coordinador;
ALTER TABLE grupo DROP COLUMN coordinador_id;
