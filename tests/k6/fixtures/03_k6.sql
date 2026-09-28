-- Solo se monta en tests/k6/docker-compose.yml (BD efímera).
-- 120 identidades distintas, todas con rol Coordinador de Ministros.
DELIMITER //
CREATE PROCEDURE seed_k6()
BEGIN
  DECLARE n INT DEFAULT 1;
  DECLARE person_id INT;
  DECLARE notification_id INT;
  INSERT INTO notificacion (mensaje, fecha, tipo, remitente_id)
    VALUES ('Notificación de rendimiento k6', CURRENT_DATE(), 'global', 6);
  SET notification_id = LAST_INSERT_ID();
  WHILE n <= 120 DO
    INSERT INTO persona (nombre, correo, password, rol_id)
      SELECT CONCAT('k6 Usuario ', n), CONCAT('k6.user.', n, '@example.test'), password, 2
      FROM persona WHERE correo = 'coord.min@parroquia.com';
    SET person_id = LAST_INSERT_ID();
    INSERT INTO persona_notificacion (persona_id, notificacion_id, leida)
      VALUES (person_id, notification_id, 0);
    IF n <= 15 THEN
      INSERT INTO espacio (nombre, capacidad) VALUES (CONCAT('k6-Salón-', LPAD(n, 2, '0')), 30);
    END IF;
    SET n = n + 1;
  END WHILE;
END//
DELIMITER ;
CALL seed_k6();
DROP PROCEDURE seed_k6;
