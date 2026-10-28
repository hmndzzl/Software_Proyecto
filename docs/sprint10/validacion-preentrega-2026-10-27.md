# Validación previa a la entrega — 27 de octubre de 2026

## Alcance y entorno

La revisión manual comenzó en `codex/sprint10-validacion`, basada en `develop` (`9628e688`). El checkout cambió después a `test/seguridad` (mismo commit base); las correcciones y la batería final quedaron como cambios sin commit en el árbol de trabajo de esta última rama. Se usaron frontend local y backend/MariaDB efímeros de `tests/k6/docker-compose.yml`. Las cuentas semilla permitieron revisar los cinco roles. La aplicación de entrega usa Clerk; esta validación local utilizó el endpoint de login con JWT y **no certifica el flujo externo de Clerk**. El acceso HTML auxiliar utilizado para seleccionar cuentas se eliminó al finalizar.

## Revisión manual por rol

| Rol | Comprobación en navegador con datos reales | API de personas / reservas / creación de reserva / reporte de salones / reporte de tareas |
|---|---|---|
| Administrador | Panel con indicadores; gestión de reservas y espacios; ambas secciones de reportes y exportación Excel disponible | 200 / 200 / 400 por cuerpo vacío, luego de pasar autorización / 200 / 200 |
| Sacerdote | Panel e indicadores; menú de cuentas, ministros, reservas, tareas, espacios y reportes | 200 / 200 / 400 por cuerpo vacío, luego de pasar autorización / 200 / 200 |
| Coordinador de ministros | Panel, gestión de tareas y ministros; reportes muestra únicamente tareas y asignaciones | 200 / 200 / 400 por cuerpo vacío, luego de pasar autorización / 403 / 200 |
| Coordinador de grupos | Panel, gestión de grupos y acceso a la solicitud de reservas; no aparece reportes | 403 / 200 / 400 por cuerpo vacío, luego de pasar autorización / 403 / 403 |
| Ministro | Panel, lista de sus tareas, formulario de cambio de turno y aviso de ausencia; no aparecen personas, reservas, nueva reserva ni reportes | 403 / 403 / 403 / 403 / 403 |

Se verificaron navegación, datos y formularios disponibles, además de la autorización de API con los cinco JWT semilla. En un flujo real de API, el coordinador de grupos creó una reserva (201), el sacerdote la aprobó (200), el coordinador pudo consultarla (200), el ministro quedó bloqueado al crear o consultar (403), el sacerdote pudo exportarla en CSV (200) y el coordinador la canceló al terminar (200). En otro flujo, el coordinador de ministros creó y asignó una tarea (201), el ministro la consultó (200) pero no pudo crear otra ni exportar el reporte (403), el coordinador sí la exportó (200) y el administrador eliminó el dato de prueba (204).

**No se completó manualmente cada mutación de cada módulo ni el login con Clerk**; las pruebas de regresión e integración que se indican abajo cubren acciones adicionales. No se debe presentar esta revisión como una certificación manual exhaustiva de todos los flujos.

## Pruebas automatizadas del candidato

| Comprobación | Resultado |
|---|---|
| Build frontend y backend | Aprobados |
| Lint frontend | Aprobado |
| Unitarias frontend y cobertura | 794/794; líneas 98,33 %, ramas 95,21 % |
| Unitarias backend y cobertura | 872/872; líneas 94,60 %, ramas 92,62 % |
| Integración backend con MariaDB/Testcontainers | 39/39, incluida la nueva regresión de aprobaciones concurrentes |
| Regresión Playwright, incluida accesibilidad pública | 78/78 |

La primera ejecución del backend dentro del sandbox local produjo `listen EPERM` en Supertest. Se repitió con acceso a localhost y terminó con 872/872 aprobadas; el error del sandbox no se contabilizó como fallo de la aplicación. Durante la corrección de k6 aparecieron fallos intermitentes de Supertest al ejecutar la suite unitaria en paralelo con la reconstrucción de Docker. La repetición final sin esa carga pasó **872/872**; la suite de integración pasó **39/39** y el build backend terminó correctamente.

## Carga y estrés k6

La primera batería completa, con un stack reutilizado y la suite sin corregir, aprobó 2 de 12 escenarios (`tests/k6/results/20261027T182327Z-62985/`). Ese resultado motivó la investigación, pero la carga acumulada de reservas canceladas y una suspensión del equipo impedían usarlo como medición comparable. Se recreó el stack efímero y se depuró cada fallo reproducible.

