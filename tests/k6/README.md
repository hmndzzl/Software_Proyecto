# Pruebas de carga y estrés con Grafana k6

Las 12 pruebas de las tablas se ejecutan por separado: `load` aplica la carga nominal y `stress` la sobrecarga. Los errores HTTP medidos deben ser **0%** y las aserciones **100%**; los umbrales fallidos producen un código de salida distinto de cero. No se relajan las latencias para obtener resultados aprobados.

## Ejecución reproducible en Docker

Desde la raíz del repositorio:

```bash
# Backend compilado, puerto local 3002, base de datos efímera independiente.
docker compose -f tests/k6/docker-compose.yml up -d --build --wait

# Verificación breve de contratos (no sustituye las pruebas completas).
K6_STACK=true SMOKE=true ./tests/k6/run-tests.sh all both

# Las seis pruebas nominales.
K6_STACK=true ./tests/k6/run-tests.sh all load

# Las seis de estrés: incluye soak de 30 minutos.
K6_STACK=true ./tests/k6/run-tests.sh all stress

# Una prueba por identificador.
K6_STACK=true ./tests/k6/run-tests.sh PE-RES-01
K6_STACK=true SOAK_MINUTES=45 ./tests/k6/run-tests.sh soak

# Inspeccionar las 12 configuraciones sin generar tráfico.
./tests/k6/run-tests.sh inspect

# Destruir únicamente este entorno y sus datos de prueba.
docker compose -f tests/k6/docker-compose.yml down
```

Se usa `grafana/k6:2.2.0`, configurable con `K6_IMAGE`. El runner acepta rutas con espacios, ejecuta las demás pruebas aunque una falle y termina con estado fallido si cualquiera falla. Cada ejecución conserva logs, estado y resúmenes JSON independientes en `results/<fecha>-<pid>/`. `K6_TIMESERIES=true` añade muestras temporales comprimidas para estudiar degradación y recuperación. Los resultados están excluidos de Git.

El stack tiene 120 cuentas distintas de coordinador, una notificación por usuario y 15 salones exclusivos. Sus credenciales locales y secretos JWT son únicamente para la BD efímera. No usa `app/.env`, el volumen habitual ni el backend del puerto 3001. El límite de 10 logins por IP/15 minutos solo se omite con **ambas** variables `NODE_ENV=performance` y `K6_DISABLE_LOGIN_RATE_LIMIT=true`. En producción el flag no tiene efecto; las respuestas 429 fuera del entorno de rendimiento son fallos de las pruebas, no éxitos.

## Cobertura y criterios automáticos

| ID | Script | Perfil y carga | Umbral de latencia / criterio particular |
|---|---|---|---|
| PC-AUTH-01 | `01_auth_login.js` | load, 10 → 15 VUs | p90 < 800 ms, HTTP 200 y JWT |
| PE-AUTH-01 | `01_auth_login.js` | stress, 35 → 50 VUs sin pausas | p95 < 3000 ms (tolerancia explícita para ≈2.9 s); regreso a p90 < 800 ms con 1 VU |
| PC-ESP-01 | `02_espacios_disponibilidad.js` | load, 15 → 25 VUs | promedio < 5 ms y p95 < 50 ms; disponibilidad booleana |
| PE-ESP-01 | `02_espacios_disponibilidad.js` | stress, 60 → 80 VUs sin pausas | p95 < 5 ms |
| PC-NOTIF-01 | `03_notificaciones_polling.js` | load, 30 → 50 VUs; sondeo cada 60 s | p95 < 15 ms; mesetas de 2 min para observar varios sondeos |
| PE-NOTIF-01 | `03_notificaciones_polling.js` | stress, 100 → 120 VUs sin pausas | p95 < 10 ms |
| PC-RES-01 | `05_reservas.js` | load, 10 → 15 coordinadores, un salón por VU | p90 del POST < 500 ms; HTTP 201; lectura confirma estado Pendiente y evento asociado |
| PC-CAL-01 | `06_calendario.js` | load, 20 → 30 VUs | máximo < 150 ms; eventos con relaciones |
| PC-E2E-01 | `04_scenario_combined.js` | load, 15 → 25 VUs | p90 HTTP global < 400 ms; login → notificaciones → espacios, recorridos completos exitosos |
| PE-RES-01 | `07_reservas_colisiones.js` | 40 VUs, configurable entre 30 y 40 | una iteración por VU, mismo payload, exactamente 1 HTTP 201, N−1 HTTP 400 y una reserva persistida |
| PE-SPIKE-01 | `08_spike.js` | ramping-arrival-rate, 0 → 100 iteraciones/s en 5 s, hasta 100 VUs | sin iteraciones descartadas; tres recorridos consecutivos < 400 ms confirman recuperación antes de 15 s |
| PE-SOAK-01 | `09_soak.js` | 25 VUs constantes, 30–45 min | HTTP y contratos sin fallos; observar memoria y conexiones por separado |

