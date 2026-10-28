# Imágenes de la parroquia: fase 1

Esta entrega usa fotografías proporcionadas por la parroquia y autorizadas para su publicación. Los JPG originales del ZIP no se agregan al repositorio ni se sirven desde la aplicación. Las copias publicadas son WebP optimizados, sin metadatos EXIF. Las imágenes de la landing se incluyen en el build del frontend; las de salones se incluyen en la imagen del backend y se sirven desde `/uploads/espacios/`.

## Asignación provisional de salones

La parroquia aún no identificó qué foto corresponde a cada espacio. Por indicación del responsable del proyecto, se asignaron `Salon 1.jpg` a `Salon 7.jpg` siguiendo exactamente el orden de los siete espacios en `app/database/init/02_seeds.sql`. Esta relación **no confirma** que la foto retrate el espacio cuyo nombre aparece en la base de datos. Debe validarse con la parroquia antes de la entrega final.

| Espacio | JPG recibido | Archivo publicado |
| --- | --- | --- |
| Templo Principal | `Salon 1.jpg` | `salon-01-v1.webp` |
| Salón Parroquial | `Salon 2.jpg` | `salon-02-v1.webp` |
| Sala de Catequesis A | `Salon 3.jpg` | `salon-03-v1.webp` |
| Sala de Catequesis B | `Salon 4.jpg` | `salon-04-v1.webp` |
| Sala de Reuniones | `Salon 5.jpg` | `salon-05-v1.webp` |
| Patio Central | `Salon 6.jpg` | `salon-06-v1.webp` |
| Capilla Lateral | `Salon 7.jpg` | `salon-07-v1.webp` |

Las fotografías de espacios ahora también se pueden cargar o reemplazar desde la interfaz por Admin/Sacerdote; ver [gestión de espacios](gestion-espacios.md). Las nuevas cargas se publican en `/uploads/espacios/subidas/` y se conservan en un volumen Docker. Las fotos originales de esta fase siguen incluidas en la imagen del backend.

Para actualizar manualmente un recurso incluido en el despliegue, generar otro archivo con nombre versionado (`-v2.webp`), actualizar `foto_url` del espacio afectado y desplegar frontend/backend según corresponda. No sobrescribir un archivo `-v1.webp`: se entrega con caché `immutable` durante 30 días.

## Fotografías de la landing

| Uso | JPG recibido | WebP publicado |
| --- | --- | --- |
| Portada | `Parroquia--29.jpg` | `fachada-v1.webp` |
| Comunidad | `IMG_0921.jpg` | `comunidad-v1.webp` |
| Celebración | `IMG_0573.jpg` | `celebracion-v1.webp` |
| Servicio | `IMG_0169.jpg` | `servicio-v1.webp` |
| Valor Fe viva | `IMG_0016.jpg` | `fe-viva-v1.webp` |
| Valor Servicio | `IMG_0174.jpg` | `voluntarios-v1.webp` |
| Valor Comunidad | `IMG_0873.jpg` | `encuentro-v1.webp` |
| Valor Formación | `IMG_0885.jpg` | `grupo-v1.webp` |
| Valor Caridad | `Parroquia--8.jpg` | `familia-v1.webp` |
| Valor Tradición | `IMG_0795.jpg` | `tradicion-v1.webp` |
| Entrada | `Parroquia--28.jpg` | `entrada-v1.webp` |

Las fotos de los valores se asignan por posición (hasta seis), ya que el contenido público permite editar los títulos. Sus textos alternativos describen lo visible en cada fotografía.

## Base de datos existente

La inicialización de una base nueva ya incluye `foto_url` y los siete enlaces. Para una base existente, aplicar **una vez, antes de desplegar el backend nuevo** `app/database/migrations/20261025_espacio_fotos.sql`, después de tomar un respaldo habitual de la base. La migración agrega una columna nullable y solo asigna enlaces a salones con `foto_url IS NULL`; se puede repetir sin cambiar fotos configuradas posteriormente.

Desde el directorio `app` del servidor, con el stack de producción en funcionamiento:

```sh
docker compose -f docker-compose.prod.yml exec -T mariadb \
  sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE"' \
  < database/migrations/20261025_espacio_fotos.sql
```

Verificar `SELECT nombre, foto_url FROM espacio ORDER BY id;` y después desplegar la versión nueva. La migración añade datos y una columna; el backend anterior sigue funcionando si es necesario volver al commit previo. El despliegue automatizado actual no ejecuta migraciones.

## Comprobación después del despliegue

1. Abrir la landing en escritorio y móvil; verificar que carguen portada, sección de comunidad, valores y entrada.
2. Con una cuenta autorizada, abrir el listado y detalle de espacios; verificar las siete fotos y que ninguna URL devuelva 404.
3. Solicitar `/uploads/espacios/salon-01-v1.webp`: debe responder `200`, `Content-Type: image/webp` y una cabecera de caché. Un archivo `.jpg` en esa ruta debe responder `404`.

La ausencia de `foto_url`, una URL inválida o un error de carga muestra el marcador de respaldo en la interfaz.

En desarrollo con Docker Compose, Vite envía `/uploads/espacios/` a `http://backend:3001` dentro de la red de contenedores. Si se ejecuta Vite directamente en el equipo, el valor predeterminado es `http://localhost:3001`; se puede ajustar con `DEV_BACKEND_TARGET`. `VITE_API_URL` es la dirección que usa el navegador y no debe reutilizarse como destino interno del proxy.
