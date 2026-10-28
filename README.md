# Plataforma Administrativa — Parroquia San Pedro Nolasco

Sistema web para la gestión operativa y la comunicación de la Parroquia San Pedro Nolasco, Guatemala. Centraliza reservas, espacios, agenda, tareas de ministros, grupos, notificaciones, cuentas y reportes; además ofrece un portal público con contenido editable, agenda y formulario de contacto.

**Estado del proyecto:** Sprint 10 completado, con validación funcional, automatizada, de rendimiento y de seguridad realizada el 27 de octubre de 2026.

**Producción:** [parroquiasanpedronolasco.org.gt](https://parroquiasanpedronolasco.org.gt/)

## Funcionalidades

### Portal público

- Landing institucional administrable por Sacerdote y Administrador.
- Agenda pública de eventos confirmados y marcados para publicación.
- Formulario de contacto con límite de solicitudes y bandeja interna de mensajes.
- Diseño adaptable, navegación pública y auditoría automatizada de accesibilidad.

### Operación parroquial

- Reservas de espacios con aprobación, rechazo, cancelación, historial de decisiones, cantidad de asistentes y prevención de colisiones al aprobar.
- Administración de espacios, disponibilidad por horario, fotografías y vista de detalle.
- Tareas y servicios de ministros con asignación, reasignación, conflictos de horario, disponibilidad por periodos y relación opcional con eventos.
- Calendario unificado semanal y mensual para tareas y eventos.
- Gestión de coordinadores y ministros, grupos parroquiales y eventos.
- Notificaciones individuales, grupales y globales; confirmación o excusa de asistencia, papelera, búsqueda por fecha y avisos automáticos.
- Cambios de turno, registro de ausencias y recordatorios anticipados de servicios.
- Reportes de reservas y tareas en Excel, PDF y CSV, con límites de periodo, filas y frecuencia.
- Gestión del perfil, preferencias visuales y cierre de sesión entre pestañas.

### Identidad y acceso

- Inicio de sesión con Clerk en producción y compatibilidad temporal con JWT propio.
- Cinco roles con autorización en frontend y backend: Sacerdote, Coordinador de Ministros, Coordinador de Grupos, Ministro y Administrador.
- Aprobación, rechazo y baja de cuentas; los cambios de estado y rol se verifican contra la base de datos en operaciones sensibles.
- Límite de 10 intentos de inicio de sesión por IP cada 15 minutos.
- Helmet, CORS con lista de orígenes, cookies seguras y contraseñas con hash bcrypt.

## Tecnologías

| Capa | Tecnologías principales |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, React Router, Axios, Clerk |
| Backend | Node.js, Express 4, TypeScript, Clerk Express, JWT |
| Persistencia | MariaDB 11, `mysql2` |
| Archivos y reportes | Multer, Sharp, PDFKit, write-excel-file |
| Pruebas | Vitest, Supertest, Testcontainers, Playwright, axe-core, Grafana k6 |
| Infraestructura | Docker Compose, Nginx, GitHub Actions, DigitalOcean |

## Inicio rápido con Docker

### Requisitos

- Docker con Docker Compose.
- Git.
- Puertos `5173`, `3001` y el puerto elegido para Adminer disponibles.

### Instalación

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
cp .env.example .env
```

Completar `app/.env` antes de iniciar. Para desarrollo local, `VITE_API_URL` suele ser `http://localhost:3001`, `CORS_ORIGIN` debe incluir `http://localhost:5173` y los secretos JWT deben ser valores largos y distintos.

```bash
docker compose up --build -d
docker compose ps
```

El primer arranque inicializa el esquema y las semillas desde `app/database/init/`.

| Servicio | Dirección local |
| --- | --- |
| Portal y aplicación | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:3001](http://localhost:3001) |
| Estado del backend | [http://localhost:3001/health](http://localhost:3001/health) |
| Adminer | `http://localhost:${ADMINER_PORT}` |

Para detener los servicios:

```bash
docker compose down
```

`docker compose down -v` también elimina la base local. Úselo únicamente cuando se quiera reconstruir el entorno desde cero.

## Variables de entorno

La plantilla se encuentra en [`app/.env.example`](app/.env.example).

| Grupo | Variables |
| --- | --- |
| Frontend | `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY` |
| Backend | `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `FRONTEND_URL` |
| MariaDB | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_ROOT_PASSWORD` |
| Sesión JWT | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` |
| Clerk | `CLERK_SECRET_KEY` |
| Correo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Herramientas | `ADMINER_PORT`, `ALLOWED_HOSTS` |

No se deben versionar archivos `.env`, credenciales, tokens ni datos de producción.

## Desarrollo sin Docker

Se necesita una instancia de MariaDB accesible con el esquema del proyecto.

```bash
cd app/backend
npm ci
npm run dev
```

En otra terminal:

```bash
cd app/frontend
npm ci
npm run dev
```

### Comandos principales

| Paquete | Comando | Uso |
| --- | --- | --- |
| Backend | `npm run dev` | API con recarga en desarrollo |
| Backend | `npm run build` | Compilación TypeScript |
| Backend | `npm test` | Pruebas Vitest |
| Backend | `npm run coverage` | Pruebas y cobertura |
| Backend | `npm run test:integration` | Integración con MariaDB temporal mediante Testcontainers |
| Frontend | `npm run dev` | Servidor Vite |
| Frontend | `npm run build` | TypeScript y build de producción |
| Frontend | `npm run lint` | ESLint sin advertencias permitidas |
| Frontend | `npm test` | Pruebas Vitest |
| Frontend | `npm run coverage` | Pruebas y cobertura |
| Frontend | `npm run test:regression` | Regresión en Chromium con Playwright |

## Arquitectura

```text
Navegador
  ├── portal público: / y /agenda
  └── aplicación protegida por rol
          │
          ▼
React + Vite ── HTTP/JSON ── Express
                              ├── autenticación Clerk/JWT y RBAC
                              ├── reglas de reservas, tareas y avisos
                              ├── generación de reportes y procesamiento de imágenes
                              └── MariaDB
```

```text
app/
├── frontend/
│   ├── src/api/             # Cliente y contratos HTTP
│   ├── src/auth/            # Integración y sincronización con Clerk
│   ├── src/components/      # Layout y componentes compartidos
│   ├── src/context/         # Sesión, errores y mensajes
│   ├── src/pages/           # Portal y módulos de la aplicación
│   └── tests/regression/    # Playwright y accesibilidad
├── backend/
│   ├── src/controllers/     # Reglas de negocio
│   ├── src/middlewares/     # Autenticación, límites y carga de archivos
│   ├── src/routes/          # API REST
│   ├── src/services/        # Persistencia y procesos programados
│   └── tests/integration/   # Integración con MariaDB real temporal
├── database/
│   ├── init/                # Instalaciones nuevas
│   └── migrations/          # Actualización de bases existentes
└── docker-compose*.yml

tests/k6/                    # Carga, estrés, spike y soak
docs/                        # Contratos y evidencia por historia/sprint
```

## Acceso por rol

| Rol | Capacidades principales |
| --- | --- |
| Administrador | Acceso jerárquico completo, cuentas, contenido público, reportes y configuración |
| Sacerdote | Reservas, espacios, ministros, cuentas, contenido público, contactos y reportes |
| Coordinador de Ministros | Ministros asignados, tareas, notificaciones y reporte de tareas |
| Coordinador de Grupos | Grupos, espacios y solicitudes de reserva |
| Ministro | Sus tareas, calendario, notificaciones, cambios de turno y ausencias |

La autorización efectiva se valida en el backend. Ocultar una opción en la interfaz no sustituye esa comprobación.

## Rutas principales

### Públicas

| Ruta web | API relacionada | Descripción |
| --- | --- | --- |
| `/` | `GET /api/public/landing` | Landing institucional |
| `/agenda` | `GET /api/public/agenda` | Próximas actividades públicas |
| Formulario de contacto | `POST /api/contacto` | Envío público limitado por IP |

### Aplicación protegida

`/dashboard`, `/ministros`, `/ministros/coordinadores`, `/tareas`, `/reportes`, `/reservas`, `/mis-reservas`, `/grupos`, `/espacios`, `/eventos`, `/calendario`, `/cambios-turno`, `/ausencias`, `/notificaciones`, `/cuentas`, `/perfil`, `/configuracion`, `/contenido-publico` y `/mensajes-contacto`.

La API REST utiliza los prefijos `/api/auth`, `/api/personas`, `/api/tareas`, `/api/calendario`, `/api/reservas`, `/api/espacios`, `/api/grupos`, `/api/eventos`, `/api/notificaciones`, `/api/cambios-turno`, `/api/ausencias`, `/api/cuentas`, `/api/landing`, `/api/reportes`, `/api/coordinadores-ministros`, `/api/contacto` y `/api/public`.

## Base de datos y migraciones

Las instalaciones nuevas reciben el esquema actual mediante `app/database/init/`. Para una base existente, aplicar en orden los archivos pendientes de [`app/database/migrations/`](app/database/migrations/) antes de desplegar el backend correspondiente.

Las migraciones no se ejecutan otra vez por reconstruir contenedores con un volumen existente. Se debe respaldar la base y aplicar únicamente las migraciones que todavía no estén registradas en el entorno.

## Pruebas

La validación previa a la entrega del 27 de octubre de 2026 registró:

| Suite | Resultado |
| --- | ---: |
| Vitest frontend | 794/794 |
| Vitest backend | 872/872 |
| Integración backend con MariaDB | 39/39 |
| Regresión Playwright y accesibilidad pública | 78/78 |
| Escenarios Grafana k6 | 12/12 |

La última medición documentada alcanzó 98,33 % de cobertura de líneas en frontend y 94,60 % en backend. El soak de 30 minutos completó 167 000 solicitudes medidas sin errores HTTP.

Para ejecutar carga y estrés sobre el stack efímero independiente:

```bash
docker compose -f tests/k6/docker-compose.yml up -d --build --wait
K6_STACK=true ./tests/k6/run-tests.sh all load
K6_STACK=true ./tests/k6/run-tests.sh all stress
docker compose -f tests/k6/docker-compose.yml down
```

Evidencia y criterios:

- [Validación previa a la entrega](docs/sprint10/validacion-preentrega-2026-10-27.md)
- [Evidencia de pruebas automatizadas](docs/sprint10/pruebas-automatizadas.md)
- [Pruebas de carga y estrés](tests/k6/README.md)
- [Pruebas de seguridad del despliegue](docs/sprint10/pruebas-seguridad-despliegue.md)

La revisión de seguridad confirmó el límite del login, CORS, HTTPS y las cabeceras del API. Mantiene un hallazgo medio: el HTML público servido por Nginx todavía necesita CSP, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.

## CI/CD y producción

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en pushes y pull requests de `main` y `develop`. Compila, analiza y prueba el frontend; ejecuta cobertura e integración del backend; y corre la regresión de navegador. Los reportes se conservan como artefactos durante 30 días.

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) despliega cada push a `main` en un Droplet de DigitalOcean. Construye las imágenes antes de sustituir contenedores, espera los health checks y restaura el commit anterior si el despliegue no queda saludable. CI y despliegue son workflows independientes, por lo que la protección de `main` debe exigir los checks de CI en la configuración de GitHub.

```text
main        ← producción
└── develop ← integración
    └── feature/*, fix/*, test/*, docs/*
```

## Documentación destacada

| Tema | Documento |
| --- | --- |
| Agenda pública y publicación | [docs/hu32/agenda-publica.md](docs/hu32/agenda-publica.md) |
| Contenido editable de la landing | [docs/hu32/contenido-landing.md](docs/hu32/contenido-landing.md) |
| Ausencias | [docs/hu31/README.md](docs/hu31/README.md) |
| Calendario unificado | [docs/d4/calendario-unificado.md](docs/d4/calendario-unificado.md) |
| Coordinadores y ministros | [docs/sprint10/coordinadores-ministros.md](docs/sprint10/coordinadores-ministros.md) |
| Disponibilidad por periodos | [docs/sprint10/disponibilidad-periodos.md](docs/sprint10/disponibilidad-periodos.md) |
| Recordatorios de servicios | [docs/sprint10/recordatorios-servicios.md](docs/sprint10/recordatorios-servicios.md) |
| Notificaciones por fecha | [docs/sprint10/notificaciones-hora.md](docs/sprint10/notificaciones-hora.md) |

## Equipo — Grupo 3

| Nombre | Carné |
| --- | ---: |
| Diego André Calderón Salazar | 241263 |
| Pedro Julio Caso Tzunun | 241286 |
| Javier Sebastián Alvarado Monzón | 24546 |
| Hugo Méndez Lee | 241265 |
| José Miguel Rosas Guerra | 241274 |

## Licencia

Proyecto académico de Ingeniería de Software, Universidad del Valle de Guatemala, 2026.
