-- 02_seeds.sql

-- Roles del sistema
-- rol_id: 1=Sacerdote, 2=Coordinador de Ministros, 3=Coordinador de Grupos, 4=Ministro, 5=Admin
INSERT INTO `rol` (`detalle`) VALUES
  ('Sacerdote'),
  ('Coordinador de Ministros'),
  ('Coordinador de Grupos'),
  ('Ministro'),
  ('Admin');

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