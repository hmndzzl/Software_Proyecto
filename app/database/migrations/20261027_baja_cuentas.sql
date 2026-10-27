-- Ejecutar después de 20261025_historial_decisiones.sql. Repetible, sin borrar personas ni relaciones.
ALTER TABLE persona MODIFY COLUMN estado_cuenta ENUM('pendiente','activa','rechazada','baja') NOT NULL DEFAULT 'activa';
ALTER TABLE cuenta_decision MODIFY COLUMN resultado ENUM('aprobada','rechazada','baja') NOT NULL;
