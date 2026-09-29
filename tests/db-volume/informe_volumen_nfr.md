# Informe Final: Pruebas de Volumen, Inundación y Requisitos No Funcionales (Corte 2)

## 1. Herramienta y Metodología
Para realizar la validación de volumen y resistencia de la base de datos MariaDB, se implementó un entorno aislado utilizando Docker y **Sysbench** (mediante scripts personalizados en lenguaje Lua). Sysbench fue seleccionado por su capacidad de generar carga multihilo directamente sobre el motor SQL, permitiéndonos evaluar el comportamiento nativo de MariaDB independiente de los cuellos de botella del servidor backend de Node.js.

Se estructuraron tres escalas de volumen sintético para analizar la degradación progresiva de los datos:
*   **Small (Pequeña):** 1,000 reservas y 10,000 asociaciones en `persona_notificacion`.
*   **Medium (Mediana):** 10,000 reservas y 100,000 asociaciones.
*   **Large (Grande):** 100,000 reservas y 1,000,000 asociaciones.

## 2. Resultados de las Pruebas

### 2.1 Inserciones Masivas / Inundación (PI-01)
El motor de MariaDB demostró ser sumamente robusto para la ingesta de datos. Durante las pruebas de *Flood* bajo las tres escalas, el rendimiento se mantuvo estable con **~31,400 transacciones por segundo (TPS)**. La latencia del percentil 95 (p95) se mantuvo en **0.84 ms** a pesar de alcanzar el millón de registros, comprobando que no hay pérdida de datos ni contención transaccional durante las escrituras.

### 2.2 Consultas de Volumen (PV-01 y PV-02)
Se identificó una **degradación severa del rendimiento** en lecturas complejas conforme crecía el volumen de datos:
*   **Escala Small:** Latencia p95 de **4.57 ms** (17,000 consultas/s).
*   **Escala Medium:** Latencia p95 de **4,358 ms / ~4.3 segundos**.
*   **Escala Large:** Latencia p95 de **8,638 ms / ~8.6 segundos**.

## 3. Problemas y Soluciones Propuestas
**Problema:** Incumplimiento del SLA de latencia en tablas grandes (Full Table Scans).
**Causa Confirmada:** Las consultas críticas, como el cálculo de disponibilidad de espacios (`CASE WHEN EXISTS...`) y el histórico de notificaciones (`JOIN persona_notificacion ORDER BY fecha DESC`), carecen de índices compuestos que respalden los filtros.
**Solución:** 
Crear los siguientes índices en la base de datos:
```sql
CREATE INDEX idx_reserva_disponibilidad ON reserva (espacio_id, fecha, estado_reserva_id);
CREATE INDEX idx_notificacion_orden ON notificacion (fecha DESC);
```

## 4. Comparación con Pruebas Anteriores (Carga/Estrés k6)
A diferencia de las pruebas HTTP con k6, donde el cuello de botella residía en la capacidad de CPU del backend (cálculos de `bcrypt`) y el *Event Loop* de Node.js, estas pruebas de volumen aislaron el motor de base de datos.
*   En k6 con volumen base (1,000 registros), la base de datos MariaDB lograba p95 de ~4 ms y se comportó estable.
*   En Sysbench, pudimos observar el futuro del sistema: si la parroquia acumula registros históricos (>100k), la base de datos se convertirá en el nuevo cuello de botella principal, degradando los tiempos de respuesta a casi 9 segundos.

## 5. Grado de Cumplimiento de Requisitos No Funcionales (Corte 2)

| Requisito original (Corte 2) | Criterio de aceptación | Prueba y Evidencia | Estado | Acción Pendiente |
| :--- | :--- | :--- | :--- | :--- |
| **Tener un tiempo de respuesta menor a 2 segundos al realizar reserva.** | Latencia máxima < 2s | Consultas PV-01 superaron los 8 segundos en escala *Large*. | ❌ **Incumplido (A gran escala)** | Implementar índices compuestos en MariaDB para garantizar $O(\log N)$. |
| **El sistema debe de garantizar una precisión, impidiendo que se repitan tareas y salones reservados** | Validación transaccional bajo alta concurrencia | Prueba *Flood* (Sysbench) e historial de k6 (PE-RES-01). | ⚠️ **Parcialmente Cumplido** | Reforzar las llaves únicas compuestas en la tabla `reserva` para forzar bloqueos a nivel motor SQL y mitigar condiciones de carrera. |
| **Si el sistema presenta algún error, deberá mostrar claramente de que y por qué fue el error.** | Logs y rollback seguro | Logs capturados durante la inserción masiva. | ✅ **Cumplido** | Ninguna. MariaDB emite los códigos y realiza rollbacks implícitos (1452). |
| **El servidor debe disponer de al menos 10 GB de almacenamiento.** | Control del crecimiento de disco. | 1 millón de registros ocupó menos de 500 MB en disco (datos + índices). | ✅ **Cumplido** | Monitoreo a largo plazo. |

## 6. Calidad de los Requisitos y Pruebas Pendientes
**Análisis del Diseño de Requisitos:**
Los requisitos planteados en el Corte 2 presentan áreas de mejora. El SLA de "tiempo de respuesta menor a 2 segundos" es un estándar aceptable, pero no detalla la carga base ni el percentil a medir (ej. p95 vs promedio). Requisitos como "El sistema debe ser colorido y atractivo" son ambiguos y difíciles de testear de forma objetiva sin métricas claras de UX/UI.

**Pruebas Faltantes para el 100% de cobertura no funcional:**
1.  **Pruebas de Seguridad y Penetración:** Validación de ataques contra contraseñas e inyección SQL.
2.  **Pruebas Visuales Multi-dispositivo (Portabilidad):** Comprobación real en Safari, Firefox y dispositivos móviles con resoluciones atípicas.
3.  **Auditoría de Accesibilidad Legal (ISO 27001):** Revisión de privacidad de datos y visibilidad de términos y condiciones.
