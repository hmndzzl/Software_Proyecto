-- Preparación idempotente del escenario de usabilidad NeuroLab UVG.
--
-- Ejecutar el mismo día de la sesión. Si se prepara con anticipación, sustituir
-- la siguiente expresión por DATE('AAAA-MM-DD') con la fecha real de la prueba.
-- La fecha de todas las actividades será el día siguiente, en Guatemala.
SET @neurolab_fecha_prueba = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'));
SET @neurolab_fecha_actividad = DATE_ADD(@neurolab_fecha_prueba, INTERVAL 1 DAY);

SET NAMES utf8mb4;

-- Fallar antes de modificar datos si las cuentas registradas o los catálogos no
-- cumplen las precondiciones del protocolo.
DROP PROCEDURE IF EXISTS validar_preparacion_neurolab;
DELIMITER //
CREATE PROCEDURE validar_preparacion_neurolab()
BEGIN
  IF (SELECT COUNT(*) FROM persona WHERE correo = 'lucia.torres@example.com') <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la cuenta única de Lucía Torres';
  END IF;

  IF (SELECT COUNT(*) FROM persona WHERE correo = 'francisco.gutierrez@example.com') <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la cuenta única de Francisco Gutiérrez';
  END IF;

  IF (SELECT COUNT(*) FROM persona WHERE correo = 'raul.lopez@example.com') <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la cuenta única de Raúl López';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM persona p
    INNER JOIN rol r ON r.id = p.rol_id
    WHERE p.correo = 'lucia.torres@example.com'
      AND r.detalle = 'Coordinador de Ministros'
      AND p.estado_cuenta = 'activa'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lucía debe estar activa y ser Coordinador de Ministros';
  END IF;

  IF (SELECT COUNT(*)
      FROM persona p
      INNER JOIN rol r ON r.id = p.rol_id
      WHERE p.correo IN ('francisco.gutierrez@example.com', 'raul.lopez@example.com')
        AND r.detalle = 'Ministro'
        AND p.estado_cuenta = 'activa') <> 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Francisco y Raúl deben estar activos y tener rol Ministro';
  END IF;

  IF (SELECT COUNT(*) FROM rol WHERE detalle = 'Ministro') <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No existe un rol único llamado Ministro';
  END IF;

  IF (SELECT COUNT(*) FROM espacio WHERE nombre = 'Salón Parroquial') <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No existe un único espacio llamado Salón Parroquial';
  END IF;

  IF (SELECT COUNT(*)
      FROM tarea
      WHERE titulo = 'Preparación de materiales para catequesis'
        AND descripcion = 'Organizar los cuadernos y materiales para catequesis.') > 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hay más de una tarea de catequesis del escenario; debe revisarse manualmente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reserva r
    INNER JOIN espacio e ON e.id = r.espacio_id
    INNER JOIN estado_reserva er ON er.id = r.estado_reserva_id
    WHERE e.nombre = 'Salón Parroquial'
      AND r.fecha = @neurolab_fecha_actividad
      AND er.detalle = 'Confirmada'
      AND r.hora_inicio < '11:30:00'
      AND r.hora_fin > '07:30:00'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El Salón Parroquial tiene una reserva confirmada que impide la prueba';
  END IF;
END//
DELIMITER ;

CALL validar_preparacion_neurolab();
DROP PROCEDURE validar_preparacion_neurolab;

START TRANSACTION;

SET @lucia_id = (SELECT id FROM persona WHERE correo = 'lucia.torres@example.com');
SET @francisco_id = (SELECT id FROM persona WHERE correo = 'francisco.gutierrez@example.com');
SET @raul_id = (SELECT id FROM persona WHERE correo = 'raul.lopez@example.com');
SET @ministro_rol_id = (SELECT id FROM rol WHERE detalle = 'Ministro');

