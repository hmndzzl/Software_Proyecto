# Evidencia de pruebas automatizadas — Sprint 10

**Fecha de ejecución local:** 27 de octubre de 2026 (America/Guatemala).  
**Revisión base:** `c480a2c` en la rama `tests/reg_int`, con el ajuste de cobertura de `app/backend/vitest.config.ts` incluido en este trabajo.  
**Entorno:** Node.js 24.1.0, Vitest 4.1, MariaDB temporal mediante Testcontainers y Chromium de Playwright. No se usó la base de datos de desarrollo ni la de producción para las pruebas de integración.

## Qué se probó

Se ejecutaron las suites completas de backend y frontend, que incluyen pruebas de los módulos añadidos o modificados en el sprint: gestión de espacios y sus fotografías, reservas y avisos, calendario, recordatorios, cuentas y bajas, coordinadores de ministros, tareas, landing y reportes. Además, se ejecutaron las seis suites de integración del backend con MariaDB real y la regresión de navegador que GitHub Actions ejecuta en el mismo workflow.

| Módulo | Pruebas representativas ejecutadas |
| --- | --- |
| Espacios y fotografías | `espacio.controller.test.ts`, `espacio.routes.test.ts`, `media.routes.test.ts`, `espacioFoto.service.test.ts`, `EspaciosPage.integration.test.tsx`, `EspacioDetallePage.integration.test.tsx`, `espacios.integration.test.ts`, `espacios.spec.ts`, `visor-imagenes.spec.ts` |
| Reservas y avisos | `reserva.controller.test.ts`, `notificacion.controller.test.ts`, `reserva-notificacion.integration.test.ts`, `confirmaciones.spec.ts` |
| Calendario y tareas | `calendario.controller.test.ts`, `tareasAsignacion.service.test.ts`, `CalendarioPage.integration.test.tsx`, `calendario.integration.test.ts`, `calendario.spec.ts`, `tareas.spec.ts` |
| Cuentas y bajas | `cuenta.controller.test.ts`, `auth.baja.test.ts`, `CuentasPage.test.tsx`, `baja-cuentas.integration.test.ts`, `baja-cuentas.spec.ts` |
| Coordinadores de ministros | `coordinadorMinistro.routes.test.ts`, `CoordinadoresMinistrosPage.test.tsx` |
| Landing, agenda y reportes | `landing.routes.test.ts`, `LandingPage.integration.test.tsx`, `reportes.routes.test.ts`, `ReportesPage.test.tsx`, `accesibilidad-publica.spec.ts` |
| Recordatorios | `recordatorios.scheduler.test.ts`, `recordatorios.integration.test.ts` |

| Suite | Archivos | Pruebas | Fallidas | Resultado |
| --- | ---: | ---: | ---: | --- |
| Backend, Vitest con cobertura | 48 | 865 | 0 | Aprobada |
| Frontend, Vitest con cobertura | 87 | 788 | 0 | Aprobada |
| Backend, integración con MariaDB | 6 | 38 | 0 | Aprobada |
| Frontend, Playwright con Chromium | 17 | 78 | 0 | Aprobada |

La integración con MariaDB incluye `api-database.integration.test.ts` (16 casos), `espacios.integration.test.ts` (4), `calendario.integration.test.ts` (6), `recordatorios.integration.test.ts` (4), `reserva-notificacion.integration.test.ts` (4) y `baja-cuentas.integration.test.ts` (4). El resultado de **38/38** se obtuvo con el mismo comando `npm run test:integration` del job `test-backend` de CI. Playwright completó **78/78** casos, incluida la auditoría de accesibilidad pública y las vistas de espacios en móvil y escritorio.

## Cobertura de código

La cobertura se midió sobre los archivos ejecutables de aplicación en `src`: **68 archivos backend** y **117 archivos frontend**. Se excluyen pruebas, declaraciones de tipos y utilidades de prueba; el punto de montaje `frontend/src/main.tsx` tampoco se instrumenta. El backend ahora incluye explícitamente los archivos `src/**/*.ts`, aun cuando ninguna prueba los importe, y CI exige al menos **80% en cada métrica**. El frontend conserva su umbral de **95% en cada métrica**.

| Métrica | Backend | Frontend | Conjunto ponderado por líneas/elementos |
| --- | ---: | ---: | ---: |
| Líneas | 94.59% (2256/2385) | 98.56% (3230/3277) | **96.89% (5486/5662)** |
| Sentencias | 94.02% (2376/2527) | 97.31% (3836/3942) | **96.03% (6212/6469)** |
| Ramas | 92.62% (1269/1370) | 95.29% (2775/2912) | **94.44% (4044/4282)** |
| Funciones | 94.90% (242/255) | 96.39% (1309/1358) | **96.16% (1551/1613)** |

El total combinado se calcula como `(cubierto backend + cubierto frontend) / (total backend + total frontend)`, sin promediar porcentajes. **Supera el 80% en las cuatro métricas.** Es cobertura del código TypeScript ejecutable de la aplicación; CSS, SQL, configuración de infraestructura y dependencias externas no forman parte del denominador. Tampoco implica que se verificó el 80% de todos los comportamientos posibles: las suites de integración y navegador aportan evidencia adicional sobre esos flujos.

## Reproducción y evidencia

Desde cada paquete (`app/backend` y `app/frontend`), ejecutar:

```sh
npm ci
npm run coverage -- --coverage.reporter=text --coverage.reporter=json-summary --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml
```

Después, desde `app/backend`: `npm run test:integration`. Desde `app/frontend`: `npx playwright install chromium` y `npm run test:regression`. También pasaron `npm run build` en ambos paquetes y `npm run lint` en frontend.

Los archivos locales de evidencia son `app/backend/reports/junit.xml`, `app/backend/reports/coverage-summary.json`, `app/backend/test-results/integration-junit.xml`, `app/frontend/reports/junit.xml`, `app/frontend/reports/coverage-summary.json`, `app/frontend/test-results/regression-junit.xml` y `app/frontend/playwright-report/`. Son generados y no se versionan.

El workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) se activa al hacer push a `main` o `develop`, y en pull requests dirigidas a esas ramas. Ejecuta cobertura y JUnit en ambos paquetes, integración con Testcontainers y regresión Playwright. Conserva los reportes de cobertura, XML, logs y regresión en los artefactos `backend-test-evidence`, `frontend-test-evidence` y `regression-evidence` durante 30 días. **Este documento registra una reproducción local; la ejecución de GitHub Actions para los cambios aún no publicados debe verificarse en el run del commit después del push.**
