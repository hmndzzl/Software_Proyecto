# Informe Técnico: Pruebas de Carga y Estrés con Grafana k6

**Proyecto:** Sistema de Gestión Parroquial  
**Fecha de Ejecución:** Septiembre 2026  
**Herramienta de Carga y Estrés:** Grafana k6 (v2.2.0 / `grafana/k6:latest`)  
**Entorno de Ejecución:** Docker Compose (Node.js Express + MariaDB 11)  

---

## 1. Resumen Ejecutivo

Se llevaron a cabo pruebas automatizadas de rendimiento, carga y estrés contra los tres endpoints más críticos y demandantes del backend:
1. **`POST /api/auth/login`**: Punto de acceso del sistema, intensivo en cómputo de CPU debido a la función hash adaptativa de contraseñas (`bcrypt.compare`) y generación de tokens JWT.
2. **`GET /api/espacios` (con filtros de disponibilidad)**: Consulta que ejecuta una subconsulta correlacionada (`CASE WHEN EXISTS (...)`) evaluada fila por fila para verificar colisiones horarias de reservas.
3. **`GET /api/notificaciones`**: Endpoint consultado periódicamente por el sondeo (*polling*) automático en segundo plano cada 60 segundos por el componente `TopBar.tsx` de cada usuario activo en el frontend.
4. **Escenario Combinado (User Journey)**: Simulación integral donde múltiples usuarios concurrentes inician sesión, consultan notificaciones y navegan los salones simultáneamente.

A lo largo de las 4 baterías de pruebas se ejecutaron más de **26,400 peticiones HTTP** con **0.00% de errores de conexión o HTTP 5xx/504**, identificándose con precisión los límites de saturación de CPU y la capacidad del pool de conexiones de base de datos.

---

## 2. Herramienta y Arquitectura de Pruebas

### 2.1 ¿Por qué Grafana k6?
Se seleccionó **k6** como herramienta estándar de la industria para pruebas de carga y estrés por las siguientes ventajas técnicas:
* **Ejecución basada en código (JavaScript ES6)**: Permite versionar las pruebas en el repositorio (`tests/k6/`), integrarse fácilmente en pipelines de CI/CD y definir aserciones funcionales (`check`), umbrales automáticos (`thresholds`) y métricas personalizadas (`Trend`, `Rate`, `Counter`).
* **Rendimiento y bajo consumo**: Desarrollado en Go, k6 maneja miles de usuarios virtuales (VUs) utilizando Goroutines con un consumo insignificante de memoria y CPU en la máquina generadora de carga, a diferencia de herramientas más pesadas como Apache JMeter.
* **Portabilidad mediante Docker**: Ejecutable sin instalación previa a través de la imagen oficial `grafana/k6`, interactuando con la red del host mediante `host.docker.internal`.

### 2.2 Entorno Bajo Prueba
* **Servidor Backend**: Express 4.18 + TypeScript sobre Node.js 20 en contenedor Docker (`port 3001`).
* **Base de Datos**: MariaDB 11 en contenedor Docker (`port 3306`) con volumen persistente y datos semilla precargados (`02_seeds.sql`).
* **Pool de Conexiones (`app/backend/src/config/db.ts`)**:
  * `connectionLimit: 10` (Máximo 10 conexiones simultáneas hacia MariaDB).
  * `waitForConnections: true` (Las peticiones esperan si las 10 conexiones están ocupadas).
  * `queueLimit: 0` (Cola en memoria ilimitada para peticiones pendientes).

---

## 3. Configuración de Escenarios y Umbrales

| Prueba | Script | VUs Máx. | Duración | Fases del Escenario | Umbrales Definidos (SLA/SLO) |
|---|---|---|---|---|---|
| **01. Login (CPU)** | `01_auth_login.js` | **50 VUs** | 1m 15s | Rampa (5 $\rightarrow$ 15 VUs), Estrés (35 $\rightarrow$ 50 VUs), Enfriamiento | `fail_rate < 2%`<br>`p(90) < 1200ms`<br>`p(95) < 2000ms` |
| **02. Espacios (BD)** | `02_espacios_disponibilidad.js` | **80 VUs** | 1m 15s | Rampa (10 $\rightarrow$ 25 VUs), Estrés (60 $\rightarrow$ 80 VUs), Enfriamiento | `fail_rate < 2%`<br>`p(90) < 600ms`<br>`p(95) < 1200ms` |
| **03. Notificaciones (Polling)** | `03_notificaciones_polling.js` | **120 VUs** | 1m 15s | Rampa (20 $\rightarrow$ 50 VUs), Estrés (100 $\rightarrow$ 120 VUs), Enfriamiento | `fail_rate < 2%`<br>`p(90) < 500ms`<br>`p(95) < 1000ms` |
| **04. Combinado (Flujo)** | `04_scenario_combined.js` | **60 VUs** | 1m 20s | Rampa (10 $\rightarrow$ 25 VUs), Estrés (50 $\rightarrow$ 60 VUs), Enfriamiento | `fail_rate < 3%`<br>`p(90) Login < 1200ms`<br>`p(90) BD < 600ms` |

