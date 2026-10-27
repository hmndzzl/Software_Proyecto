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

## Punto de reanudación antes del reinicio

- Backend: 820 pruebas unitarias pasaron; cobertura global de líneas 96,12%. La compilación encontró imports de Vitest omitidos en el test nuevo; ya corregidos, falta repetir build.
- Frontend: build pasó antes de los últimos ajustes. 58/59 pruebas enfocadas pasaron; la restante esperaba el texto anterior de un aviso, se conservó ese texto y falta repetirla. Falta completar lint, build final y regresión.
- Falta ampliar las pruebas de previsualización de ausencias y revisar visualmente el nuevo modal; agregar colección Postman.
- Falta ejecutar la nueva integración real `disponibilidad.integration.test.ts`, aplicar migración local y verificar API. Docker no estaba disponible y el usuario reiniciará el equipo.
- No hacer push ni PR hasta autorización. Este es un punto de avance, no una entrega terminada.
