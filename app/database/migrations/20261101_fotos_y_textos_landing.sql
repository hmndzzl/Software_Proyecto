-- Textos editados desde el panel y fotos de la landing (HU-32).
-- Las fotos viven en backend/media/landing y se incluyen en el despliegue; aquí solo se enlazan.
-- Requiere las migraciones anteriores de la landing (8 valores, 4 tarjetas de devoción y 6 fechas).
UPDATE contenido_landing
SET contenido = JSON_SET(contenido,
  '$.cantidad_grupos', 36,
  '$.cantidad_espacios', 10,
  '$.quienes_somos.comunidad', 'La parroquia cuenta con treinta y seis grupos, comunidades y pastorales.',
  '$.imagenes', JSON_EXTRACT('{"o":{"historia_1":"/uploads/landing/historia-1-v1.webp","historia_2":"/uploads/landing/historia-2-v1.webp","historia_3":"/uploads/landing/historia-3-v1.webp"}}', '$.o'),
  '$.valores[6].imagen', '/uploads/landing/valor-redencion-v1.webp',
  '$.valores[7].imagen', '/uploads/landing/valor-mision-v1.webp',
  '$.devocion.tarjetas[0].imagen', '/uploads/landing/devocion-conocer-e-imitar-a-maria-v1.webp',
  '$.devocion.tarjetas[1].imagen', '/uploads/landing/devocion-como-honramos-a-la-madre-de-dios-v1.webp',
  '$.devocion.tarjetas[2].imagen', '/uploads/landing/devocion-honramos-a-nuestro-padre-v1.webp',
  '$.devocion.tarjetas[3].imagen', '/uploads/landing/devocion-los-santos-de-la-orden-v1.webp',
  '$.fechas.tarjetas[0].imagen', '/uploads/landing/fecha-san-raimundo-de-penafort-v1.webp',
  '$.fechas.tarjetas[1].imagen', '/uploads/landing/fecha-san-pedro-nolasco-v1.webp',
  '$.fechas.tarjetas[2].imagen', '/uploads/landing/fecha-aparicion-de-la-virgen-de-la-merced-v1.webp',
  '$.fechas.tarjetas[3].imagen', '/uploads/landing/fecha-fundacion-de-la-orden-v1.webp',
  '$.fechas.tarjetas[4].imagen', '/uploads/landing/fecha-san-ramon-nonato-v1.webp',
  '$.fechas.tarjetas[5].imagen', '/uploads/landing/fecha-nuestra-senora-de-la-merced-v1.webp')
WHERE id = 1
  AND JSON_LENGTH(contenido, '$.valores') >= 8
  AND JSON_LENGTH(contenido, '$.devocion.tarjetas') >= 4
  AND JSON_LENGTH(contenido, '$.fechas.tarjetas') >= 6;