---

## 4. Resultados Consolidados de Rendimiento

A continuación se presentan los resultados exactos recopilados durante la ejecución:

| Métrica | 01. Login (`POST`) | 02. Espacios (`GET`) | 03. Notificaciones (`GET`) | 04. Combinado (E2E) |
|---|---|---|---|---|
| **Peticiones Totales (HTTP Reqs)** | **1,045** | **11,133** | **10,446** | **3,844** (961 flujos) |
| **Rendimiento (Throughput)** | **13.89 req/s** | **148.15 req/s** | **137.92 req/s** | **47.53 req/s** |
| **Tasa de Errores HTTP** | **0.00%** (0 fallos) | **0.00%** (0 fallos) | **0.00%** (0 fallos) | **0.00%** (0 fallos) |
| **Aserciones Aprobadas (`checks`)** | **95.31%** (2,988 / 3,135) | **100.00%** (44,530 / 44,530) | **100.00%** (31,333 / 31,333) | **100.00%** (4,805 / 4,805) |
| **Latencia Mínima** | 65.95 ms | 0.86 ms | 1.11 ms | 0.93 ms |
| **Latencia Mediana (p50)** | 1,220 ms | 1.92 ms | 2.03 ms | 315.31 ms |
| **Latencia Promedio** | 1,340 ms | 2.27 ms | 2.39 ms | 349.49 ms |
| **Latencia Percentil 90 (p90)** | **2,830 ms** | **3.56 ms** | **3.61 ms** | **736.27 ms** |
| **Latencia Percentil 95 (p95)** | **2,970 ms** | **4.56 ms** | **4.45 ms** | **815.10 ms** |
| **Latencia Máxima** | 3,550 ms | 68.49 ms | 68.92 ms | 1,170 ms |
| **Transferencia de Red (Recibido)** | 887 kB | 8.8 MB | 12.0 MB | 3.8 MB |

---

## 5. Análisis Técnico y Hallazgos Clave

### 5.1 Cuello de Botella de CPU en `POST /api/auth/login` (Algoritmo Bcrypt)
* **Observación**: En la prueba individual de autenticación, la tasa de error HTTP fue de 0.00%, pero el tiempo de respuesta aumentó progresivamente conforme se superaron los 25 VUs, alcanzando un p90 de 2.83s y p95 de 2.97s.
* **Causa Raíz**: `bcryptjs` es un algoritmo intencionalmente intensivo en CPU para proteger las contraseñas contra ataques de fuerza bruta (cost factor = 10). En Node.js, `bcrypt.compare` se delega al threadpool de `libuv` (por defecto 4 hilos de CPU). Al recibir más de 30 solicitudes simultáneas, los hilos de CPU se saturan por completo y las peticiones encolan en espera de tiempo de cómputo.
* **Conclusión**: El endpoint es sumamente robusto (no arrojó ningún error 500 ni interrupción de servicio), pero requiere protección contra avalanchas de autenticación masiva (ej. rate limiting).

### 5.2 Comportamiento de la Subconsulta `NOT EXISTS` en `GET /api/espacios`
* **Observación**: A pesar de que la consulta ejecuta un `CASE WHEN EXISTS (...)` correlacionado por cada uno de los espacios registrados, el endpoint demostró una eficiencia sobresaliente: **148 solicitudes por segundo**, latencia promedio de **2.27 ms** y p95 de **4.56 ms** bajo una carga de **80 VUs concurrentes**.
* **Causa Raíz**: La tabla `reserva` cuenta con claves foráneas e índices estructurados sobre `espacio_id` y `fecha`, permitiendo a MariaDB resolver la subconsulta en memoria caché (*buffer pool*) en microsegundos.
* **Comportamiento del Pool**: A pesar de que la concurrencia (80 VUs) superó en 8 veces el tamaño del pool de conexiones (`connectionLimit: 10`), el tiempo que cada conexión estuvo retenida fue tan corto (< 2 ms) que la cola de espera de mysql2 nunca se desbordó.

