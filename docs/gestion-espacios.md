# D2 — Gestión de espacios e imágenes

Admin y Sacerdote administran los espacios desde **Espacios → Crear espacio** y desde las acciones **Editar espacio / Eliminar espacio** del listado o detalle. Los demás usuarios conservan su consulta habitual sin acceso a las acciones de gestión.

El nombre es obligatorio, se recorta y admite hasta 100 caracteres. La capacidad es opcional; si se indica debe ser un entero positivo hasta 2147483647. La imagen es opcional: al editar se conserva, se reemplaza o se quita explícitamente.

## Fotografías

Se recibe una sola imagen JPEG, PNG o WebP de hasta 10 MiB y 40 megapíxeles, sin animación. Se comprueban extensión, MIME y contenido decodificado. El backend orienta la foto, la reduce sin ampliarla a un máximo de 1600 × 1200 píxeles y genera WebP con calidad 82, sin metadatos EXIF. No conserva ni publica el original.

Cada carga tiene un UUID nuevo y se publica en `/uploads/espacios/subidas/<uuid>.webp`, con caché inmutable de 30 días. La base almacena únicamente esta ruta en `espacio.foto_url`. Las fotos iniciales permanecen en `/uploads/espacios/salon-XX-v1.webp`; ver [imágenes de fase 1](imagenes-fase1.md) y su advertencia sobre la asignación provisional.

El reemplazo o retiro limpia la foto cargada anterior después de confirmar la escritura en base de datos. Una escritura fallida limpia la carga nueva. Nunca se borran las fotos incluidas en el despliegue. Un fallo de limpieza se registra en backend y puede dejar un archivo sin referencia para revisión operativa.

## Persistencia y despliegue

Los Compose de ejemplo y producción montan el volumen `espacios_imagenes` en `/app/media/espacios/subidas`. El Dockerfile prepara ese directorio para el usuario `node`. El volumen se monta únicamente en el subdirectorio de cargas para conservar las fotos iniciales de la imagen.

Si ya existe un `docker-compose.yml` local, añadir al servicio backend:

```yaml
volumes:
  - ./backend/src:/app/src
  - espacios_imagenes:/app/media/espacios/subidas
```

Declarar también `espacios_imagenes:` bajo `volumes:` al final del archivo. Reconstruir backend al desplegar las dependencias de procesamiento de imágenes. No es necesario modificar tablas si ya se aplicó `20261025_espacio_fotos.sql`; las bases anteriores deben seguir las instrucciones de fase 1.

Respaldar y restaurar **la base de datos y el volumen de imágenes juntos**, en una ventana sin escrituras. Reiniciar o recrear contenedores conserva el volumen; `docker compose down -v` lo elimina. Al ejecutar backend fuera de Docker, respaldar `app/backend/media/espacios/subidas/`, ignorado por Git. Un proxy externo que reciba las cargas debe admitir al menos 12 MiB por petición multipart.

## Eliminación y reservas

La eliminación es física. Se consideran reservas que requieren confirmación las pendientes o confirmadas cuyo final aún no ha pasado, usando la hora de Guatemala. La interfaz muestra solicitante, evento, estado, fecha y horario; permite revisar el listado antes de confirmar **Cancelar reservas y eliminar espacio**.

La operación cancela todas esas reservas, registra decisiones y notifica a los solicitantes distintos del actor. Conserva reservas, eventos, tareas y asignaciones para historial; el calendario oculta los eventos cancelados y sus tareas. Las reservas pasadas no se cancelan. Todas las reservas conservadas pierden el vínculo al espacio eliminado por el `ON DELETE SET NULL` existente.

La comprobación se repite dentro de una transacción. Si cambia el conjunto de reservas desde que se mostró, se actualiza la advertencia y se exige confirmar de nuevo; no se cancelan reservas nuevas sin mostrarlas.
