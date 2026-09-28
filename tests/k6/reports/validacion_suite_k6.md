# Verificación de la suite de 12 pruebas

Fecha: 28 de septiembre de 2026. Entorno: stack efímero `parroquia-k6`, backend compilado con Node.js 20, MariaDB 11, Grafana k6 **v2.2.0** (imagen local `grafana/k6:latest`, versión comprobada antes de ejecutar).

## Comprobaciones realizadas

- `k6 inspect`: las 12 configuraciones se cargaron correctamente con sus perfiles completos.
- Verificación breve contra la API real y MariaDB, sin mocks:

  ```bash
  K6_STACK=true K6_IMAGE=grafana/k6:latest SMOKE=true K6_TIMESERIES=true ./tests/k6/run-tests.sh all both
  ```

- **11 casos aprobados** en modo breve; **PE-RES-01 falló** al detectar 40 respuestas HTTP 201 y 0 rechazos, en lugar de 1 aceptación y 39 HTTP 400. La auditoría de persistencia también falló porque había más de una reserva del mismo envío. La demora máxima al despachar las 40 peticiones desde la barrera fue 4 ms (límite: 250 ms).
- El runner continuó con spike y soak después de la falla y terminó con código **1**, como corresponde. Se generaron 12 resúmenes y 12 archivos de muestras temporales gzip válidos.
- Las reservas creadas por estos casos se cancelaron mediante el estado 4; el entorno efímero se elimina después de la verificación.
- **7 pruebas de seguridad aprobadas** en Docker: límite habitual de login, cabeceras/CORS y comprobaciones de que el flag de k6 no omite el límite en producción/desarrollo ni cuando no está habilitado explícitamente en el entorno de rendimiento.
- El monitor produjo una muestra válida de ambos contenedores y del estado de MariaDB. Una muestra no certifica estabilidad de recursos.
- `bash -n` y `git diff --check` sin errores; el runner rechaza identificadores inválidos.

Los resultados locales de esta ejecución están en `tests/k6/results/20260928T093757Z-2222/` (excluidos de Git).

## Alcance del resultado

Esta ejecución comprueba contratos, preparación de datos, limpieza, conteo concurrente, umbrales y exportación. **No certifica capacidad bajo la carga nominal o máxima ni estabilidad durante 30–45 minutos**: se usó el modo breve, excepto en colisiones, que conserva sus 40 participantes.

La implementación actual de `crearReserva` permite solicitudes pendientes superpuestas y devuelve 409 cuando encuentra una reserva confirmada. La falla PE-RES-01 expone esa diferencia respecto a la tabla solicitada; no se han cambiado esas reglas ni relajado las aserciones.

Para evaluar las tablas completas, ejecutar los perfiles sin `SMOKE`, observar la infraestructura y resolver la diferencia de contrato de reservas. Consultar [la guía](../README.md) para los límites de observación de CPU, heap y pool.