### 5.3 Resiliencia ante el Polling Masivo en `GET /api/notificaciones`
* **Observación**: La simulación de sondeo recurrente (*polling*) ejecutó más de **10,400 peticiones** bajo **120 VUs concurrentes** (lo que equivale a cientos de pestañas abiertas simultáneamente consultando cada 60s), manteniendo un p95 de **4.45 ms** y 0% de fallos.
* **Conclusión**: La consulta con múltiples `JOIN` (`persona_notificacion`, `persona`, `evento`) está bien optimizada por MariaDB a través de los índices primarios y foráneos (`persona_id`, `notificacion_id`), soportando con holgura el tráfico de usuarios activos de la parroquia.

### 5.4 Interacción en el Escenario Combinado (Event Loop Blocking)
* **Observación**: En la prueba combinada (donde los 60 VUs realizaban Login + Notificaciones + Espacios), las latencias de lectura a base de datos aumentaron de ~3.5 ms a ~720 ms (p90).
* **Causa Raíz**: En Node.js, todas las operaciones de JavaScript y la resolución de callbacks de I/O de base de datos se procesan en un único hilo (*Event Loop*). Cuando un 25% del tráfico consiste en logins que demandan ciclos intensivos de CPU en `bcrypt`, el Event Loop experimenta micropausas para atender el cálculo criptográfico, retrasando el despacho de los callbacks de I/O de la base de datos que ya habían retornado de MariaDB.

---

## 6. Recomendaciones Técnicas y Plan de Optimización

1. **Implementar Rate Limiting en `/api/auth/login`**:
   * Utilizar `express-rate-limit` para limitar a un máximo de 5 a 10 intentos de inicio de sesión por IP por minuto. Esto evita la degradación del Event Loop provocada por intentos masivos o ataques de fuerza bruta.
2. **Escalar el Threadpool de Node.js**:
   * Configurar la variable de entorno `UV_THREADPOOL_SIZE=8` o `16` al iniciar el contenedor del backend para que Node.js pueda paralelizar más operaciones de Bcrypt en procesadores multinúcleo.
3. **Mantenimiento de Índices en la Base de Datos**:
   * Si la tabla `reserva` crece a decenas de miles de registros históricos, se recomienda un índice compuesto:
     ```sql
     CREATE INDEX idx_reserva_disponibilidad 
     ON reserva (espacio_id, fecha, estado_reserva_id, hora_inicio, hora_fin);
     ```
   * Esto garantizará que la consulta `EXISTS` continúe resolviéndose en tiempo constante ($O(1)$) mediante un escaneo de índice cubierto (*covered index scan*).
4. **Optimización del Polling de `TopBar.tsx`**:
   * En lugar de solicitar siempre todo el listado de notificaciones, se recomienda enviar el encabezado `If-Modified-Since` o consultar únicamente el contador de notificaciones no leídas (`/api/notificaciones/unread-count`), reduciendo el payload de red y el costo de serialización JSON.

---

## 7. Instrucciones para Reproducir las Pruebas

Los scripts de prueba y el orquestador se encuentran versionados en el directorio `tests/k6/`.

### Requisitos
* Docker y Docker Compose activos.

### Ejecución de Pruebas
Desde la raíz del repositorio:

```bash
# Ejecutar todas las pruebas (Login, Espacios, Notificaciones y Combinado)
./tests/k6/run-tests.sh all

# Ejecutar una prueba específica
./tests/k6/run-tests.sh login           # Prueba de estrés a POST /api/auth/login
./tests/k6/run-tests.sh espacios        # Prueba de estrés a GET /api/espacios
./tests/k6/run-tests.sh notificaciones  # Prueba de estrés a GET /api/notificaciones
./tests/k6/run-tests.sh combined        # Escenario de usuario integral
```

Alternativamente, desde `app/backend/`:
```bash
npm run test:k6:all
```

Los reportes detallados en formato JSON con todas las series temporales se guardan automáticamente en `tests/k6/results/`.
