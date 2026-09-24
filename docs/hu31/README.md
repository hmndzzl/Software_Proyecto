# HU-31: backend de periodos de ausencia

`POST http://localhost:3001/api/ausencias` registra un periodo y envía una notificación individual a **todos y solo** los usuarios con rol Coordinador de Ministros (2) o Sacerdote (1). No utiliza herencia de roles: Admin, Coordinador de Grupos y Ministro no son destinatarios. No depende de la relación `coordinador_ministro`.

## Preparación

- Bases nuevas: `app/database/init/01_schema.sql` incluye la tabla.
- Bases existentes: ejecutar `app/database/migrations/20260923_periodo_ausencia.sql` sobre la base configurada. Es aditiva y no requiere borrar el volumen ni los datos.
- Desde `app`, actualizar el backend con `docker compose up -d --build backend`.

## Postman

Importar `ausencia.postman.json` y ejecutar sus dos solicitudes en orden. La primera guarda automáticamente el token en la colección. Los datos corresponden a `app/database/init/02_seeds.sql`.

1. `POST /api/auth/login` con `{"correo":"ministro@parroquia.com","password":"password123"}`.
2. `POST /api/ausencias`, encabezados `Content-Type: application/json` y `Authorization: Bearer <token>`:

```json
{
  "ministro_id": 9,
  "fecha_inicio": "2026-10-01",
  "fecha_fin": "2026-10-05"
}
```

Respuesta `201` (IDs de ausencia y notificación ilustrativos):

```json
{
  "mensaje": "Periodo de ausencia registrado; coordinadores de ministros y sacerdote notificados",
  "ausencia": {
    "id": 1,
    "ministro_id": 9,
    "ministro": { "id": 9, "nombre": "Ministro Test", "correo": "ministro@parroquia.com" },
    "fecha_inicio": "2026-10-01",
    "fecha_fin": "2026-10-05",
    "notificacion_id": 5
  }
}
```

Solo un ministro puede registrar su propia ausencia. Se valida que `ministro_id` coincida con el JWT y que conserve el rol en BD. Nombre y correo se consultan en BD; enviarlos en el body no modifica la identidad. No se devuelven contraseñas ni tokens en la ausencia.

Las fechas son `DATE`, sin hora y con extremos inclusivos; se permite un único día. Se rechazan fechas inexistentes, marcas de tiempo y rangos invertidos. No se impone una restricción de fechas pasadas ni solapamientos en esta HU; cada POST válido crea un periodo y una notificación nuevos.

El periodo, la notificación y todos sus destinatarios se guardan en una única transacción. Si una escritura falla, se revierte todo. Sin destinatarios registrados, devuelve `409` y no guarda nada. Otros errores: `400` entrada inválida, `401` sesión inválida, `403` rol o identidad no autorizados, `404` ministro inexistente y `500` error interno.

Con los seeds, reciben la notificación únicamente las personas **6, 7 y 13**: `sacerdote@parroquia.com`, `coord.min@parroquia.com` y `coord.min2@parroquia.com` (contraseña `password123`). Iniciar sesión con cada cuenta y consultar `GET /api/notificaciones` permite comprobar nombre, correo, periodo y `remitente_id: 9`. La notificación no requiere confirmar asistencia. El frontend existente la recoge mediante su flujo habitual de notificaciones.

La tabla conserva la relación al ministro y un índice por ministro/fechas para futuras consultas. Esta tarea no modifica la asignación de tareas ni implementa la página de ausencias.

## Verificación automatizada

Desde `app/backend`: `npm run build` y `npm test`. Las pruebas del endpoint cubren autenticación, roles exactos, identidad, fechas, destinatarios y reversión de escrituras.

Verificación realizada: compilación correcta y 311 pruebas aprobadas (28 nuevas). Prueba HTTP con MariaDB local: login real, respuesta 201, fechas persistidas y consulta de notificaciones con las 9 cuentas existentes; solo las personas 6 y 7, los únicos usuarios locales con los roles destinatarios, pudieron ver la notificación. Esa base tenía seeds anteriores y no incluía todavía a la persona 13; las pruebas automatizadas sí incluyen ambos coordinadores del seed actual. Los registros de esa prueba se eliminaron al terminar, conservando la tabla y los datos previos.
