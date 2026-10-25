-- D4: aplicar antes de desplegar el backend. Conserva tareas y asignaciones.
ALTER TABLE tarea ADD COLUMN IF NOT EXISTS evento_id int(11) DEFAULT NULL;
ALTER TABLE tarea ADD INDEX IF NOT EXISTS idx_tarea_evento (evento_id);

-- La comprobación permite repetir la migración sin duplicar la clave foránea.
SET @d4_fk_sql = IF(
  EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'tarea'
           AND CONSTRAINT_NAME = 'fk_tarea_evento'),
  'SELECT 1',
  'ALTER TABLE tarea ADD CONSTRAINT fk_tarea_evento FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE SET NULL'
);
PREPARE d4_fk_statement FROM @d4_fk_sql;
EXECUTE d4_fk_statement;
DEALLOCATE PREPARE d4_fk_statement;
