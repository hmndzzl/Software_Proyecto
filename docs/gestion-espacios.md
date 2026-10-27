# D2 — Gestión de espacios e imágenes

Admin y Sacerdote administran los espacios desde **Espacios → Crear espacio** y desde la acción **Editar espacio** del listado o detalle. El botón **Eliminar espacio** está dentro del modal de edición. Cancelar la confirmación devuelve a la edición y conserva los cambios sin guardar. Los demás usuarios conservan su consulta habitual sin acceso a las acciones de gestión.

El nombre es obligatorio, se recorta y admite hasta 100 caracteres. La capacidad es obligatoria y debe ser un entero positivo hasta 2147483647. Los espacios antiguos sin capacidad deben completarse al editar. La imagen es opcional: al editar se conserva, se reemplaza o se quita explícitamente.

## Fotografías

El formulario usa el botón **Seleccionar imagen**, con el estilo compartido de la plataforma, y muestra el nombre del archivo y su vista previa. Se puede cambiar la selección antes de guardar.

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

## Contrato HTTP

Las rutas de lectura siguen disponibles para usuarios autenticados. Las siguientes acciones requieren Admin o Sacerdote:

| Método y ruta | Entrada / resultado |
| --- | --- |
| `POST /api/espacios` | JSON o multipart: `nombre`, `capacidad` obligatoria y archivo `imagen` opcional; devuelve `201` con `espacioId`. |
| `PUT /api/espacios/:id` | Mismos campos; `quitar_imagen=true` elimina la foto. No se permite subir y quitar en la misma petición. |
| `GET /api/espacios/:id/impacto-eliminacion` | Devuelve `{ reservas: [...] }` con id, fecha, horario, estado, solicitante y título del evento de las reservas afectadas. |
| `DELETE /api/espacios/:id` | Sin confirmación masiva solo permite eliminar sin reservas afectadas. Para cancelarlas requiere JSON `{ cancelar_reservas: true, reserva_ids: [ids revisados] }`. |

En multipart se envía la capacidad como cadena decimal positiva y el booleano como `true`/`false`; en JSON también se aceptan sus tipos nativos. La URL de foto la genera el servidor: no se admiten URLs arbitrarias del cliente.

Errores: `400` datos o imagen inválidos, `401` sin autenticación, `403` sin permisos, `404` espacio inexistente, `409` reservas que requieren revisión o concurrencia, `413` archivo demasiado grande y `500` fallo interno. Cuando `409` contiene `reservas`, el cliente debe sustituir la lista mostrada y pedir nueva confirmación. Si no contiene lista, volver a consultar el impacto.


## Verificación

Desde la raíz del repositorio:

```sh
npm test --prefix app/backend
npm test --prefix app/frontend
npm run test:integration --prefix app/backend -- tests/integration/espacios.integration.test.ts
npm run test:regression --prefix app/frontend -- espacios.spec.ts espacios-diseno.spec.ts responsive.spec.ts
npm run build --prefix app/backend
npm run build --prefix app/frontend
npm run lint --prefix app/frontend
```

Las pruebas D2 de MariaDB usan un contenedor desechable con datos propios; no alteran la base de desarrollo. Cubren fotos reales, reemplazo y retiro, permisos, cancelación de pendientes y confirmadas, auditoría, avisos, conservación de reservas pasadas/eventos/tareas, ocultamiento del calendario y bloqueo de aprobación sin espacio. Los tests unitarios comprueban reversión y limpieza de archivos ante fallos. Playwright comprueba formularios, confirmación propia, paginación de 100 reservas y permisos en móvil (375 px) y escritorio (1280 px).

Para revisar manualmente: entrar como Admin/Sacerdote, abrir **Espacios**, crear con foto y capacidad, editar y reemplazar/quitar la imagen; probar cancelar una eliminación y después confirmarla. En un espacio con reservas, verificar la lista de afectadas antes de cancelar todas. Confirmar que el historial se conserva y que el coordinador no ve controles de gestión. Reiniciar el backend y comprobar que una foto cargada sigue disponible.

En esta entrega también se construyó la imagen de producción y se comprobó que el usuario `node` puede guardar una foto y recuperarla desde otro contenedor con el mismo volumen, conservando las fotos iniciales.


## Disponibilidad y referencia temporal

`GET /api/espacios` sin filtros calcula `disponible` para el instante actual de Guatemala: una reserva confirmada bloquea desde su inicio inclusive hasta su fin exclusivo, aunque todavía no tenga check-in. `en_uso` exige además un check-in. Las reservas pendientes/canceladas y las de otro día no bloquean el instante actual. Con fecha y horario completos se consulta el solapamiento en ese intervalo.

El listado incluye `consultado_en` (ISO UTC generado por el servidor en la misma consulta); la interfaz muestra esa referencia en hora de Guatemala encima de las tarjetas. Al filtrar se muestra la fecha y el horario seleccionados. Los filtros incompletos o inválidos muestran **Sin consultar**, sin asumir disponibilidad.

La vista actualiza cada minuto mientras está visible, al volver a la pestaña y al pulsar **Actualizar**. La actualización en segundo plano conserva el listado y las ediciones abiertas. Si falla, mantiene los datos con la indicación **Última consulta** y permite reintentar.

El diseño institucional cálido del listado usa fondo marfil, nombre burdeos con acento dorado y acciones discretas. Conserva fotografía, nombre completo, estado, capacidad y acciones visibles. Las fotos tienen relación 16:10 y las tarjetas usan una cuadrícula adaptable con mínimo de 290 px cuando hay espacio; en móvil se ajustan al ancho disponible. El detalle separa gestión y estado mediante `--gap-sm`, sin márgenes específicos para una pantalla.

El contenedor principal conserva la altura natural del contenido para que el padding inferior del tema quede después de la última fila y sea alcanzable al desplazar. Las pruebas de diseño verifican ese margen y la separación entre edición y estado en el detalle a 375 × 844 y 1440 × 1000. También comprueban contraste de tarjetas y barra temporal en ambos temas, navegación por teclado y movimiento reducido. Las capturas se generan en `app/frontend/test-results/`; la revisión de esta entrega dejó el registro local `diseno-espacios-evidencia/evidencia.json` junto con ocho capturas.
