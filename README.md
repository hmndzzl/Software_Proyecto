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
| Capa | Tecnología | Versión |

|---|---|---|
| Frontend | React + Vite + TypeScript | React 18, Vite 5 |
| Backend | Express + TypeScript | Express 4 |
| Base de datos | MariaDB | 11 |
| Contenedores | Docker + Docker Compose | — |
| Autenticación | JWT (jsonwebtoken) doble token | — |
| CI/CD | GitHub Actions | — |
| Infraestructura | DigitalOcean Droplet | Ubuntu |
| Pruebas unitarias | Vitest | backend + frontend |
| Fuentes | Cinzel + Noto Serif | Google Fonts |

## Inicio rápido

### Requisitos

- Docker y Docker Compose
- Un archivo `app/.env` creado desde `app/.env.example` y completado con las credenciales del entorno.

### Sprint 5 (completado)

#### HU-22 — Confirmación de Asistencia
- Ministro confirma asistencia directamente desde la notificación del recordatorio
- Backend: columnas de confirmación en `persona_notificacion`, `PUT /api/notificaciones/:id/confirmar` y `PUT /api/notificaciones/:id/asistencia`
- Frontend: botón "Confirmar asistencia" en `NotificacionRow` (dropdown TopBar y `/notificaciones`); Badge "Asistencia confirmada" cuando ya se confirmó

#### HU-08 — Reducir Errores de Asignación
- Validación de conflicto de horario al asignar una tarea a un ministro: `409 Conflict` si el ministro ya tiene otra tarea asignada que se solapa en fecha/hora (`asignarTarea` en `tarea.controller.ts`)
- Frontend: `AsignarTareaForm` muestra aviso de conflicto antes de enviar la asignación

#### Pruebas Unitarias
- Framework: **Vitest** (backend y frontend)
- `app/backend`: tests de `auth.controller.ts`
- `app/frontend`: tests de componentes UI (`src/components/ui/__tests__`)
- `npm test` corre la suite en cada paquete (`app/backend`, `app/frontend`)

#### Migración de infraestructura
- Despliegue movido de Azure VM a **Droplet de DigitalOcean** (`.github/workflows/deploy.yml`, SSH + `docker compose up -d --build` en cada push a `main`)

---

### Sprint 4 (completado)

#### Notificaciones en tiempo real
- Campana en `TopBar` con polling cada 60s, badge de no-leídas, dropdown con últimas 5
- Auto-notificación al asignar una tarea a un ministro

#### Calendario semanal de ministros (HU-03/HU-07)
- `CalendarioPage` en `/calendario`: grid de 7 columnas (lun-dom), navegación semana anterior/siguiente
- `GET /api/tareas` ampliado con filtros `fecha_inicio`, `fecha_fin`, `persona_id`

#### Edición de perfil
- `PerfilPage` en `/perfil`: editar nombre, correo, contraseña (y rol, solo Admin)
- `PUT /api/personas/:id`

#### Disponibilidad dinámica de espacios (HU-29)
- Selector de fecha/hora en `EspaciosPage`, badge Disponible/Ocupado calculado por `GET /api/espacios?fecha=&hora_inicio=&hora_fin=`

---

### Sprint 3

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
| API | `PORT`, `NODE_ENV`, `CORS_ORIGIN` |
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

### Aprobación de cuentas

No hay registro público: las cuentas las crea Admin/Sacerdote (`POST /api/auth/register`, quedan `activa`). Si alguien entra con Clerk con un correo verificado que no pertenece a ninguna persona, se crea una cuenta `pendiente` (rol Ministro provisional, sin acceso). Admin o Sacerdote la revisan en `/cuentas`: **aprobar** (eligiendo el rol; solo Admin puede otorgar Admin) o **rechazar** (reversible, se puede aprobar después). También se puede rechazar una cuenta ya activa (p. ej. la persona dejó la parroquia), salvo la propia; solo un Admin puede rechazar a otro Admin. Con Clerk el bloqueo es inmediato; con el acceso anterior, el refresh token deja de renovarse y el access token vigente expira en 15 min. Una cuenta `pendiente` o `rechazada` recibe 403 con `codigo` `CUENTA_PENDIENTE`/`CUENTA_RECHAZADA` y no aparece en los directorios ni como destinataria de notificaciones.

Sobre bases existentes, ejecutar una vez `app/database/migrations/20261005_persona_estado_cuenta.sql` (las personas actuales quedan `activa`).

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
| `/cuentas` | Aprobación de cuentas pendientes (Sacerdote/Admin). |
| `/perfil` | Perfil del usuario autenticado. |