Las mesetas generales duran un minuto, precedidas por rampas de 15 s y seguidas por descenso de 10 s. `http_req_duration{phase:measure}` excluye preparación, comprobaciones de persistencia y limpieza; **todos** sus checks siguen siendo obligatorios. El recorrido E2E también registra `journey_duration_ms` (tiempo total sin pausas); el umbral de la tabla se interpreta como p90 de las peticiones HTTP, no del ciclo completo. El login de cada ciclo de soak obtiene un JWT nuevo y evita confundir su caducidad de 15 min con una degradación del servidor.

`SMOKE=true` reduce las pruebas normales a un VU/una iteración y el soak a 5 s. Spike reduce la tasa a una iteración/s; colisiones mantiene 30–40 participantes para conservar su propósito. Los mismos umbrales siguen activos, pero una muestra pequeña no certifica percentiles ni capacidad.

## Diferencias entre las tablas y el proyecto

- **Colisiones:** `crearReserva` solo consulta reservas Confirmadas y crea nuevas solicitudes Pendientes. Actualmente acepta varias solicitudes idénticas. Además, un conflicto con una reserva confirmada devuelve **409**, no el **400** de la tabla. PE-RES-01 debe fallar hasta que se cambie ese contrato/regla de negocio. No se modifica la API de reservas para ocultar esta discrepancia. Los 400 esperados solo cuentan si el cuerpo indica ocupación/conflicto, para evitar aprobar errores por payload inválido.
- **Simultaneidad:** las colisiones usan una barrera temporal compartida, una petición por VU y un umbral de demora de envío < 250 ms. k6 y la red no garantizan que todos los bytes lleguen exactamente al mismo instante. La auditoría final comprueba la cantidad persistida y detecta dobles inserciones aunque todas las respuestas sean 201.
- **Spike:** `ramping-arrival-rate` controla iteraciones por unidad de tiempo, no un número exacto de VUs activos. Se respeta el ejecutor solicitado con una rampa 0 → 100 iteraciones/s y 100 VUs preasignados como máximo; no se afirma que equivalga a 100 usuarios simultáneos. La recuperación empieza al terminar la rampa descendente, mientras drenan solicitudes pendientes, y exige tres ciclos sanos antes de 15 s. [Documentación del ejecutor](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/).
- **Calendario:** `/api/eventos` devuelve el listado completo, con relaciones; el filtro mensual vive en el cliente. No se envían parámetros de mes que la API ignoraría.
- **Backend en spike/soak:** se ejercitan login, notificaciones, disponibilidad y calendario. La escritura y concurrencia de reservas se mide en PC-RES-01/PE-RES-01, no en cada ciclo prolongado.
- **Datos de reserva:** cada ejecución lleva un marcador único. La carga cancela sus reservas después de comprobarlas y `teardown` audita/cancela las restantes por marcador, incluidas respuestas perdidas. Cancelar usa el estado **4**. Los eventos y reservas canceladas permanecen para auditoría; la API no tiene DELETE de reservas. Eliminar el stack descarta todos esos datos. Una interrupción forzada puede impedir `teardown`; reinicia el stack efímero antes de otra medición comparable.