-- Ministros ficticios de ambientación. No necesitan iniciar sesión durante el
-- estudio. Si ya existen, se conservan password y clerk_user_id.
INSERT INTO persona (nombre, correo, password, rol_id, disponible, estado_cuenta)
VALUES
  ('María González', 'maria.gonzalez.neurolab@example.com', '$2a$10$/wjxobbU.8zsKirZttlquuWA9xSWJUjQsUpoX2wKlEVpOB4.tF0ZO', @ministro_rol_id, 1, 'activa'),
  ('José Hernández', 'jose.hernandez.neurolab@example.com', '$2a$10$/wjxobbU.8zsKirZttlquuWA9xSWJUjQsUpoX2wKlEVpOB4.tF0ZO', @ministro_rol_id, 1, 'activa'),
  ('Carmen Castillo', 'carmen.castillo.neurolab@example.com', '$2a$10$/wjxobbU.8zsKirZttlquuWA9xSWJUjQsUpoX2wKlEVpOB4.tF0ZO', @ministro_rol_id, 1, 'activa')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  rol_id = VALUES(rol_id),
  disponible = 1,
  estado_cuenta = 'activa';

SET @maria_id = (SELECT id FROM persona WHERE correo = 'maria.gonzalez.neurolab@example.com');
SET @jose_id = (SELECT id FROM persona WHERE correo = 'jose.hernandez.neurolab@example.com');
SET @carmen_id = (SELECT id FROM persona WHERE correo = 'carmen.castillo.neurolab@example.com');

-- Lucía debe ver a los cinco ministros en sus selectores.
INSERT IGNORE INTO coordinador_ministro (coordinador_id, ministro_id) VALUES
  (@lucia_id, @francisco_id),
  (@lucia_id, @raul_id),
  (@lucia_id, @maria_id),
  (@lucia_id, @jose_id),
  (@lucia_id, @carmen_id);

UPDATE persona
SET disponible = 1, estado_cuenta = 'activa'
WHERE id IN (@lucia_id, @francisco_id, @raul_id, @maria_id, @jose_id, @carmen_id);

-- Recolectar notificaciones generadas por una ejecución anterior del recorrido.
CREATE TEMPORARY TABLE tmp_neurolab_notificaciones (
  id int(11) NOT NULL PRIMARY KEY
);

INSERT IGNORE INTO tmp_neurolab_notificaciones (id)
SELECT ct.notificacion_id
FROM cambio_turno ct
WHERE ct.notificacion_id IS NOT NULL
  AND (ct.solicitante_id IN (@francisco_id, @raul_id)
       OR ct.destinatario_id IN (@francisco_id, @raul_id));

INSERT IGNORE INTO tmp_neurolab_notificaciones (id)
SELECT DISTINCT n.id
FROM notificacion n
INNER JOIN persona_notificacion pn ON pn.notificacion_id = n.id
WHERE pn.persona_id IN (@francisco_id, @raul_id)
  AND n.remitente_id = @lucia_id
  AND (
    n.mensaje IN (
      'Se te asignó la tarea: Limpieza del salón parroquial',
      'Se te asignó la tarea: Preparación de materiales para catequesis',
      'Se te quitó la asignación de la tarea: Limpieza del salón parroquial',
      'Se te quitó la asignación de la tarea: Preparación de materiales para catequesis'
    )
    OR n.mensaje LIKE 'Se te reasignó la tarea: Limpieza del salón parroquial%'
    OR n.mensaje LIKE 'Se te reasignó la tarea: Preparación de materiales para catequesis%'
  );

INSERT IGNORE INTO tmp_neurolab_notificaciones (id)
SELECT DISTINCT n.id
FROM notificacion n
WHERE n.remitente_id = @lucia_id
  AND n.mensaje LIKE CONCAT(
    'Nueva solicitud de reserva para el ',
    DATE_FORMAT(@neurolab_fecha_actividad, '%Y-%m-%d'),
    ' (%'
  );

INSERT IGNORE INTO tmp_neurolab_notificaciones (id)
SELECT pa.notificacion_id
FROM periodo_ausencia pa
WHERE pa.notificacion_id IS NOT NULL
  AND pa.ministro_id IN (@francisco_id, @raul_id)
  AND pa.fecha_inicio <= @neurolab_fecha_actividad
  AND pa.fecha_fin >= @neurolab_fecha_actividad;

-- Retirar resultados que deben ser producidos por el participante.
DELETE ct
FROM cambio_turno ct
WHERE ct.solicitante_id IN (@francisco_id, @raul_id)
   OR ct.destinatario_id IN (@francisco_id, @raul_id);

DELETE pa
FROM periodo_ausencia pa
WHERE pa.ministro_id IN (@francisco_id, @raul_id)
  AND pa.fecha_inicio <= @neurolab_fecha_actividad
  AND pa.fecha_fin >= @neurolab_fecha_actividad;

