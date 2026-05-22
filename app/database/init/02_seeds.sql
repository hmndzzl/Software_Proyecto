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
-- notif 1 (id=1): leida=1 para todos  → todos tienen al menos una leída
-- notif 2 (id=2): leida=0 para todos  → todos tienen al menos una no-leída
-- notif 3 (id=3): leida=0 solo CoordMin → notificación individual extra
INSERT INTO `notificacion` (`mensaje`, `fecha`, `tipo`, `remitente_id`, `grupo_id`) VALUES
  ('Bienvenidos al nuevo sistema de gestión parroquial. ¡Ya pueden usarlo!', '2026-05-10', 'global',     1, NULL),
  ('Reunión de coordinadores este lunes 25 de mayo a las 9am en la Sala de Reuniones.', '2026-05-21', 'global',     6, NULL),
  ('Recordatorio: entregar lista de ministros asignados antes del viernes 23 de mayo.', '2026-05-20', 'individual', 1, NULL);

-- Asignación: todos reciben notif 1 (leída) y notif 2 (no-leída)
INSERT INTO `persona_notificacion` (`persona_id`, `notificacion_id`, `leida`) VALUES
  -- Notificación 1 global — leida=1 para los 9 usuarios
  (1, 1, 1), (2, 1, 1), (3, 1, 1), (4, 1, 1), (5, 1, 1),
  (6, 1, 1), (7, 1, 1), (8, 1, 1), (9, 1, 1),
  -- Notificación 2 global — leida=0 para los 9 usuarios
  (1, 2, 0), (2, 2, 0), (3, 2, 0), (4, 2, 0), (5, 2, 0),
  (6, 2, 0), (7, 2, 0), (8, 2, 0), (9, 2, 0),
  -- Notificación 3 individual → solo CoordMin (id=7)
  (7, 3, 0);