## CPU, memoria, conexiones y bloqueos

En otra terminal, antes de iniciar k6:

```bash
./tests/k6/monitor.sh
# Ejecutar k6 en la primera terminal; finalizar el monitor con Ctrl-C
```

El monitor toma muestras cada ~5 s de CPU, memoria, red y estado/reinicios de los contenedores, además de conexiones MariaDB, deadlocks y esperas de bloqueos. Compara periodos antes, durante y después, y conserva las series de k6 con `K6_TIMESERIES=true`. Para soak conviene observar al menos un minuto de línea base y un minuto después de terminar.

Estos registros son **evidencia complementaria**, no umbrales automáticos de k6. `Threads_connected` de MariaDB no equivale a conexiones ocupadas del pool mysql2, y la memoria del contenedor no equivale al heap de Node.js. La aplicación no expone métricas de uso/cola del pool ni del heap. Por ello, **pool < 50%, curva de heap plana y ausencia de fugas requieren instrumentación del servidor para certificarse**; CPU “moderada” y ancho de banda “mínimo” necesitan límites numéricos acordados. No se infieren esas condiciones a partir de un HTTP 200. El pool actual tiene límite 10 y cola ilimitada (`queueLimit: 0`); 80 VUs no prueban por sí solos que se ocupen 80 conexiones.

## Otros entornos y opciones

```bash
# k6 instalado en el host contra el stack aislado
K6_RUNNER=native K6_STACK=true ./tests/k6/run-tests.sh PC-ESP-01

# Entorno de pruebas externo (datos y credenciales deben existir)
BASE_URL=http://host.docker.internal:3001 ./tests/k6/run-tests.sh espacios stress

# Comandos npm desde app/backend
npm run test:k6 -- login load
npm run test:k6:all -- both
```

| Variable | Uso |
|---|---|
| `K6_STACK=true` | Red Docker `parroquia-k6_default` y usuarios de fixtures |
| `K6_RUNNER` | `docker` (predeterminado) o `native` |
| `K6_IMAGE` | Imagen Docker, predeterminado `grafana/k6:2.2.0` |
| `BASE_URL` | URL base completa, sin `/api`; se respeta aunque contenga `host.docker.internal` |
| `USERS_JSON` | Array JSON de `{ "correo": "...", "password": "..." }`; reemplaza usuarios predeterminados |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Preparación/auditoría de reservas (predeterminado administrador de semillas) |
| `RESERVA_SPACE_IDS` | IDs separados por comas de salones exclusivos, al menos 15 en carga y 1 en colisiones |
| `TEST_DATE` | Fecha `YYYY-MM-DD`; reservas requieren fecha futura. Por defecto se calcula respecto al día de ejecución |
| `COLLISION_VUS` | Entero de 30 a 40, predeterminado 40 |
| `SOAK_MINUTES` | De 30 a 45, predeterminado 30 |
| `SMOKE=true` | Ejecución abreviada de verificación |
| `K6_TIMESERIES=true` | Exportación de muestras comprimidas además del resumen |

Sin fixtures se usan las cuentas semilla originales para las lecturas; múltiples VUs pueden compartir una cuenta. Para reservas se exige una cuenta diferente de coordinador por VU; para representar 50/120 usuarios distintos en polling usa el stack incluido o suficientes cuentas en `USERS_JSON`. El runner pasa las credenciales al contenedor por entorno y nunca las imprime. Fuera del stack dedicado, prepara una BD de pruebas y considera el límite de login por IP.

El [informe previo](reports/reporte_carga_estres_k6.md) documenta los escenarios anteriores. Sus cifras no constituyen resultados de esta suite. La ejecución completa y las métricas del servidor son necesarias para aprobar los criterios de las tablas.

La [verificación de implementación](reports/validacion_suite_k6.md) registra las ejecuciones breves reales y el fallo detectado en colisiones.
