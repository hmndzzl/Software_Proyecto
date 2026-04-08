-- 02_seeds.sql

-- Roles del sistema
INSERT INTO `rol` (`detalle`) VALUES
  ('Sacerdote'),
  ('Coordinador de Ministros'),
  ('Coordinador de Grupos'),
  ('Ministro');

-- Estados de reserva
INSERT INTO `estado_reserva` (`detalle`) VALUES
  ('Pendiente'),
  ('Confirmada'),
  ('Rechazada');

-- Usuarios de prueba (contraseñas: password123 y admin123 aprox)
INSERT INTO `persona` (`nombre`, `correo`, `password`, `rol_id`) VALUES
  ('Administrador Prueba', 'admin@parroquia.com', '$2a$10$lRbAN6.ib/1XfAC/VwPoOu.dvBM8p0zVkvQnAbVScTSrI5JTajDj2', 1),
  ('Usuario Test', 'test@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 1),
  ('Diego Calderon', 'diego@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Pedro Caso', 'pedro@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Javier Alvarado', 'javier@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Hugo Mendez', 'hugo@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4),
  ('Miguel Rosas', 'miguel@parroquia.com', '$2a$10$Uq5LAV/Bl79iQixHeoaghec4JrejHqONT14BcKZOcejp9IHNrRW0O', 4);