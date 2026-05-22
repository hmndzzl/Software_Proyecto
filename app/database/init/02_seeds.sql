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
INSERT INTO `estado_reserva` (`detalle`) VALUES
  ('Pendiente'),
  ('Confirmada'),
  ('Rechazada');

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
  ('Ministro Test',        'ministro@parroquia.com',    '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4);

-- Notificaciones de prueba
-- persona IDs: 1-5=Admin equipo, 6=Sacerdote, 7=CoordMin, 8=CoordGrupos, 9=Ministro
INSERT INTO `notificacion` (`mensaje`, `fecha`, `tipo`, `remitente_id`, `grupo_id`) VALUES
  ('Reunión parroquial el próximo domingo a las 10am. Asistencia obligatoria.', '2026-05-18', 'global',     6, NULL),
  ('Por favor confirmar la lista de ministros asignados para la misa del viernes.', '2026-05-20', 'individual', 1, NULL),
  ('Recordatorio: ensayo del coro este viernes a las 7pm en el Salón Parroquial.', '2026-05-21', 'global',     6, NULL);

-- Asignación de notificaciones a personas (notificacion_id 1, 2, 3)
INSERT INTO `persona_notificacion` (`persona_id`, `notificacion_id`, `leida`) VALUES
  -- Notificación 1 global → equipo dev + roles de prueba
  (1, 1, 1),  -- Diego (leída)
  (2, 1, 0),
  (3, 1, 0),
  (7, 1, 0),  -- CoordMin
  (8, 1, 0),  -- CoordGrupos
  (9, 1, 1),  -- Ministro (leída)
  -- Notificación 2 individual → solo CoordMin
  (7, 2, 0),
  -- Notificación 3 global → todos los roles de prueba
  (6, 3, 0),
  (7, 3, 0),
  (8, 3, 0),
  (9, 3, 0);