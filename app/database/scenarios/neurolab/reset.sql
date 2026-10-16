-- Restablece exclusivamente el recorrido NeuroLab entre participantes.
-- La limpieza, la reserva y las ausencias del recorrido corresponden al día
-- siguiente a la sesión. Catequesis conserva una fecha fija independiente.
SET @neurolab_fecha_prueba = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'));
SET @neurolab_fecha_actividad = DATE_ADD(@neurolab_fecha_prueba, INTERVAL 1 DAY);
SET @neurolab_fecha_catequesis = DATE('2026-10-23');

SET NAMES utf8mb4;
START TRANSACTION;

SET @lucia_id = (SELECT id FROM persona WHERE correo = 'lucia.torres@example.com');
SET @francisco_id = (SELECT id FROM persona WHERE correo = 'francisco.gutierrez@example.com');
SET @raul_id = (SELECT id FROM persona WHERE correo = 'raul.lopez@example.com');

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
  AND fecha = @neurolab_fecha_actividad
  AND hora_inicio = '08:00:00'
  AND hora_fin = '09:00:00';

DELETE FROM asignacion_tarea
WHERE persona_id IN (@francisco_id, @raul_id);

DELETE at
FROM asignacion_tarea at
INNER JOIN tarea t ON t.id = at.tarea_id
WHERE t.titulo = 'Preparación de materiales para catequesis'
  AND t.descripcion = 'Organizar los cuadernos y materiales para catequesis.';

UPDATE tarea
SET fecha = @neurolab_fecha_catequesis,
    hora_inicio = '12:00:00',
    hora_fin = '13:00:00'
WHERE titulo = 'Preparación de materiales para catequesis'
  AND descripcion = 'Organizar los cuadernos y materiales para catequesis.';

UPDATE persona
SET disponible = 1
WHERE id IN (@lucia_id, @francisco_id, @raul_id);

DELETE n
FROM notificacion n
INNER JOIN tmp_neurolab_notificaciones tmp ON tmp.id = n.id;

DROP TEMPORARY TABLE tmp_neurolab_notificaciones;
COMMIT;

-- Debe devolver cinco ceros y una fila de catequesis sin responsable.
SELECT
  (SELECT COUNT(*) FROM asignacion_tarea WHERE persona_id = @francisco_id) AS asignaciones_francisco,
  (SELECT COUNT(*) FROM asignacion_tarea WHERE persona_id = @raul_id) AS asignaciones_raul,
  (SELECT COUNT(*)
   FROM tarea
   WHERE titulo = 'Limpieza del salón parroquial'
     AND descripcion = 'Barrer el piso y ordenar las sillas.'
     AND fecha = @neurolab_fecha_actividad) AS tareas_limpieza,
  (SELECT COUNT(*)
   FROM cambio_turno
   WHERE solicitante_id IN (@francisco_id, @raul_id)
      OR destinatario_id IN (@francisco_id, @raul_id)) AS cambios_turno,
  (SELECT COUNT(*)
   FROM reserva r
   INNER JOIN evento e ON e.reserva_id = r.id
   WHERE r.solicitante_id = @lucia_id
     AND e.titulo = 'Reunión de organización parroquial'
     AND r.fecha = @neurolab_fecha_actividad) AS reservas_prueba;

SELECT t.id, t.titulo, t.fecha, t.hora_inicio, t.hora_fin,
       COUNT(at.persona_id) AS responsables
FROM tarea t
LEFT JOIN asignacion_tarea at ON at.tarea_id = t.id
WHERE t.titulo = 'Preparación de materiales para catequesis'
  AND t.descripcion = 'Organizar los cuadernos y materiales para catequesis.'
GROUP BY t.id, t.titulo, t.fecha, t.hora_inicio, t.hora_fin;
