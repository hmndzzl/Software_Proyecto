# HU-32 — API de agenda pública (Sprint 9, M1)

El backend existente ofrece `GET /api/public/agenda` sin autenticación para la landing.
No hace falta otro servicio. La implementación del frontend queda fuera de esta tarea.

## Preparación de la base de datos

En bases existentes, ejecutar `app/database/migrations/20261009_evento_publico.sql`
con una conexión a MariaDB. Es idempotente, agrega `evento.publico` y no elimina datos.
Las bases nuevas reciben el campo desde `app/database/init/01_schema.sql`.
Todos los eventos son privados por defecto, incluidos los creados automáticamente
al solicitar una reserva. No se clasifican eventos por título, grupo o encargado.

Los cambios del repositorio y la recreación de contenedores no aplican esta migración
automáticamente sobre el volumen existente. No borrar el volumen para actualizarlo.
Sin la migración, la API devuelve 500 y no publica eventos como alternativa.

## Consulta pública

`GET http://localhost:3001/api/public/agenda`

Devuelve 200 y un array, o `[]` si no hay eventos elegibles. Solo incluye eventos con
`publico = 1`, reserva confirmada y fecha/hora de finalización posterior al momento
actual en Guatemala (UTC−06:00). Incluye actividades que ya empezaron y siguen en curso.
Excluye eventos privados, terminados y reservas pendientes, rechazadas o canceladas.
Ordena por fecha, hora de inicio e identificador de evento.

```json
[
  {
    "id": 8,
    "titulo": "Encuentro parroquial",
    "descripcion": "Actividad abierta a todo público.",
    "fecha": "2026-12-20",
    "hora_inicio": "09:00:00",
    "hora_fin": "11:00:00",
    "nombre_espacio": "Salón parroquial"
  }
]
```

`fecha` conserva el formato `YYYY-MM-DD`; las horas son locales de Guatemala.
`nombre_espacio` puede ser `null` si la reserva no tiene salón asociado.
No se incluyen nombres, correos, teléfonos ni identificadores de encargados o solicitantes.
Título y descripción sí son contenido público: quien publique debe revisar su texto.

Parámetros opcionales:

| Parámetro | Valor por defecto | Valores aceptados |
| --- | --- | --- |
| `pagina` | `1` | Entero positivo seguro; el desplazamiento también debe ser seguro |
| `limite` | `100` | Entero entre 1 y 100 |

Ejemplo: `GET /api/public/agenda?pagina=2&limite=10`.
La respuesta sigue siendo un array. Continuar consultando páginas hasta recibir una vacía.
Los parámetros inválidos devuelven 400. Los errores de consulta devuelven 500 con un
mensaje genérico, sin detalles de SQL. No se necesita header `Authorization`.

## Publicar o retirar un evento

`PATCH /api/eventos/:id/publico` requiere un token válido de Admin o Sacerdote.
Coordinadores, ministros y visitantes no pueden cambiar la publicación.

```json
{ "publico": true }
```

Respuesta 200:

```json
{ "mensaje": "Visibilidad actualizada", "evento": { "id": 8, "publico": true } }
```

Enviar `false` retira el evento de la agenda sin eliminarlo. Solo acepta booleanos JSON;
`"false"`, `0`, `1`, `null` o el campo ausente devuelven 400.
Un id inexistente devuelve 404; sin token, 401; sin permiso, 403.
Repetir el mismo valor en un evento existente sigue devolviendo 200.
Marcar un evento público no aprueba su reserva: debe estar confirmada para aparecer.
Cancelar la reserva lo excluye inmediatamente, aunque conserve `publico = 1`.
Las consultas internas `GET /api/eventos` y `GET /api/eventos/:id` incluyen `publico`
como valor 0/1, conservando la autenticación que ya tenían.

## Prueba manual en Postman

1. Aplicar la migración en la base del entorno a probar.
2. Crear una reserva con evento y confirmar la reserva mediante el flujo interno existente.
3. Consultar la agenda sin token: el evento nuevo todavía no aparece.
4. Como Admin/Sacerdote, enviar PATCH con `{ "publico": true }`.
5. Consultar la agenda sin token: aparece con título, descripción, fecha, horas y salón.
6. Enviar PATCH con `{ "publico": false }`: deja de aparecer.
7. Volver a publicar y cancelar la reserva: sigue excluido de la agenda.

No es necesario exponer `/api/eventos` ni usar el login anterior para consumir la landing.
La decisión funcional de cuáles actividades son abiertas al público corresponde a Javier
y al equipo parroquial; el campo permite registrar esa decisión explícitamente.

## Verificación automatizada

Desde `app/backend`: `npm test`, `npm run build` y `npm run test:integration`.
La integración requiere Docker y utiliza una base temporal independiente.
Verifica privacidad por defecto, filtrado real en MariaDB, paginación, eventos del día,
salón ausente, retiro de publicaciones y migración repetible sin publicar datos existentes.
