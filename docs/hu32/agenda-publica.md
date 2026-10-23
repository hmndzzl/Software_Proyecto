# HU-32 — API de agenda pública (Sprint 9, M1)

El backend existente ofrece `GET /api/public/agenda` sin autenticación para la landing.
No hace falta otro servicio. El sitio consulta esta API desde `/agenda`.

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

## Control administrativo (Sprint 10)

1. Iniciar sesión como Admin o Sacerdote y abrir **Gestión de Eventos** (`/eventos`).
2. Elegir **Editar** en el evento y marcar **Mostrar en la agenda pública**.
3. Pulsar **Guardar Cambios**. La casilla refleja el valor guardado al volver a editar.
4. Abrir `/agenda` sin sesión o recargarla si ya estaba abierta: el evento aparece
   si su reserva está confirmada y todavía no ha terminado, según la hora de Guatemala.
5. Desmarcar la casilla y guardar para retirarlo. Recargar la agenda para comprobarlo.

En desarrollo con Vite en su puerto predeterminado, las páginas son
`http://localhost:5173/eventos` y `http://localhost:5173/agenda`.
No se requiere una migración nueva: se utiliza `evento.publico`, ya existente.
Si una base antigua aún no tiene esa columna, aplicar la migración indicada arriba,
conservando los datos y sin borrar volúmenes.

El formulario utiliza `PATCH http://localhost:3001/api/eventos/:id/publico`,
con `Authorization: Bearer <token>`, `Content-Type: application/json` y el cuerpo
`{ "publico": true }` o `{ "publico": false }`. El contrato y los códigos de respuesta
descritos arriba no cambian; no se añadieron campos ni permisos a la API.
Cambiar solamente la casilla no modifica la descripción ni el encargado.

Si también se editan datos generales, se guardan mediante el PUT existente antes
del PATCH de visibilidad. Son dos operaciones independientes: si falla la segunda,
el formulario informa qué datos ya se guardaron y permite reintentar sin volver a
enviar el PUT confirmado. No muestra éxito ni cierra el formulario mientras quede
un error de publicación. Los controles se deshabilitan durante el guardado.

### Prueba de navegador con API y base reales

La prueba `app/backend/tests/browser/evento-agenda-ui.test.ts` levanta una MariaDB
temporal con los datos de prueba, la API en un puerto libre y Vite en el puerto 4175.
Publica y retira desde el formulario, comprueba `/agenda` en otro contexto sin sesión,
verifica la persistencia al recargar y comprueba rechazos 401/403. No modifica la base
local habitual ni utiliza mocks de la API. Cierra sus servicios al terminar.

Preparación: Docker activo, dependencias instaladas con `npm ci` en backend y frontend,
y Chromium instalado con `npx playwright install chromium` desde frontend.
Desde backend ejecutar `npm run test:agenda-ui`. Para usar Edge instalado en Windows,
establecer `$env:PLAYWRIGHT_CHANNEL = 'msedge'` antes de ejecutar el comando.
Esta prueba tiene un comando separado para que la suite de integración de API
existente no requiera instalar frontend ni un navegador.
El informe JUnit y las capturas quedan en `app/backend/test-results/` (no versionados).

Verificación del cambio: 15 pruebas de frontend, 29 pruebas de rutas de agenda y
publicación, 8 pruebas de integración de API con MariaDB y la prueba completa de
navegador. Compilaciones de frontend/backend y lint de frontend correctos.

## Verificación automatizada

Desde `app/backend`: `npm test`, `npm run build` y `npm run test:integration`.
La integración requiere Docker y utiliza una base temporal independiente.
Verifica privacidad por defecto, filtrado real en MariaDB, paginación, eventos del día,
salón ausente, retiro de publicaciones y migración repetible sin publicar datos existentes.