El login usaba `bcryptjs.compare`, que ejecutaba la comparación costosa en el hilo principal de Node. Se cambió únicamente esa comparación a `bcrypt` nativo, compatible con las contraseñas existentes; el build de la imagen Alpine, el login real contra las cuentas semilla y las pruebas unitarias del controlador confirmaron su funcionamiento. En el escenario aislado PE-AUTH-01, el p95 bajó de **2577,34 ms** a **542,28 ms**; la recuperación p90 fue de **67,84 ms**. En la batería completa, con reservas ya generadas, p95 fue **538,23 ms** y no hubo errores HTTP. La mejora observada en el escenario aislado es de 2035,06 ms (79,0 %), aunque las variaciones del equipo impiden atribuir todo el cambio a una sola causa. Estas mediciones ejercitan el login JWT local, no Clerk.

La prueba de colisiones se corrigió para la regla vigente: se pueden crear solicitudes Pendientes superpuestas; la exclusión ocurre al **aprobar**. La primera reproducción permitió confirmar 10 de 40 solicitudes a la vez, un defecto real. La aprobación ahora bloquea la fila del salón durante la comprobación de solapamientos. Una prueba de integración con 12 aprobaciones concurrentes y PE-RES-01 con 40 participantes verificaron que solo una queda Confirmada.

Las pruebas de espacios y notificaciones también tenían bucles sin pausas bajo estrés. Espacios alcanzaba 2665 peticiones/s con 80 VUs y 1,8 GB transferidos en 2m40s, frente a 148 peticiones/s en el ensayo anterior. Ahora conserva 60→80 VUs y un intervalo de 0,3 s por usuario. Su p95 fue 21,64 ms en la batería completa, con el criterio documentado de <50 ms. El valor histórico de 4,56 ms era una observación, no el límite de aceptación anterior (<1200 ms). La consulta SQL directa midió mediana de 0,22 ms; el HTTP dentro del backend, p95 de 2,56 ms. Esto no justifica añadir índices ni quitar la consulta del rol vigente que protege cada petición. Notificaciones conserva el sondeo nominal de 60 s y usa 1 s bajo estrés, 60 veces la frecuencia real: p95 de 9,25 ms frente a <10 ms.

La repetición integral se ejecutó con `K6_STACK=true ./tests/k6/run-tests.sh all both` sobre una base efímera recién creada. Evidencia local: `tests/k6/results/20261028T005912Z-75571/` (excluida de Git). **Los 12 de 12 escenarios aprobaron.** El soak completó 30 minutos con 25 VUs, **41 750 recorridos, 167 000 peticiones medidas, 334 000 checks correctos y 0 errores HTTP**. Todos los escenarios tuvieron 0 errores HTTP medidos y sus checks aprobaron.

| Escenario | Resultado medido | Criterio relevante |
|---|---:|---|
| PC-AUTH-01 | p90 61,39 ms | <800 ms |
| PC-ESP-01 | p95 17,18 ms | <50 ms |
| PC-NOTIF-01 | p95 6,12 ms | <15 ms |
| PC-RES-01 | p90 17,97 ms | <500 ms |
| PC-CAL-01 | máximo 48,38 ms | máximo <150 ms |
| PC-E2E-01 | p90 49,64 ms; 100 % recorridos | <400 ms |
| PE-AUTH-01 | p95 538,23 ms; recuperación p90 67,41 ms | <3000 ms; recuperación p90 <800 ms |
| PE-ESP-01 | p95 21,64 ms | <50 ms |
| PE-NOTIF-01 | p95 9,25 ms | <10 ms |
| PE-RES-01 | una aprobación, 39 rechazos | exclusión de colisiones |
| PE-SPIKE-01 | 0 iteraciones descartadas; recuperación 2,07 s | 0 descartes; <15 s |
| PE-SOAK-01 | 30 min; 41 750 recorridos, 0 fallos | contratos y HTTP sin fallos |

La latencia de espacios no debe compararse directamente con la del sprint anterior por las diferencias de cadencia, entorno y comprobación de autorización. Una primera batería interrumpida por suspensión de macOS se descartó para conclusiones de rendimiento; la repetición se hizo con `caffeinate` activo.

## Decisión de liberación

**No fusionar a `main`: corregir y verificar sin fusionar.** La revisión manual se hizo en el entorno local con datos semilla elegido para esta tarea y conserva las limitaciones indicadas. Un push a `main` ejecuta el despliegue del Droplet mediante `.github/workflows/deploy.yml`. La batería de carga y estrés, las pruebas unitarias y la integración backend de esta rama aprobaron. Falta la validación del login externo con Clerk en un entorno que lo tenga configurado; no se infiere de las cuentas semilla locales.
