-- 02_seeds.sql

-- Roles del sistema
-- rol_id: 1=Sacerdote, 2=Coordinador de Ministros, 3=Coordinador de Grupos, 4=Ministro, 5=Admin
INSERT INTO `rol` (`detalle`) VALUES
  ('Sacerdote'),
  ('Coordinador de Ministros'),
  ('Coordinador de Grupos'),
  ('Ministro'),
  ('Admin');

-- Espacios físicos de la parroquia
INSERT INTO `espacio` (`nombre`, `capacidad`) VALUES
  ('Templo Principal',      500),
  ('Salón Parroquial',      150),
  ('Sala de Catequesis A',   30),
  ('Sala de Catequesis B',   30),
  ('Sala de Reuniones',      20),
  ('Patio Central',         200),
  ('Capilla Lateral',        80);

-- Estados de reserva
-- id: 1=Pendiente, 2=Confirmada, 3=Rechazada (por Sacerdote/Admin), 4=Cancelada (por el solicitante)
INSERT INTO `estado_reserva` (`detalle`) VALUES
  ('Pendiente'),
  ('Confirmada'),
  ('Rechazada'),
  ('Cancelada');

-- Usuarios de prueba
-- Contraseña "admin123"    → $2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK
-- Contraseña "password123" → $2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O
INSERT INTO `persona` (`nombre`, `correo`, `password`, `rol_id`) VALUES
  -- Equipo de desarrollo (Admin, rol_id=5)
  ('Diego Calderon',  'diego@parroquia.com',   '$2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK', 5),
  ('Pedro Caso',      'pedro@parroquia.com',   '$2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK', 5),
  ('Javier Alvarado', 'javier@parroquia.com',  '$2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK', 5),
  ('Hugo Mendez',     'hugo@parroquia.com',    '$2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK', 5),
  ('Miguel Rosas',    'miguel@parroquia.com',  '$2a$10$BhWSxmSQb3uuNIg8QHkB2.46Z24c5hHHtO.94zgZnnegaz8smWqwK', 5),
  -- Usuarios de prueba por rol
  ('Padre Test',           'sacerdote@parroquia.com',   '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 1),
  ('Coord Ministros Test', 'coord.min@parroquia.com',   '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 2),
  ('Coord Grupos Test',    'coord.grupos@parroquia.com','$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3),
  ('Ministro Test',        'ministro@parroquia.com',    '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  -- Ministros adicionales (id=10,11,12) para probar HU-23 (cambio de turno) con más de un ministro disponible
  ('Ana Xitumul',      'ana.ministro@parroquia.com',    '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Carlos Ramirez',   'carlos.ministro@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Lucia Fernandez',  'lucia.ministro@parroquia.com',  '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4);

-- Relación coordinador-ministro (CoordMin id=7 coordina a los ministros id=9,10,11,12)
INSERT INTO `coordinador_ministro` (`coordinador_id`, `ministro_id`) VALUES
  (7, 9), (7, 10), (7, 11), (7, 12);

-- Tareas y asignaciones de prueba para HU-23 (cambio de turno entre ministros).
-- Tarea 1 (Ministro Test, id=9) es la que se usa para solicitar el cambio; Ana (id=10)
-- y Carlos (id=11) están libres a esa hora (destinatarios válidos); Lucía (id=12) tiene
-- otra tarea que se solapa con la tarea 1, para probar el rechazo por conflicto de horario.
INSERT INTO `tarea` (`fecha`, `hora_inicio`, `hora_fin`, `descripcion`) VALUES
  ('2026-09-13', '10:00:00', '10:15:00', 'Lectura primera - Misa dominical 10am'),
  ('2026-09-13', '10:15:00', '10:20:00', 'Salmo responsorial - Misa dominical 10am'),
  ('2026-09-13', '10:20:00', '11:00:00', 'Ministro de comunión - Misa dominical 10am'),
  ('2026-09-13', '10:00:00', '10:10:00', 'Coro - Misa dominical 10am'),
  ('2026-09-20', '12:00:00', '12:15:00', 'Lectura segunda - Misa dominical 12pm'),
  ('2026-09-20', '12:15:00', '13:00:00', 'Ministro de comunión - Misa dominical 12pm');

INSERT INTO `asignacion_tarea` (`tarea_id`, `persona_id`) VALUES
  (1, 9), (2, 10), (3, 11), (4, 12), (5, 10), (6, 11);

-- Notificaciones de prueba
-- persona IDs: 1-5=Admin equipo, 6=Sacerdote, 7=CoordMin, 8=CoordGrupos, 9=Ministro
-- notif 1 (id=1): leida=1 para todos  → todos tienen al menos una leída
-- notif 2 (id=2): leida=0 para todos  → todos tienen al menos una no-leída
-- notif 3 (id=3): leida=0 solo CoordMin → notificación individual extra
INSERT INTO `notificacion` (`mensaje`, `fecha`, `tipo`, `remitente_id`, `grupo_id`) VALUES
  ('Bienvenidos al nuevo sistema de gestión parroquial. ¡Ya pueden usarlo!', '2026-05-10', 'global',     1, NULL),
  ('Reunión de coordinadores este lunes 25 de mayo a las 9am en la Sala de Reuniones.', '2026-05-21', 'global',     6, NULL),
  ('Recordatorio: entregar lista de ministros asignados antes del viernes 23 de mayo.', '2026-05-20', 'individual', 1, NULL);

-- Asignación: todos reciben notif 1 (leída) y notif 2 (no-leída)
-- Datos para probar confirmación e inasistencia del ministro (persona id=9).
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`) VALUES
  ('2026-08-23', '09:00:00', '10:30:00', 1, 2, 6);

INSERT INTO `evento` (`titulo`, `encargado_id`, `reserva_id`, `descripcion`) VALUES
  ('Misa dominical de prueba', 6, 1, 'Celebración de prueba para validar la asistencia de ministros.');

-- Notificación 4 individual — Ministro (id=9); requiere confirmación de asistencia
-- al evento recién creado (id=1). Debe ir después del INSERT de `evento` porque
-- referencia evento_id.
INSERT INTO `notificacion` (`mensaje`, `fecha`, `tipo`, `remitente_id`, `grupo_id`, `evento_id`, `requiere_confirmacion`) VALUES
  ('Confirma tu asistencia a la Misa dominical de prueba del 23 de agosto.', '2026-08-18', 'individual', 6, NULL, 1, 1);

INSERT INTO `persona_notificacion` (`persona_id`, `notificacion_id`, `leida`) VALUES
  -- Notificación 1 global — leida=1 para los 12 usuarios
  (1, 1, 1), (2, 1, 1), (3, 1, 1), (4, 1, 1), (5, 1, 1),
  (6, 1, 1), (7, 1, 1), (8, 1, 1), (9, 1, 1),
  (10, 1, 1), (11, 1, 1), (12, 1, 1),
  -- Notificación 2 global — leida=0 para los 12 usuarios
  (1, 2, 0), (2, 2, 0), (3, 2, 0), (4, 2, 0), (5, 2, 0),
  (6, 2, 0), (7, 2, 0), (8, 2, 0), (9, 2, 0),
  (10, 2, 0), (11, 2, 0), (12, 2, 0),
  -- Notificación 3 individual → solo CoordMin (id=7)
  (7, 3, 0),
  -- Notificación 4 individual — Ministro; requiere confirmación
  (9, 4, 0);
