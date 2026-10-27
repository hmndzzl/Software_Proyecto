-- Aplicar una vez a bases existentes antes de activar las imágenes en producción.
-- La asignación provisional sigue el orden de los siete espacios en 02_seeds.sql.
ALTER TABLE espacio ADD COLUMN IF NOT EXISTS foto_url varchar(255) DEFAULT NULL;

UPDATE espacio SET foto_url = '/uploads/espacios/salon-01-v1.webp' WHERE nombre = 'Templo Principal' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-02-v1.webp' WHERE nombre = 'Salón Parroquial' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-03-v1.webp' WHERE nombre = 'Sala de Catequesis A' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-04-v1.webp' WHERE nombre = 'Sala de Catequesis B' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-05-v1.webp' WHERE nombre = 'Sala de Reuniones' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-06-v1.webp' WHERE nombre = 'Patio Central' AND foto_url IS NULL;
UPDATE espacio SET foto_url = '/uploads/espacios/salon-07-v1.webp' WHERE nombre = 'Capilla Lateral' AND foto_url IS NULL;