DELETE e
FROM evento e
INNER JOIN reserva r ON r.id = e.reserva_id
INNER JOIN espacio esp ON esp.id = r.espacio_id
WHERE e.titulo = 'Reunión de organización parroquial'
  AND e.descripcion = 'Reunión para organizar las actividades y responsabilidades de la parroquia.'
  AND r.solicitante_id = @lucia_id
  AND esp.nombre = 'Salón Parroquial';

DELETE r
FROM reserva r
INNER JOIN espacio esp ON esp.id = r.espacio_id
LEFT JOIN evento e ON e.reserva_id = r.id
WHERE r.solicitante_id = @lucia_id
  AND esp.nombre = 'Salón Parroquial'
  AND r.fecha = @neurolab_fecha_actividad
  AND r.hora_inicio = '07:30:00'
  AND r.hora_fin = '11:30:00'
  AND e.id IS NULL;

DELETE FROM tarea
WHERE titulo = 'Limpieza del salón parroquial'
  AND descripcion = 'Barrer el piso y ordenar las sillas.'
  AND hora_inicio = '08:00:00'
  AND hora_fin = '09:00:00';

-- Las cuentas dedicadas deben iniciar sin asignaciones ni ausencias que bloqueen
-- las acciones; catequesis debe permanecer sin responsable.
DELETE FROM asignacion_tarea
WHERE persona_id IN (@francisco_id, @raul_id);

DELETE at
FROM asignacion_tarea at
INNER JOIN tarea t ON t.id = at.tarea_id
WHERE t.titulo = 'Preparación de materiales para catequesis'
  AND t.descripcion = 'Organizar los cuadernos y materiales para catequesis.';

DELETE n
FROM notificacion n
INNER JOIN tmp_neurolab_notificaciones tmp ON tmp.id = n.id;

-- Crear o actualizar la única tarea precargada del recorrido.
INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion)
SELECT
  @neurolab_fecha_actividad,
  '12:00:00',
  '13:00:00',
  'Preparación de materiales para catequesis',
  'Organizar los cuadernos y materiales para catequesis.'
WHERE NOT EXISTS (
  SELECT 1
  FROM tarea
  WHERE titulo = 'Preparación de materiales para catequesis'
    AND descripcion = 'Organizar los cuadernos y materiales para catequesis.'
);

UPDATE tarea
SET fecha = @neurolab_fecha_actividad,
    hora_inicio = '12:00:00',
    hora_fin = '13:00:00'
WHERE titulo = 'Preparación de materiales para catequesis'
  AND descripcion = 'Organizar los cuadernos y materiales para catequesis.';

-- Tareas de ambientación, asignadas únicamente a ministros auxiliares.
INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion)
SELECT @neurolab_fecha_actividad, '06:30:00', '07:15:00',
       'Preparación de ornamentos litúrgicos',
       'Revisar y preparar los ornamentos para la celebración de la mañana.'
WHERE NOT EXISTS (
  SELECT 1 FROM tarea
  WHERE titulo = 'Preparación de ornamentos litúrgicos'
    AND descripcion = 'Revisar y preparar los ornamentos para la celebración de la mañana.'
);

INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion)
SELECT @neurolab_fecha_actividad, '18:00:00', '18:30:00',
       'Lectura en misa vespertina',
       'Proclamar la primera lectura durante la celebración vespertina.'
WHERE NOT EXISTS (
  SELECT 1 FROM tarea
  WHERE titulo = 'Lectura en misa vespertina'
    AND descripcion = 'Proclamar la primera lectura durante la celebración vespertina.'
);

INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion)
SELECT DATE_ADD(@neurolab_fecha_actividad, INTERVAL 1 DAY), '10:00:00', '11:00:00',
       'Apoyo en colecta parroquial',
       'Apoyar en la organización y entrega de la colecta parroquial.'
WHERE NOT EXISTS (
  SELECT 1 FROM tarea
  WHERE titulo = 'Apoyo en colecta parroquial'
    AND descripcion = 'Apoyar en la organización y entrega de la colecta parroquial.'
);

