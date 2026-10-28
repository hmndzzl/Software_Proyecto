# Disponibilidad por periodos — tarea 6

Rama: `feature/disponibilidad-ministros-por-periodo`, creada desde `develop` actualizado.

En Ministros, el botón rojo **Periodos no disponibles** permite agregar y quitar rangos con fecha/hora. Conserva el interruptor general. Al finalizar un periodo deja de afectar automáticamente las nuevas comprobaciones, sin un proceso programado. Las ausencias ya reportadas se muestran como referencia y no se eliminan desde este control.

Las alertas al crear/asignar/reasignar tareas consideran el interruptor, los rangos y `periodo_ausencia`. Siguen siendo advertencias no bloqueantes. La previsualización del formulario se complementa con la comprobación definitiva del servidor al guardar.

## API

Autenticación: `Authorization: Bearer <token>`. Sacerdote/Admin pueden gestionar cualquier ministro; Coordinador de Ministros solo los suyos. Otros roles: 403; sin sesión: 401.

- `GET http://localhost:3001/api/personas/9/disponibilidad/periodos`: 200, lista ordenada con `id`, `desde`, `hasta`, `origen` (`disponibilidad` o `ausencia`).
- `POST http://localhost:3001/api/personas/9/disponibilidad/periodos`, `Content-Type: application/json`: crea un periodo, responde 201 con los mismos campos.
- `DELETE http://localhost:3001/api/personas/9/disponibilidad/periodos/<id>`: 204; solo elimina periodos de disponibilidad del ministro indicado. Inexistente o perteneciente a otro ministro: 404.

Ejemplo POST:
```json
{"desde":"2026-12-10T00:00","hasta":"2026-12-16T00:00"}
```
Este ejemplo abarca completos los días 10 al 15. Se usan horas civiles de Guatemala, sin sufijo UTC. Inicio incluido, fin excluido; fechas inválidas, incompletas o inicio >= fin devuelven 400. Pueden coexistir varios periodos.

Las respuestas de asignación conservan `ministro_no_disponible` (verdadero si cualquiera de las fuentes impide disponibilidad), añadiendo `periodo_no_disponible` y `ausencia_reportada`. El tope mensual se sigue calculando por separado. Una tarea que termina justo al iniciar un periodo, o empieza justo cuando termina, no se solapa. Las ausencias por fechas incluyen su último día completo.

## Base de datos

Aplicar `app/database/migrations/20261026_disponibilidad_periodo.sql` en cada base existente antes de desplegar el backend. Es aditiva, repetible y conserva datos. Las bases nuevas incluyen la tabla en `01_schema.sql`.

## Pruebas y revisión local

- Migración aplicada en la base local, sin borrar volúmenes ni datos. La prueba aislada también comprueba que ejecutarla dos veces conserva los periodos.
- Backend: compilación y 820 pruebas unitarias aprobadas.
- Frontend: compilación, lint y 742 pruebas aprobadas; cobertura de ramas 95,03%, cumpliendo el mínimo de 95%.
- Integración de esta tarea: 9 pruebas con MariaDB aprobadas (permisos, persistencia, eliminación, límites de solapamiento y ausencias existentes).
- Navegador + API + MariaDB: creación desde el directorio, recarga, advertencia antes/después de asignar y eliminación aprobadas. Diseño revisado a 1440 y 390 píxeles; el botón móvil no recorta su texto.
- API local: consulta autorizada 200 y sin sesión 401; frontend disponible en http://localhost:5173. Backend y frontend locales actualizados.
- Integración general: 37/38 pruebas aprobadas. El fallo existente de historial de cuentas/reservas compara la hora de Windows con la de MariaDB con tolerancia de 10 segundos; se verificó un desfase de aproximadamente 12 segundos del reloj de Docker. No se modificó esa prueba ni se relajó su validación.

## Postman

Importar `docs/sprint10/disponibilidad-periodos.postman.json`, configurar `token` y `ministroId`. Tras crear un periodo, copiar su `id` en `periodoId` para retirarlo. La solicitud de ejemplo de tarea usa el ministro 9: sustituirlo por el ministro elegido. Probar con un usuario coordinador asignado al ministro y repetir con un ministro o sin token para comprobar permisos.

## Publicación

Rama local, sin push ni PR. Aplicar la migración también en las bases de los demás entornos antes de actualizar el backend.

## Revisión de visibilidad de alertas

El estado del directorio considera también los periodos y ausencias activos en horario de Guatemala, sin modificar el interruptor general. Al cerrar el editor se actualiza el listado. Un periodo futuro no cambia el estado actual, pero sí advierte para tareas de esas fechas.

Las advertencias posteriores a crear, agregar ministros o reasignar se muestran en amarillo y quedan además visibles en la pantalla; ya no dependen únicamente del aviso temporal. La asignación sigue siendo permitida.
