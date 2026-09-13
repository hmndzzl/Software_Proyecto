# Plataforma Administrativa — Parroquia San Pedro Nolasco

Sistema web para la gestión interna de la Parroquia San Pedro Nolasco (Guatemala). Centraliza tareas y turnos de ministros, reservas de salones, eventos, grupos y notificaciones, reemplazando flujos manuales basados en Excel y WhatsApp.

> Estado: **Sprint 7 completado** (8 de septiembre de 2026). Las funcionalidades principales están implementadas; quedan pendientes de seguridad y control de acceso descritos en [Pendientes técnicos](#pendientes-técnicos).

## Funcionalidades

- Autenticación JWT con access token y refresh token en cookie `HttpOnly`, rutas protegidas y jerarquía de roles.
- Gestión de reservas y eventos: solicitud, edición, aprobación/rechazo, cancelación propia y validación de conflictos de horario.
- Disponibilidad de espacios por fecha y horario.
- Gestión de ministros y tareas: asignación, desasignación, edición, reasignación inline y validación de solapamientos.
- Alerta de rotación (HU-09): avisa si el ministro está indisponible o supera el tope mensual; informa, no bloquea la asignación.
- Cambio de turno entre ministros (HU-23): solicitud, aceptación/rechazo y reasignación automática del titular al aceptar.
- Notificaciones con polling, confirmación/excusa de asistencia y aviso de inasistencia al coordinador.
- Calendario semanal, perfil de usuario, eventos, grupos y páginas de error/carga/estado vacío reutilizables.
- UI responsive con sistema de diseño litúrgico, tablas ordenables y formato uniforme de fechas/horas.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Axios |
| Backend | Node.js, Express 4, TypeScript |
| Persistencia | MariaDB 11 con `mysql2` |
| Contenedores | Docker Compose |
| Pruebas | Vitest y Grafana k6 |
| Automatización | GitHub Actions |
| Producción | DigitalOcean Droplet |

## Equipo — Grupo 3

| Nombre | Carné |
|---|---:|
| Diego André Calderón Salazar | 241263 |
| Pedro Julio Caso Tzunun | 241286 |
| Javier Sebastián Alvarado Monzón | 24546 |
| Hugo Méndez Lee | 241265 |
| José Miguel Rosas Guerra | 241274 |

## Inicio rápido

### Requisitos

- Docker y Docker Compose
- Un archivo `app/.env` creado desde `app/.env.example` y completado con las credenciales del entorno.

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
cp .env.example .env
docker compose up --build -d
```

El primer arranque crea el esquema y carga las semillas desde `database/init/`. Para detener los servicios:

```bash
docker compose down
```

Para recrear la base de datos local desde cero (elimina el volumen y todos sus datos):

```bash
docker compose down -v
docker compose up --build -d
```

### Servicios locales

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Adminer | `http://localhost:${ADMINER_PORT}` |

Adminer usa sistema `MySQL`, servidor `mariadb` y las credenciales definidas en `.env`.

### Desarrollo sin Docker

```bash
cd app/backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

## Variables de entorno

Copiar `app/.env.example` como `app/.env`. Las variables requeridas son:

| Grupo | Variables |
|---|---|
| Frontend | `VITE_API_URL` |
| API | `PORT`, `CORS_ORIGIN` |
| MariaDB | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_ROOT_PASSWORD` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` |
| Herramientas | `ADMINER_PORT` |

No versionar secretos ni valores de producción.

## Roles

| ID | Rol | Acciones principales |
|---:|---|---|
| 1 | Sacerdote | Gestiona reservas y espacios; registra usuarios. |
| 2 | Coordinador de Ministros | Gestiona a sus ministros, tareas y notificaciones a sus subordinados. |
| 3 | Coordinador de Grupos | Gestiona su grupo y solicita reservas. |
| 4 | Ministro | Consulta sus servicios, responde notificaciones y solicita cambios de turno. |
| 5 | Admin | Acceso jerárquico completo. |

```
Admin (5)          → [5, 1, 2, 3, 4]
Sacerdote (1)      → [1, 2, 3, 4]
CoordMinistros (2) → [2, 4]
CoordGrupos (3)    → [3]
Ministro (4)       → [4]
```

Los grupos parroquiales no tienen cuentas propias: su coordinador comunica los avisos a sus integrantes por los medios acordados.

## Rutas de la aplicación

| Ruta | Descripción |
|---|---|
| `/dashboard` | Resumen y accesos rápidos por rol. |
| `/ministros` | Directorio y disponibilidad de ministros. |
| `/tareas` | Tareas, asignaciones y reasignación del responsable. |
| `/calendario` | Calendario semanal de servicios. |
| `/cambios-turno` | Solicitudes y respuestas de cambios de turno. |
| `/reservas`, `/mis-reservas` | Gestión e historial de reservas. |
| `/espacios`, `/espacios/:id` | Espacios y disponibilidad por horario. |
| `/eventos`, `/grupos` | Administración de eventos y grupos. |
| `/notificaciones` | Bandeja, asistencia e inasistencias. |
| `/perfil` | Perfil del usuario autenticado. |

## API

Todas las rutas, excepto las de autenticación, requieren `Authorization: Bearer <token>`.

| Recurso | Operaciones principales |
|---|---|
| `/api/auth` | `POST /login`, `/refresh`, `/logout`, `/register` |
| `/api/tareas` | CRUD, `POST/DELETE /asignar`, `PUT /asignar` para reasignar responsable |
| `/api/cambios-turno` | `GET/POST /`, `PUT /:id/responder` |
| `/api/personas` | Directorio, perfil, encargados de evento y `PATCH /:id/disponibilidad` |
| `/api/reservas` | Crear/listar/editar, mis reservas y `PUT /:id/estado` |
| `/api/espacios` | CRUD y disponibilidad con `fecha`, `hora_inicio`, `hora_fin` |
| `/api/grupos`, `/api/eventos` | CRUD; eventos incluye `/reservas-disponibles` |
| `/api/notificaciones` | Bandeja, destinatarios, lectura, asistencia, excusa e inasistencia |

Documentación técnica detallada, contratos de negocio y esquema completo: [`CLAUDE.md`](CLAUDE.md).

## Pruebas

### Unitarias

```bash
cd app/backend
npm test
npm run coverage

cd ../frontend
npm test
npm run coverage
```

Las pruebas backend usan mocks de Vitest para MariaDB. El workflow `.github/workflows/ci.yml` ejecuta la cobertura backend en pull requests a `main` y `develop`.

### Carga y estrés

Los cuatro escenarios de Grafana k6 cubren login, disponibilidad de espacios, polling de notificaciones y un flujo combinado.

```bash
./tests/k6/run-tests.sh all
./tests/k6/run-tests.sh login
./tests/k6/run-tests.sh espacios
./tests/k6/run-tests.sh notificaciones
./tests/k6/run-tests.sh combined
```

También puede ejecutarse desde `app/backend` con `npm run test:k6:all`. El runner emplea k6 instalado localmente o la imagen `grafana/k6`; los resultados se guardan en `tests/k6/results/` y el informe está en [`tests/k6/reports/reporte_carga_estres_k6.md`](tests/k6/reports/reporte_carga_estres_k6.md).

Resultados Sprint 7: más de 26,400 solicitudes sin errores HTTP/5xx; espacios alcanzó 148.15 req/s y notificaciones 137.92 req/s. Login se degrada con carga alta por `bcrypt`, por lo que rate limiting es la siguiente mejora prioritaria.

## Estructura

```text
app/
├── frontend/src/
│   ├── components/     # Layout y primitivos UI
│   ├── context/        # Autenticación y errores globales
│   ├── modules/        # Espacios, reservas, tareas, eventos, grupos, notificaciones, cambios
│   ├── pages/          # Rutas de la interfaz
│   └── utils/          # Roles, fechas y estados de reserva
├── backend/src/
│   ├── controllers/    # Lógica de negocio + pruebas unitarias
│   ├── routes/         # Endpoints Express
│   ├── middlewares/    # JWT y RBAC
│   └── config/         # Base de datos, roles y estados
├── database/init/      # Schema y semillas MariaDB
└── docker-compose.yml
tests/k6/               # Scripts, runner e informe de rendimiento
```

## Despliegue y flujo Git

`deploy.yml` despliega al Droplet de DigitalOcean con cada `push` a `main`. El entorno de producción usa HTTPS configurado en la infraestructura. Se recomienda trabajar mediante PRs:

```text
main ← código desplegable
└── develop ← integración
    └── feature/<nombre> ← trabajo individual
```

El workflow de CI y el de despliegue son independientes. Confirmar que GitHub tenga un *required check* configurado antes de asumir que CI bloquea una fusión.

## Pendientes técnicos

- Restringir por RBAC/ownership las mutaciones de grupos y las rutas de tareas que hoy solo validan autenticación.
- Eliminar secretos JWT de respaldo y validar variables de entorno al iniciar.
- Incorporar lint, build y pruebas frontend al CI; ampliar cobertura de páginas, formularios y `useSortableTable`.
- Implementar HU-15 (check-in QR), HU-30 (avisar al coordinador por cambio de turno), HU-31 (periodos de ausencia) y HU-32 (portal público).
- Mejorar la navegación de reserva/asistencia observada en las pruebas UX y proteger login con rate limiting.

## Documentación académica

Los informes de Sprint 6 y Sprint 7, el Plan Maestro de Pruebas y la exportación de Jira se mantienen fuera del repositorio. El estado técnico y el historial detallado del proyecto están en [`CLAUDE.md`](CLAUDE.md).

## Licencia

Proyecto académico para CC3091 — Ingeniería de Software 2, Universidad del Valle de Guatemala.
