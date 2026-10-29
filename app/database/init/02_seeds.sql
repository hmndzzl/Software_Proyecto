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
INSERT INTO `espacio` (`nombre`, `capacidad`, `foto_url`) VALUES
  ('Templo Principal',      500, '/uploads/espacios/salon-01-v1.webp'),
  ('Salón Parroquial',      150, '/uploads/espacios/salon-02-v1.webp'),
  ('Sala de Catequesis A',   30, '/uploads/espacios/salon-03-v1.webp'),
  ('Sala de Catequesis B',   30, '/uploads/espacios/salon-04-v1.webp'),
  ('Sala de Reuniones',      20, '/uploads/espacios/salon-05-v1.webp'),
  ('Patio Central',         200, '/uploads/espacios/salon-06-v1.webp'),
  ('Capilla Lateral',        80, '/uploads/espacios/salon-07-v1.webp');

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
  ('Lucia Fernandez',  'lucia.ministro@parroquia.com',  '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  -- Segundo coordinador de ministros (id=13), con un grupo de ministros distinto al de CoordMin (id=7),
  -- para probar que cada coordinador solo puede editar/reasignar tareas de sus propios ministros.
  ('Coord Ministros Sur', 'coord.min2@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 2),
  -- Ocho ministros adicionales del primer coordinador (id=14–21).
  ('Marta López', 'marta.lopez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('José Morales', 'jose.morales@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Elena Pérez', 'elena.perez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Luis García', 'luis.garcia@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Rosa Méndez', 'rosa.mendez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Pedro Ramírez', 'pedro.ramirez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Isabel Gómez', 'isabel.gomez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Andrés Castro', 'andres.castro@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  -- Ocho ministros adicionales del coordinador sur (id=22–29).
  ('Carmen Hernández', 'carmen.hernandez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Miguel Flores', 'miguel.flores@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Teresa Vásquez', 'teresa.vasquez@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Jorge Reyes', 'jorge.reyes@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Patricia Cruz', 'patricia.cruz@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Manuel Choc', 'manuel.choc@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Sofía Caal', 'sofia.caal@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Gabriel Tzul', 'gabriel.tzul@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4);

-- Cada coordinador tiene 10 ministros activos, sin compartir ministros entre grupos.
-- CoordMin (id=7): originales 9,10 y adicionales 14–21.
-- CoordMin Sur (id=13): originales 11,12 y adicionales 22–29.
-- Los IDs 1–13 se conservan para los escenarios y pruebas existentes.
INSERT INTO `coordinador_ministro` (`coordinador_id`, `ministro_id`) VALUES
  (7, 9), (7, 10),
  (7, 14), (7, 15), (7, 16), (7, 17), (7, 18), (7, 19), (7, 20), (7, 21),
  (13, 11), (13, 12),
  (13, 22), (13, 23), (13, 24), (13, 25), (13, 26), (13, 27), (13, 28), (13, 29);

-- Tareas y asignaciones de prueba para HU-23 (cambio de turno entre ministros).
-- Tarea 1 (Ministro Test, id=9) es la que se usa para solicitar el cambio; Ana (id=10)
-- y Carlos (id=11) están libres a esa hora (destinatarios válidos); Lucía (id=12) tiene
-- otra tarea que se solapa con la tarea 1, para probar el rechazo por conflicto de horario.
INSERT INTO `tarea` (`fecha`, `hora_inicio`, `hora_fin`, `titulo`, `descripcion`) VALUES
  ('2026-09-13', '10:00:00', '10:15:00', 'Lectura primera',        'Proclamar la primera lectura en la Misa dominical de las 10am'),
  ('2026-09-13', '10:15:00', '10:20:00', 'Salmo responsorial',     'Cantar o proclamar el salmo responsorial en la Misa dominical de las 10am'),
  ('2026-09-13', '10:20:00', '11:00:00', 'Ministro de comunión',   'Distribuir la comunión durante la Misa dominical de las 10am'),
  ('2026-09-13', '10:00:00', '10:10:00', 'Coro',                   'Acompañar musicalmente la Misa dominical de las 10am'),
  ('2026-09-20', '12:00:00', '12:15:00', 'Lectura segunda',        'Proclamar la segunda lectura en la Misa dominical de las 12pm'),
  ('2026-09-20', '12:15:00', '13:00:00', 'Ministro de comunión',   'Distribuir la comunión durante la Misa dominical de las 12pm');

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

-- Los ejemplos históricos no tienen hora de envío conocida.
UPDATE notificacion SET enviado_en = NULL WHERE id IN (1, 2, 3, 4);

INSERT INTO `persona_notificacion` (`persona_id`, `notificacion_id`, `leida`) VALUES
  -- Notificación 1 global — leida=1 para los 13 usuarios
  (1, 1, 1), (2, 1, 1), (3, 1, 1), (4, 1, 1), (5, 1, 1),
  (6, 1, 1), (7, 1, 1), (8, 1, 1), (9, 1, 1),
  (10, 1, 1), (11, 1, 1), (12, 1, 1), (13, 1, 1),
  -- Notificación 2 global — leida=0 para los 13 usuarios
  (1, 2, 0), (2, 2, 0), (3, 2, 0), (4, 2, 0), (5, 2, 0),
  (6, 2, 0), (7, 2, 0), (8, 2, 0), (9, 2, 0),
  (10, 2, 0), (11, 2, 0), (12, 2, 0), (13, 2, 0),
  -- Notificación 3 individual → solo CoordMin (id=7)
  (7, 3, 0),
  -- Notificación 4 individual — Ministro; requiere confirmación
  (9, 4, 0);

-- ======================================================================
-- Datos de demostración (actividad futura) — poblar la app con movimiento
-- real en todos los rubros, reutilizando los 2 coordinadores y los 4 ministros
-- originales (CoordMin id=7 → 9,10; CoordMin Sur id=13 → 11,12).
-- ======================================================================

-- Grupo parroquial (coordinador de grupos, id=8)
INSERT INTO `grupo` (`nombre`, `coordinador_id`) VALUES
  ('Coro Parroquial', 8);

-- Tareas futuras repartidas entre los 4 ministros originales (tarea 15 queda sin asignar
-- a propósito, para ver el estado "sin asignar" en ListaAsignaciones/Calendario).
INSERT INTO `tarea` (`fecha`, `hora_inicio`, `hora_fin`, `titulo`, `descripcion`) VALUES
  ('2026-11-01', '10:00:00', '10:15:00', 'Lectura primera',      'Proclamar la primera lectura en la Misa dominical de las 10am'),
  ('2026-11-01', '10:15:00', '10:20:00', 'Salmo responsorial',   'Cantar o proclamar el salmo responsorial en la Misa dominical de las 10am'),
  ('2026-11-01', '10:20:00', '11:00:00', 'Ministro de comunión', 'Distribuir la comunión durante la Misa dominical de las 10am'),
  ('2026-11-01', '10:00:00', '10:10:00', 'Coro',                 'Acompañar musicalmente la Misa dominical de las 10am'),
  ('2026-11-08', '12:00:00', '12:15:00', 'Lectura segunda',      'Proclamar la segunda lectura en la Misa dominical de las 12pm'),
  ('2026-11-08', '12:15:00', '13:00:00', 'Ministro de comunión', 'Distribuir la comunión durante la Misa dominical de las 12pm'),
  ('2026-11-15', '09:00:00', '09:10:00', 'Coro',                 'Acompañar musicalmente la Misa dominical de las 9am'),
  ('2026-11-15', '09:10:00', '09:30:00', 'Ministro de comunión', 'Distribuir la comunión durante la Misa dominical de las 9am'),
  ('2026-11-22', '10:00:00', '10:10:00', 'Acólito',              'Asistir al sacerdote durante la Misa dominical de las 10am');

INSERT INTO `asignacion_tarea` (`tarea_id`, `persona_id`) VALUES
  (7, 9), (8, 10), (9, 11), (10, 12), (11, 9), (12, 10), (13, 11), (14, 12);

-- Cambio de turno pendiente de respuesta (HU-23): Ministro Test (9) pide
-- cambiar la tarea 11 con Ana (10) — ambos bajo el mismo coordinador (7).
INSERT INTO `cambio_turno` (`tarea_id`, `solicitante_id`, `destinatario_id`, `estado`, `fecha_solicitud`) VALUES
  (11, 9, 10, 'pendiente', '2026-10-24');

-- Reservas en los 4 estados posibles, con distintos solicitantes y espacios.
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`) VALUES
  ('2026-10-30', '14:00:00', '16:00:00', 2, 1, 8),  -- Pendiente, Coord Grupos
  ('2026-11-05', '18:00:00', '20:00:00', 6, 2, 7),  -- Confirmada, Coord Ministros
  ('2026-11-12', '09:00:00', '10:00:00', 5, 3, 13), -- Rechazada, Coord Ministros Sur
  ('2026-10-26', '16:00:00', '18:00:00', 3, 4, 6);  -- Cancelada por el propio solicitante (Sacerdote). Ministro NO
                                                     -- puede solicitar reservas (reserva.routes.ts solo permite
                                                     -- Coordinador de Ministros/Grupos + jerarquía Sacerdote/Admin).

INSERT INTO `evento` (`titulo`, `encargado_id`, `reserva_id`, `descripcion`, `publico`) VALUES
  ('Asamblea de catequistas',        8,  2, 'Planificación del trimestre de catequesis.',                         0),
  ('Procesión y vigilia',            7,  3, 'Convivencia de ministros de la liturgia en el patio central.',       0),
  ('Taller de formación bíblica',    13, 4, 'Solicitud de formación para los ministros del sector sur.',          0),
  ('Ensayo de coro',                 6,  5, 'Ensayo cancelado por el propio solicitante.',                       0);

-- Notificaciones adicionales (individuales y una global), con sus persona_notificacion.
INSERT INTO `notificacion` (`mensaje`, `fecha`, `tipo`, `remitente_id`, `grupo_id`) VALUES
  ('Se te asignó un nuevo servicio: Lectura segunda el 2026-11-08.', '2026-10-24', 'individual', 7, NULL),
  ('Carlos, tienes Ministro de comunión asignado el 15 de noviembre.', '2026-10-24', 'individual', 13, NULL),
  ('Recordatorio: reunión general de coordinadores el 2 de noviembre a las 7pm.', '2026-10-25', 'global', 6, NULL),
  ('Lucía Fernandez notificó un periodo de ausencia del 10 al 14 de noviembre: Viaje familiar.', '2026-10-24', 'individual', 12, NULL);

INSERT INTO `persona_notificacion` (`persona_id`, `notificacion_id`, `leida`) VALUES
  (9, 5, 0),
  (11, 6, 0),
  (1, 7, 0), (2, 7, 0), (3, 7, 0), (4, 7, 0), (5, 7, 0),
  (6, 7, 0), (7, 7, 0), (8, 7, 0), (9, 7, 0),
  (10, 7, 0), (11, 7, 0), (12, 7, 0), (13, 7, 0),
  (6, 8, 0), (7, 8, 0), (13, 8, 0);

-- Periodo de ausencia (HU-31) de Lucía, enlazado a la notificación 8.
INSERT INTO `periodo_ausencia` (`ministro_id`, `titulo`, `justificacion`, `fecha_inicio`, `fecha_fin`, `notificacion_id`) VALUES
  (12, 'Viaje familiar', 'Estaré fuera de la ciudad por un compromiso familiar.', '2026-11-10', '2026-11-14', 8);

-- Mensaje de contacto público (HU-32), sin notificación asociada.
INSERT INTO `mensaje_contacto` (`nombre`, `correo`, `telefono`, `motivo`, `mensaje`, `fecha`) VALUES
  ('Rosa Martinez', 'rosa.martinez@example.com', '55512345', 'Información general', 'Quisiera saber el horario de la misa de los sábados.', '2026-10-20');

-- Eventos con tareas vinculadas (evento_id) — para probar en el calendario la lista
-- de "Tareas asociadas a este evento" (clickeable) dentro del detalle del evento.
-- Reutilizan tareas y asignaciones ya existentes, cada una dentro del horario de
-- su reserva: la Misa de las 12pm (tareas 11,12 → Ministro Test/Ana, coordinador 7)
-- y la Misa de las 9am del sector sur (tareas 13,14 → Carlos/Lucía, coordinador 13).
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`) VALUES
  ('2026-11-08', '12:00:00', '13:00:00', 1, 2, 6),
  ('2026-11-15', '09:00:00', '09:30:00', 7, 2, 13);

INSERT INTO `evento` (`titulo`, `encargado_id`, `reserva_id`, `descripcion`, `publico`) VALUES
  ('Misa dominical de las 12pm', 6,  6, 'Misa dominical de mediodía con lectura, comunión y participación del equipo litúrgico.', 0),
  ('Misa dominical de las 9am',  13, 7, 'Misa dominical con el equipo litúrgico del sector sur.',                                 0);

UPDATE `tarea` SET `evento_id` = 6 WHERE `id` IN (11, 12);
UPDATE `tarea` SET `evento_id` = 7 WHERE `id` IN (13, 14);

-- ============================================================
-- Seed ampliada (post-Sprint 8): más personas, grupos, reservas,
-- eventos, tareas, cambios de turno, notificaciones y contacto.
-- ============================================================

-- Personas adicionales: más coordinadores de grupos y variedad de estado_cuenta,
-- para poblar /cuentas con pendientes/rechazadas reales y demostrar D9 con historial.
INSERT INTO `persona` (`nombre`, `correo`, `password`, `rol_id`, `estado_cuenta`) VALUES
  ('Marisol Ixcot', 'marisol.ixcot@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Fernando Us', 'fernando.us@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Diana Pop', 'diana.pop@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Walter Sic', 'walter.sic@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4, 'pendiente'),
  ('Noemi Batz', 'noemi.batz@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4, 'pendiente'),
  ('Byron Coy', 'byron.coy@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4, 'rechazada'),
  ('Claudia Ajpop', 'claudia.ajpop@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4, 'rechazada'),
  ('Oscar Quej', 'oscar.quej@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4, 'baja'),
  ('Esteban Chuc', 'esteban.chuc@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Rosario Tum', 'rosario.tum@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Manuel Xicara', 'manuel.xicara@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Flor Canil', 'flor.canil@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Victor Quiej', 'victor.quiej@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Patricia Sactic', 'patricia.sactic@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Rodrigo Chach', 'rodrigo.chach@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Gloria Tiul', 'gloria.tiul@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Alberto Pec', 'alberto.pec@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Yesenia Mux', 'yesenia.mux@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa');