## Modelo de Base de Datos

| Tabla | Descripción |
|---|---|
| `rol` | Catálogo de roles del sistema |
| `estado_reserva` | 1=Pendiente, 2=Confirmada, 3=Rechazada |
| `espacio` | Salones y áreas físicas |
| `persona` | Usuarios (correo + password hasheado + rol + `estado_cuenta` pendiente/activa/rechazada) |
| `telefono` | Teléfonos de contacto por persona |
| `grupo` | Grupos parroquiales con coordinador asignado |
| `coordinador_ministro` | N:M coordinadores ↔ ministros |
| `tarea` | Tareas asignables (fecha, horario, descripción) |
| `asignacion_tarea` | N:M tarea ↔ persona |
| `notificacion` | Notificaciones: `tipo` ENUM(global/grupo/individual), `remitente_id`, `grupo_id` |
| `persona_notificacion` | N:M persona ↔ notificación + `leida`, `confirmada`, `asistencia_confirmada` (HU-22) |
| `reserva` | Solicitudes de reserva con solicitante |
| `evento` | 1-to-1 con reserva; tiene `titulo` y `descripcion` |

## API

Todas las rutas, excepto las de autenticación, requieren `Authorization: Bearer <token>`.

| Recurso | Operaciones principales |
Todas las rutas (excepto login/logout/refresh) requieren `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/login` | No | Access token + refresh cookie |
| POST | `/refresh` | Cookie | Renueva access token |
| POST | `/logout` | No | Limpia cookie |
| POST | `/register` | Sacerdote/Admin | Registra persona |

### Cuentas — `/api/cuentas`
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/?estado=pendiente\|activa\|rechazada` | Sacerdote/Admin | Lista cuentas por estado (por defecto, pendientes) |
| PATCH | `/:id/aprobar` | Sacerdote/Admin | Body `{ rol_id }`: activa la cuenta con ese rol (409 si ya está activa) |
| PATCH | `/:id/rechazar` | Sacerdote/Admin | Rechaza una cuenta pendiente o activa (403 si es la propia; 409 si ya está rechazada) |

### Notificaciones — `/api/notificaciones`
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/` | Cualquiera | Lista notificaciones del usuario con `remitente_nombre` |
| GET | `/destinatarios` | Admin/Sacerdote/CoordMin | Personas a las que puede notificar |
| PUT | `/:id/leida` | Cualquiera | Marca notificación propia como leída |
| PUT | `/:id/confirmar` | Cualquiera | Confirma asistencia (HU-22) sobre notificación propia |
| PUT | `/:id/asistencia` | Cualquiera | Confirma asistencia + marca leída en un solo paso |
| POST | `/` | Admin/Sacerdote/CoordMin | Crea notificación; global auto-puebla todos |
| DELETE | `/:id` | Admin/Sacerdote | Elimina notificación (cascade) |

