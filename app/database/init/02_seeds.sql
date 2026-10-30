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

-- Grupo parroquial (coordinador de grupos, id=8) — un solo coordinador.
INSERT INTO `grupo` (`nombre`) VALUES
  ('Coro Parroquial');

INSERT INTO `grupo_coordinador` (`grupo_id`, `coordinador_id`) VALUES
  (1, 8);

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
  ('Yesenia Mux', 'yesenia.mux@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  -- Ocho coordinadores de grupos más (ids 48-55): un coordinador solo puede estar a
  -- cargo de un grupo a la vez, así que los grupos con 2-3 coordinadores necesitan
  -- personas propias en vez de reutilizar las de arriba.
  ('Cristina Ical', 'cristina.ical@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Edgar Sop', 'edgar.sop@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Lesbia Tzoc', 'lesbia.tzoc@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Herbert Siquin', 'herbert.siquin@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Dora Ajanel', 'dora.ajanel@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Selvin Boc', 'selvin.boc@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Brenda Chen', 'brenda.chen@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa'),
  ('Mario Tally', 'mario.tally@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 3, 'activa');

-- Grupos pastorales adicionales (ids 2-14, el grupo_coordinador va abajo). Mezcla
-- deliberada de casos reales: grupos con 1 solo coordinador, con 2 y con 3 — cada
-- coordinador aparece exactamente una vez en total, porque solo puede estar a cargo
-- de un grupo a la vez (uq_grupo_coord_coordinador).
INSERT INTO `grupo` (`nombre`) VALUES
  ('Catequesis de Primera Comunión'),  -- id 2
  ('Pastoral Juvenil'),                -- id 3
  ('Legión de María'),                 -- id 4
  ('Grupo de Oración Renovación'),     -- id 5
  ('Pastoral Familiar'),               -- id 6
  ('Monaguillos'),                     -- id 7
  ('Coro de Jóvenes'),                 -- id 8
  ('Catequesis de Confirmación'),      -- id 9
  ('Pastoral de Salud'),               -- id 10
  ('Grupo de Lectores'),               -- id 11
  ('Ministros Extraordinarios de la Eucaristía'), -- id 12
  ('Pastoral Social'),                 -- id 13
  ('Comité de Liturgia');              -- id 14

INSERT INTO `grupo_coordinador` (`grupo_id`, `coordinador_id`) VALUES
  (2, 30),                   -- Catequesis de Primera Comunión: 1 coordinador
  (3, 31), (3, 48),          -- Pastoral Juvenil: 2 coordinadores
  (4, 32),                   -- Legión de María: 1 coordinador
  (5, 38), (5, 49), (5, 50), -- Grupo de Oración Renovación: 3 coordinadores
  (6, 39),                   -- Pastoral Familiar: 1 coordinador
  (7, 40), (7, 51),          -- Monaguillos: 2 coordinadores
  (8, 41),                   -- Coro de Jóvenes: 1 coordinador
  (9, 42), (9, 52), (9, 53), -- Catequesis de Confirmación: 3 coordinadores
  (10, 43),                  -- Pastoral de Salud: 1 coordinador
  (11, 44), (11, 54),        -- Grupo de Lectores: 2 coordinadores
  (12, 45),                  -- Ministros Extraordinarios de la Eucaristía: 1 coordinador
  (13, 46), (13, 55),        -- Pastoral Social: 2 coordinadores
  (14, 47);                  -- Comité de Liturgia: 1 coordinador

-- Reservas adicionales en los 4 estados, ventana de ~90 días. Las últimas 2 son
-- deliberadas para poder demostrar el rechazo por aforo (P3/DEV-267) en vivo: quedan
-- Pendientes con cantidad_personas mayor a la capacidad del espacio elegido.
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`, `cantidad_personas`) VALUES
  ('2026-09-20', '08:00:00', '11:00:00', 2, 1, 6, 14),
  ('2026-09-22', '08:00:00', '10:00:00', 1, 2, 6, 264),
  ('2026-09-25', '08:00:00', '09:00:00', 1, 2, 32, 219),
  ('2026-09-26', '08:00:00', '09:00:00', 2, 3, 2, 59),
  ('2026-09-27', '08:00:00', '09:00:00', 7, 4, 13, 45),
  ('2026-09-28', '08:00:00', '09:00:00', 5, 1, 32, 5),
  ('2026-10-01', '08:00:00', '10:00:00', 1, 2, 30, 219),
  ('2026-10-02', '08:00:00', '09:00:00', 5, 2, 30, 13),
  ('2026-10-03', '08:00:00', '09:00:00', 2, 3, 13, 52),
  ('2026-10-06', '08:00:00', '09:00:00', 5, 4, 6, 14),
  ('2026-10-07', '08:00:00', '11:00:00', 4, 1, 31, 19),
  ('2026-10-08', '08:00:00', '10:00:00', 4, 2, 30, 12),
  ('2026-10-11', '08:00:00', '10:00:00', 6, 2, 7, 81),
  ('2026-10-12', '08:00:00', '10:00:00', 4, 3, 1, 14),
  ('2026-10-15', '08:00:00', '09:00:00', 1, 4, 2, 219),
  ('2026-10-18', '08:00:00', '10:00:00', 7, 1, 8, 36),
  ('2026-10-19', '08:00:00', '09:00:00', 1, 2, 2, 298),
  ('2026-10-21', '08:00:00', '10:00:00', 3, 2, 1, 19),
  ('2026-10-23', '08:00:00', '09:00:00', 7, 3, 30, 35),
  ('2026-10-24', '08:00:00', '09:00:00', 6, 4, 6, 84),
  ('2026-10-27', '08:00:00', '11:00:00', 5, 1, 30, 11),
  ('2026-10-30', '08:00:00', '09:00:00', 3, 2, 1, 16),
  -- DEMO aforo (P3/DEV-267): 60 personas en Sala de Catequesis A (capacidad 30).
  ('2026-12-12', '10:00:00', '12:00:00', 3, 1, 7, 60),
  -- DEMO aforo (P3/DEV-267): 50 personas en Sala de Reuniones (capacidad 20).
  ('2026-12-13', '15:00:00', '17:00:00', 5, 1, 8, 50);
-- Reservas de los nuevos eventos (misas, retiros, jornadas) — cada una Confirmada,
-- sin solaparse entre sí en el mismo espacio/fecha, para poder vincular tareas reales.
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`, `cantidad_personas`) VALUES
  ('2026-09-23', '07:00:00', '09:00:00', 6, 2, 13, 75),
  ('2026-09-26', '07:00:00', '09:00:00', 1, 2, 31, 105),
  ('2026-09-28', '07:00:00', '08:00:00', 1, 2, 6, 285),
  ('2026-10-01', '11:00:00', '13:00:00', 1, 2, 13, 90),
  ('2026-10-05', '07:00:00', '08:00:00', 6, 2, 6, 14),
  ('2026-10-07', '07:00:00', '08:00:00', 6, 2, 32, 69),
  ('2026-10-09', '07:00:00', '08:00:00', 6, 2, 30, 39),
  ('2026-10-12', '07:00:00', '08:00:00', 2, 2, 31, 20),
  ('2026-10-15', '07:00:00', '09:00:00', 1, 2, 30, 52),
  ('2026-10-19', '07:00:00', '08:00:00', 1, 2, 30, 157),
  ('2026-10-22', '07:00:00', '08:00:00', 6, 2, 13, 23),
  ('2026-10-24', '07:00:00', '08:00:00', 1, 2, 32, 10),
  ('2026-10-27', '07:00:00', '09:00:00', 1, 2, 13, 213),
  ('2026-10-29', '07:00:00', '08:00:00', 6, 2, 32, 96),
  ('2026-10-31', '07:00:00', '09:00:00', 1, 2, 8, 17),
  ('2026-11-03', '07:00:00', '08:00:00', 1, 2, 31, 61),
  ('2026-11-05', '07:00:00', '09:00:00', 2, 2, 7, 81),
  ('2026-11-07', '07:00:00', '08:00:00', 6, 2, 31, 108);
-- Eventos adicionales (misas, retiros, jornadas) con su reserva recién creada arriba.
-- Un tercio queda publico=1 para que la agenda pública tenga contenido real.
INSERT INTO `evento` (`titulo`, `encargado_id`, `reserva_id`, `descripcion`, `publico`) VALUES
  ('Misa dominical de las 8am', 3, 32, 'Celebración parroquial: misa dominical de las 8am.', 1),
  ('Misa dominical del mediodía', 7, 33, 'Celebración parroquial: misa dominical del mediodía.', 0),
  ('Misa de acción de gracias', 5, 34, 'Celebración parroquial: misa de acción de gracias.', 0),
  ('Novena a la Virgen de la Merced', 3, 35, 'Celebración parroquial: novena a la virgen de la merced.', 1),
  ('Vigilia de oración', 13, 36, 'Celebración parroquial: vigilia de oración.', 0),
  ('Misa de sanación', 31, 37, 'Celebración parroquial: misa de sanación.', 0),
  ('Celebración de la Palabra', 4, 38, 'Celebración parroquial: celebración de la palabra.', 1),
  ('Misa de difuntos', 1, 39, 'Celebración parroquial: misa de difuntos.', 0),
  ('Misa de Primera Comunión', 5, 40, 'Celebración parroquial: misa de primera comunión.', 1),
  ('Confirmaciones del sector sur', 6, 41, 'Celebración parroquial: confirmaciones del sector sur.', 1),
  ('Retiro de Adviento', 30, 42, 'Celebración parroquial: retiro de adviento.', 0),
  ('Jornada de catequistas', 13, 43, 'Celebración parroquial: jornada de catequistas.', 0),
  ('Encuentro de pastoral juvenil', 32, 44, 'Celebración parroquial: encuentro de pastoral juvenil.', 1),
  ('Misa de quinceañeros', 30, 45, 'Celebración parroquial: misa de quinceañeros.', 0),
  ('Procesión mariana', 32, 46, 'Celebración parroquial: procesión mariana.', 0),
  ('Misa de bautizos comunitaria', 6, 47, 'Celebración parroquial: misa de bautizos comunitaria.', 0),
  ('Convivencia de ministros', 13, 48, 'Celebración parroquial: convivencia de ministros.', 0),
  ('Taller de liturgia', 8, 49, 'Celebración parroquial: taller de liturgia.', 0);

-- Tareas de los 18 eventos nuevos (ids 16-51): 2 por evento (Lectura + Ministro de
-- comunión), dentro del horario de la reserva de su evento. Cada evento cae en una
-- fecha distinta de todas las demás tareas del seed, así que repetir ministro entre
-- eventos nunca produce un solape real de horario para esa persona.
INSERT INTO `tarea` (`fecha`, `hora_inicio`, `hora_fin`, `titulo`, `descripcion`) VALUES
  ('2026-09-23', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-09-23', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-09-26', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-09-26', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-09-28', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-09-28', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-01', '11:00:00', '11:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-01', '11:15:00', '11:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-05', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-05', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-07', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-07', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-09', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-09', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-12', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-12', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-15', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-15', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-19', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-19', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-22', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-22', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-24', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-24', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-27', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-27', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-29', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-29', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-10-31', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-10-31', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-11-03', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-11-03', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-11-05', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-11-05', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.'),
  ('2026-11-07', '07:00:00', '07:15:00', 'Lectura',               'Proclamar la lectura en la misa.'),
  ('2026-11-07', '07:15:00', '07:45:00', 'Ministro de comunión',  'Distribuir la comunión durante la misa.');

-- Asignaciones: 2 ministros distintos por evento, rotando por los 20 ministros
-- disponibles (9,10,11,12,14-21,22-29). Nunca se repite un ministro en el mismo día.
INSERT INTO `asignacion_tarea` (`tarea_id`, `persona_id`) VALUES
  (16, 9),  (17, 10),
  (18, 11), (19, 12),
  (20, 14), (21, 15),
  (22, 16), (23, 17),
  (24, 18), (25, 19),
  (26, 20), (27, 21),
  (28, 22), (29, 23),
  (30, 24), (31, 25),
  (32, 26), (33, 27),
  (34, 28), (35, 29),
  (36, 9),  (37, 10),
  (38, 11), (39, 12),
  (40, 14), (41, 15),
  (42, 16), (43, 17),
  (44, 18), (45, 19),
  (46, 20), (47, 21),
  (48, 22), (49, 23),
  (50, 24), (51, 25);

-- Vincula cada par de tareas a su evento correspondiente.
UPDATE `tarea` SET `evento_id` = 8  WHERE `id` IN (16, 17);
UPDATE `tarea` SET `evento_id` = 9  WHERE `id` IN (18, 19);
UPDATE `tarea` SET `evento_id` = 10 WHERE `id` IN (20, 21);
UPDATE `tarea` SET `evento_id` = 11 WHERE `id` IN (22, 23);
UPDATE `tarea` SET `evento_id` = 12 WHERE `id` IN (24, 25);
UPDATE `tarea` SET `evento_id` = 13 WHERE `id` IN (26, 27);
UPDATE `tarea` SET `evento_id` = 14 WHERE `id` IN (28, 29);
UPDATE `tarea` SET `evento_id` = 15 WHERE `id` IN (30, 31);
UPDATE `tarea` SET `evento_id` = 16 WHERE `id` IN (32, 33);
UPDATE `tarea` SET `evento_id` = 17 WHERE `id` IN (34, 35);
UPDATE `tarea` SET `evento_id` = 18 WHERE `id` IN (36, 37);
UPDATE `tarea` SET `evento_id` = 19 WHERE `id` IN (38, 39);
UPDATE `tarea` SET `evento_id` = 20 WHERE `id` IN (40, 41);
UPDATE `tarea` SET `evento_id` = 21 WHERE `id` IN (42, 43);
UPDATE `tarea` SET `evento_id` = 22 WHERE `id` IN (44, 45);
UPDATE `tarea` SET `evento_id` = 23 WHERE `id` IN (46, 47);
UPDATE `tarea` SET `evento_id` = 24 WHERE `id` IN (48, 49);
UPDATE `tarea` SET `evento_id` = 25 WHERE `id` IN (50, 51);

-- Días con varias reservas simultáneas (distintos espacios, sin solaparse entre sí): hasta
-- ahora cada fecha del seed tenía como máximo 1 reserva, lo cual no refleja un fin de semana
-- real de la parroquia con varios grupos/salones ocupados el mismo día. Sábado 14-nov queda
-- con 3 reservas nuevas; domingo 15-nov ya tenía 1 (Capilla Lateral 09:00-09:30) y se le
-- agregan 2 más, para un total de 3 ese día también.
INSERT INTO `reserva` (`fecha`, `hora_inicio`, `hora_fin`, `espacio_id`, `estado_reserva_id`, `solicitante_id`, `cantidad_personas`) VALUES
  ('2026-11-14', '08:00:00', '09:00:00', 5, 2, 39, 15),  -- Sala de Reuniones, Confirmada, Pastoral Familiar
  ('2026-11-14', '09:00:00', '11:00:00', 2, 2, 7,  60),  -- Salón Parroquial, Confirmada, Coord Ministros
  ('2026-11-14', '15:00:00', '18:00:00', 6, 1, 31, 120), -- Patio Central, Pendiente, Pastoral Juvenil
  ('2026-11-15', '10:00:00', '11:00:00', 4, 1, 42, 25),  -- Sala de Catequesis B, Pendiente, Catequesis de Confirmación
  ('2026-11-15', '17:00:00', '19:00:00', 1, 2, 6,  300); -- Templo Principal, Confirmada, misa vespertina (Sacerdote)