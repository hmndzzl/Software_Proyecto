-- Corrige el correo de contacto sin reemplazar las demás ediciones de la landing.
-- Puede repetirse; solo sustituye la dirección anterior conocida.
UPDATE contenido_landing
SET contenido = JSON_SET(contenido,
  '$.contacto.correo', 'parroquiasanpedronolascocsc@gmail.com')
WHERE id = 1
  AND JSON_UNQUOTE(JSON_EXTRACT(contenido, '$.contacto.correo')) = 'contacto@sanpedronolasco.gt';