INSERT INTO tarea (fecha, hora_inicio, hora_fin, titulo, descripcion)
SELECT DATE_ADD(@neurolab_fecha_actividad, INTERVAL 2 DAY), '15:00:00', '16:00:00',
       'Organización de la bodega',
       'Ordenar materiales y actualizar el inventario de la bodega parroquial.'
WHERE NOT EXISTS (
  SELECT 1 FROM tarea
  WHERE titulo = 'Organización de la bodega'
    AND descripcion = 'Ordenar materiales y actualizar el inventario de la bodega parroquial.'
);

UPDATE tarea
SET fecha = @neurolab_fecha_actividad,
    hora_inicio = '06:30:00', hora_fin = '07:15:00'
WHERE titulo = 'Preparación de ornamentos litúrgicos'
  AND descripcion = 'Revisar y preparar los ornamentos para la celebración de la mañana.';

UPDATE tarea
SET fecha = @neurolab_fecha_actividad,
    hora_inicio = '18:00:00', hora_fin = '18:30:00'
WHERE titulo = 'Lectura en misa vespertina'
  AND descripcion = 'Proclamar la primera lectura durante la celebración vespertina.';

UPDATE tarea
SET fecha = DATE_ADD(@neurolab_fecha_actividad, INTERVAL 1 DAY),
    hora_inicio = '10:00:00', hora_fin = '11:00:00'
WHERE titulo = 'Apoyo en colecta parroquial'
  AND descripcion = 'Apoyar en la organización y entrega de la colecta parroquial.';

UPDATE tarea
SET fecha = DATE_ADD(@neurolab_fecha_actividad, INTERVAL 2 DAY),
    hora_inicio = '15:00:00', hora_fin = '16:00:00'
WHERE titulo = 'Organización de la bodega'
  AND descripcion = 'Ordenar materiales y actualizar el inventario de la bodega parroquial.';

INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id)
SELECT id, @maria_id FROM tarea
WHERE titulo = 'Preparación de ornamentos litúrgicos'
  AND descripcion = 'Revisar y preparar los ornamentos para la celebración de la mañana.';

INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id)
SELECT id, @jose_id FROM tarea
WHERE titulo = 'Lectura en misa vespertina'
  AND descripcion = 'Proclamar la primera lectura durante la celebración vespertina.';

INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id)
SELECT id, @carmen_id FROM tarea
WHERE titulo = 'Apoyo en colecta parroquial'
  AND descripcion = 'Apoyar en la organización y entrega de la colecta parroquial.';

INSERT IGNORE INTO asignacion_tarea (tarea_id, persona_id)
SELECT id, @maria_id FROM tarea
WHERE titulo = 'Organización de la bodega'
  AND descripcion = 'Ordenar materiales y actualizar el inventario de la bodega parroquial.';

DROP TEMPORARY TABLE tmp_neurolab_notificaciones;

COMMIT;

-- Resumen verificable de la preparación aplicada.
SELECT @neurolab_fecha_prueba AS fecha_prueba,
       @neurolab_fecha_actividad AS fecha_actividades;

SELECT p.nombre, p.correo, r.detalle AS rol, p.disponible, p.estado_cuenta
FROM persona p
INNER JOIN rol r ON r.id = p.rol_id
WHERE p.correo IN (
  'lucia.torres@example.com',
  'francisco.gutierrez@example.com',
  'raul.lopez@example.com',
  'maria.gonzalez.neurolab@example.com',
  'jose.hernandez.neurolab@example.com',
  'carmen.castillo.neurolab@example.com'
)
ORDER BY p.nombre;

SELECT t.id, t.titulo, t.fecha, t.hora_inicio, t.hora_fin,
       GROUP_CONCAT(p.nombre ORDER BY p.nombre SEPARATOR ', ') AS responsables
FROM tarea t
LEFT JOIN asignacion_tarea at ON at.tarea_id = t.id
LEFT JOIN persona p ON p.id = at.persona_id
WHERE t.titulo IN (
  'Preparación de materiales para catequesis',
  'Preparación de ornamentos litúrgicos',
  'Lectura en misa vespertina',
  'Apoyo en colecta parroquial',
  'Organización de la bodega'
)
GROUP BY t.id, t.titulo, t.fecha, t.hora_inicio, t.hora_fin
ORDER BY t.fecha, t.hora_inicio;