### Reservas — `/api/reservas`
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/` | Cualquiera | Crea reserva + evento en transacción |
| GET | `/` | Cualquiera | Lista con evento_titulo, evento_descripcion |
| GET | `/mis-reservas` | Cualquiera | Reservas del usuario autenticado |
| GET | `/:id` | Cualquiera | Detalle |
| PUT | `/:id` | Solicitante/Sacerdote/Admin | Edita + resetea a Pendiente |
| PUT | `/:id/estado` | Sacerdote/Admin | Aprueba o rechaza |

### Otros módulos
| Recurso | Prefijo | Notas |
|---|---|---|
| Tareas | `/api/tareas` | CRUD + asignación/desasignación (409 si hay conflicto de horario, HU-08) |
| Personas | `/api/personas` | GET lista + GET detalle |
| Espacios | `/api/espacios` | CRUD; CUD solo Sacerdote/Admin |
| Grupos | `/api/grupos` | CRUD completo |
| Eventos | `/api/eventos` | CRUD + `/reservas-disponibles` |

---

## Usuarios de Prueba (Seeds)

### Equipo de desarrollo — contraseña `admin123` (rol Admin)
| Correo | Nombre |
|---|---|
| `/api/auth` | `POST /login`, `/refresh`, `/logout`, `/register` |
| `/api/tareas` | CRUD, `POST/DELETE /asignar`, `PUT /asignar` para reasignar responsable |
| `/api/cambios-turno` | `GET/POST /`, `PUT /:id/responder` |
| `/api/personas` | Directorio, perfil, encargados de evento y `PATCH /:id/disponibilidad` |
| `/api/reservas` | Crear/listar/editar, mis reservas y `PUT /:id/estado` |
| `/api/espacios` | CRUD y disponibilidad con `fecha`, `hora_inicio`, `hora_fin` |
| `/api/grupos`, `/api/eventos` | CRUD; eventos incluye `/reservas-disponibles` |
| `/api/notificaciones` | Bandeja, destinatarios, lectura, asistencia, excusa e inasistencia |

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

Las 12 pruebas de Grafana k6 cubren autenticación, espacios, notificaciones, reservas, calendario, flujo integral, colisiones, picos y resistencia continua. Se ejecutan en perfiles separados de carga y estrés, con un stack Docker efímero independiente del entorno habitual.

```bash
docker compose -f tests/k6/docker-compose.yml up -d --build --wait
K6_STACK=true ./tests/k6/run-tests.sh all load
K6_STACK=true ./tests/k6/run-tests.sh all stress
```

Consulta [tests/k6/README.md](tests/k6/README.md) para los 12 identificadores, umbrales, ejecución breve, observación de recursos y las diferencias conocidas del contrato de reservas. Los resultados de cada ejecución se guardan en `tests/k6/results/`; las cifras del informe anterior no certifican esta nueva suite.

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

### Pruebas unitarias

```bash
cd app/backend  && npm test   # Vitest
cd app/frontend && npm test   # Vitest
```

---

## Pendientes técnicos

- Restringir por RBAC/ownership las mutaciones de grupos y las rutas de tareas que hoy solo validan autenticación.
- Eliminar secretos JWT de respaldo y validar variables de entorno al iniciar.
- Incorporar lint, build y pruebas frontend al CI; ampliar cobertura de páginas, formularios y `useSortableTable`.
- Implementar HU-15 (check-in QR), HU-30 (avisar al coordinador por cambio de turno), HU-31 (periodos de ausencia) y HU-32 (portal público).
- Mejorar la navegación de reserva/asistencia observada en las pruebas UX y proteger login con rate limiting.

## Documentación académica

Los informes de Sprint 6 y Sprint 7, el Plan Maestro de Pruebas y la exportación de Jira se mantienen fuera del repositorio.

## Licencia

Proyecto académico para CC3091 — Ingeniería de Software 2, Universidad del Valle de Guatemala.
GitHub Actions (`.github/workflows/deploy.yml`) despliega automáticamente a un **Droplet de DigitalOcean** en cada `push` a `main`:

```
push a main → SSH al droplet → git fetch/reset --hard origin/main → docker compose down → docker compose up -d --build
```

**Nunca mergear a `main` sin pasar primero por `develop`.**

---

## Flujo de Trabajo con Git

```
main        ← código estable, despliegue automático
└── develop ← rama de integración del equipo
    └── feature/<nombre>  ← trabajo individual
```

```bash
git checkout develop && git pull origin develop
git checkout -b feature/nombre-funcionalidad
# ... desarrollar ...
git push origin feature/nombre-funcionalidad
# Abrir PR hacia develop en GitHub
```

---

## Documentación Académica

| Entrega | Documento |
|---|---|
| Corte 1 | `docs/corte1/` |
| Corte 2 | `docs/corte2/` |
| Corte 3 | `docs/corte3/` |
| Sprint 1 | `docs/sprint1/` |
| Sprint 2 | `docs/sprint2/` |
| Sprint 3 | `docs/sprint3/` |
| Sprint 4 | `docs/sprint4/` |
| Sprint 5 | `docs/sprint5/` |

---

*Universidad del Valle de Guatemala — Ingeniería en Software 1, Sección 30 — 2026*
# Agenda pública (HU-32, Sprint 9)

`GET /api/public/agenda` permite a la landing consultar, sin iniciar sesión, los
eventos marcados explícitamente como públicos con reserva confirmada y que aún no
han terminado. Incluye título, descripción, fecha, horarios y salón; admite paginación.
Solo Admin/Sacerdote puede cambiar la publicación con `PATCH /api/eventos/:id/publico`.

En bases existentes aplicar `app/database/migrations/20261009_evento_publico.sql`;
los eventos existentes y nuevos permanecen privados por defecto.
Ver [contrato, ejemplos y pruebas de la agenda pública](docs/hu32/agenda-publica.md).
