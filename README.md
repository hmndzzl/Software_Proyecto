# Plataforma Administrativa — Parroquia San Pedro Nolasco

Sistema web de gestión administrativa para la Parroquia San Pedro Nolasco. Permite administrar grupos parroquiales, espacios físicos, reservas de salones, ministros y tareas, con control de acceso basado en roles (RBAC).

> **Sprint completado: Sprint 2** — Todas las historias de usuario del Sprint 2 han sido implementadas, integradas y desplegadas.

---

## Equipo de Trabajo — Grupo 3

| Nombre | Carné | Correo UVG |
|---|---|---|
| Diego André Calderón Salazar | 241263 | cal241263@uvg.edu.gt |
| Pedro Julio Caso | 241286 | cas241286@uvg.edu.gt |
| Javier Sebastián Alvarado Monzón | 24546 | alv24546@uvg.edu.gt |
| Hugo Méndez Lee | 241265 | men241265@uvg.edu.gt |
| José Miguel Rosas Guerra | 241274 | ros241274@uvg.edu.gt |

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite + TypeScript | React 18, Vite 5 |
| Backend | Express + TypeScript | Express 4 |
| Base de datos | MariaDB | 11 |
| Contenedores | Docker + Docker Compose | — |
| Autenticación | JWT (jsonwebtoken) | — |
| CI/CD | GitHub Actions | — |
| Infraestructura | Azure VM | Ubuntu |

---

## Funcionalidades Implementadas — Sprint 2

El Sprint 2 entregó las siguientes historias de usuario, distribuidas entre los integrantes del equipo:

### HU-10 — Dashboard e Interfaz de Navegación Principal
- Dashboard principal con tarjetas de acceso rápido a todos los módulos.
- Navbar unificado presente en todas las rutas protegidas.
- Navegación directa a Tareas, Ministros, Reservas, Espacios y Grupos.

### HU-05 — Gestión de Grupos Parroquiales
- Listado de todos los grupos parroquiales con su coordinador asignado.
- Crear nuevo grupo vinculado a un coordinador.
- Editar nombre y coordinador de un grupo existente.
- Eliminar grupo.
- API REST completa (`/api/grupos`) con autenticación JWT.

### HU-08 — Gestión de Espacios Físicos
- Listado de todos los espacios con nombre y capacidad.
- Vista de detalle por espacio (`/espacios/:id`) con sus reservas asociadas.
- Crear, editar y eliminar espacios (requiere rol Sacerdote o Admin).
- Script de semilla con 7 espacios iniciales (Templo Principal, Salón Parroquial, Salas de Catequesis A/B, Sala de Reuniones, Patio Central, Capilla Lateral).

### HU-02 — Sistema de Reservas de Salones
- Formulario de solicitud de reserva (fecha, hora inicio/fin, espacio).
- Las reservas se crean en estado **Pendiente** y quedan en espera de aprobación.
- Vista administrativa para Sacerdote: listado de reservas con controles de aprobación/rechazo.
- Endpoint `PUT /api/reservas/:id/estado` para que Sacerdote o Admin cambien el estado.
- Validación de conflictos de horario al aprobar: detecta solapamiento con reservas ya aprobadas en el mismo espacio.
- Filtrado de reservas por espacio mediante query param `?espacio_id=N`.

### HU-09 — Seguridad, Roles y Rutas Protegidas
- Middleware `authMiddleware`: valida JWT en cada petición protegida.
- Middleware `requireRole(...)`: control de acceso por rol con herencia jerárquica.
- Endpoint `POST /api/auth/register` restringido a Sacerdote y Admin.
- `ProtectedRoute` en el frontend: redirige al login si no hay sesión activa.
- Roles con herencia: Admin y Sacerdote heredan permisos de roles inferiores.

### HU-00 — Infraestructura, Docker y Despliegue
- Entorno completamente dockerizado (3 servicios: frontend, backend, mariadb).
- Scripts SQL de esquema (`01_schema.sql`) y semillas (`02_seeds.sql`) ejecutados automáticamente al iniciar MariaDB por primera vez.
- Configuración de despliegue continuo a Azure VM mediante GitHub Actions.
- Métricas y gráficos Burndown del sprint para el informe de gestión.

---

## Módulo de Tareas (Sprint 1 — consolidado)

- Listado de tareas con fecha, horario y descripción.
- Crear nueva tarea.
- Asignar tarea a un ministro.
- Desasignar tarea.
- CRUD completo disponible en `/api/tareas`.

## Módulo de Ministros / Personas (Sprint 1 — consolidado)

- Listado de todas las personas registradas con su rol.
- Registro de nuevas personas (requiere Sacerdote o Admin).

---

## Roles y Permisos (RBAC)

El sistema implementa control de acceso basado en roles con herencia jerárquica. Los roles están definidos en `app/backend/src/config/roles.ts` y sembrados en `02_seeds.sql`.

| rol_id | Nombre | Hereda de | Descripción |
|---|---|---|---|
| 1 | Sacerdote | CoordMin + CoordGrupos | Gestión completa de personas, espacios, reservas y grupos. |
| 2 | Coordinador de Ministros | Ministro | Asigna tareas, reserva salones. |
| 3 | Coordinador de Grupos | — | Gestiona su grupo, reserva salones. |
| 4 | Ministro | — | Solo visualización. |
| 5 | Admin | Todos | Rol técnico del equipo de desarrollo. Acceso total. |

### Mapa de herencia

```
Admin (5)                    →  [5, 1, 2, 3, 4]
Sacerdote (1)                →  [1, 2, 3, 4]
Coordinador de Ministros (2) →  [2, 4]
Coordinador de Grupos (3)    →  [3]
Ministro (4)                 →  [4]
```

`requireRole(ROLES.X)` concede acceso a cualquier rol cuya jerarquía incluya X. Por ejemplo, `requireRole(ROLES.COORDINADOR_MINISTROS)` también permite Sacerdote y Admin.

---

## Estructura del Proyecto

```
Software_Proyecto/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: deploy automático a Azure en push a main
├── app/
│   ├── frontend/               # React 18 + Vite + TypeScript
│   │   └── src/
│   │       ├── App.tsx          # Router principal (React Router)
│   │       ├── components/
│   │       │   ├── layout/     # MainLayout, Navbar
│   │       │   └── ui/         # ProtectedRoute
│   │       ├── context/
│   │       │   └── AuthContext.tsx
│   │       ├── modules/        # Lógica y componentes reutilizables por módulo
│   │       │   ├── espacios/   # EspacioCard
│   │       │   ├── grupos/     # CrearGrupoForm, EditarGrupoForm, ListaGrupos
│   │       │   ├── reservas/   # CrearReservaForm, ListaReservas
│   │       │   └── tareas/     # CrearTareaForm, AsignarTareaForm, ListaAsignaciones
│   │       ├── pages/          # Vistas de ruta (un archivo por pantalla)
│   │       │   ├── auth/       # LoginPage
│   │       │   ├── dashboard/  # DashboardPage
│   │       │   ├── espacios/   # EspaciosPage, EspacioDetallePage
│   │       │   ├── grupos/     # GruposPage
│   │       │   ├── ministers/  # MinistrosPage
│   │       │   ├── reservas/   # ReservasPage
│   │       │   └── tasks/      # TareasPage
│   │       └── types/          # Tipos TypeScript compartidos (index.ts)
│   ├── backend/                # Express + TypeScript
│   │   └── src/
│   │       ├── app.ts          # Punto de entrada: Express, middlewares, rutas
│   │       ├── config/
│   │       │   ├── db.ts       # Pool de conexión MariaDB (mysql2)
│   │       │   └── roles.ts    # Constantes ROLES + mapa ROLE_HIERARCHY
│   │       ├── controllers/    # Lógica de negocio por recurso
│   │       │   ├── auth.controller.ts
│   │       │   ├── espacio.controller.ts
│   │       │   ├── grupo.controller.ts
│   │       │   ├── persona.controller.ts
│   │       │   ├── reserva.controller.ts
│   │       │   └── tarea.controller.ts
│   │       ├── middlewares/
│   │       │   └── auth.middleware.ts  # authMiddleware + requireRole
│   │       ├── routes/         # Express Router por recurso
│   │       └── utils/
│   │           └── httpStatus.ts  # Enum HttpStatus (sin magic numbers)
│   ├── database/
│   │   └── init/
│   │       ├── 01_schema.sql   # DDL: todas las tablas con constraints y FK
│   │       └── 02_seeds.sql    # DML: roles, usuarios, espacios iniciales
│   ├── .env.example            # Plantilla de variables de entorno
│   ├── docker-compose.example.yml
│   └── docker-compose.yml      # No versionado — copiar desde example
├── corte1/                     # Documentación Primer Corte
├── corte2/                     # Documentación Segundo Corte
├── corte3/                     # Documentación Tercer Corte
└── README.md
```

---

## Modelo de Base de Datos

La base de datos usa MariaDB 11 con el charset `utf8mb4`. Las tablas principales son:

| Tabla | Descripción |
|---|---|
| `rol` | Catálogo de roles del sistema |
| `persona` | Usuarios del sistema (correo + password hasheado + rol) |
| `espacio` | Salones y áreas físicas de la parroquia (nombre + capacidad) |
| `reserva` | Solicitudes de reserva de espacio con estado (pendiente/aprobada/rechazada) |
| `estado_reserva` | Catálogo de estados de reserva |
| `tarea` | Tareas asignables a ministros (fecha, horario, descripción) |
| `asignacion_tarea` | Relación N:M entre tarea y persona |
| `grupo` | Grupos parroquiales con coordinador asignado |
| `coordinador_ministro` | Relación N:M entre coordinadores y ministros |
| `telefono` | Teléfonos de contacto por persona |
| `notificacion` | Notificaciones asociadas a grupos |
| `evento` | Eventos ligados a una reserva aprobada |

---

## API Endpoints

Todas las rutas (excepto `POST /api/auth/login`) requieren cabecera `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Retorna JWT con `{ id, rol_id }` |
| POST | `/api/auth/register` | Sacerdote / Admin | Registra nueva persona |

### Tareas — `/api/tareas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tareas` | Lista todas las tareas |
| GET | `/api/tareas/:id` | Detalle de una tarea |
| POST | `/api/tareas` | Crea nueva tarea |
| PUT | `/api/tareas/:id` | Actualiza tarea |
| DELETE | `/api/tareas/:id` | Elimina tarea |
| POST | `/api/tareas/asignar` | Asigna tarea a ministro |
| DELETE | `/api/tareas/asignar` | Desasigna tarea de ministro |

### Personas — `/api/personas`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/personas` | Lista todas las personas |
| GET | `/api/personas/:id` | Detalle de persona |

### Reservas — `/api/reservas`

| Método | Ruta | Auth requerida | Descripción |
|---|---|---|---|
| GET | `/api/reservas` | JWT | Lista reservas (acepta `?espacio_id=N`) |
| GET | `/api/reservas/:id` | JWT | Detalle de reserva |
| POST | `/api/reservas` | JWT | Crea solicitud de reserva (estado inicial: Pendiente) |
| PUT | `/api/reservas/:id/estado` | Sacerdote / Admin | Aprueba o rechaza la reserva |

### Espacios — `/api/espacios`

| Método | Ruta | Auth requerida | Descripción |
|---|---|---|---|
| GET | `/api/espacios` | JWT | Lista todos los espacios |
| GET | `/api/espacios/:id` | JWT | Detalle de espacio |
| POST | `/api/espacios` | Sacerdote / Admin | Crea espacio |
| PUT | `/api/espacios/:id` | Sacerdote / Admin | Actualiza espacio |
| DELETE | `/api/espacios/:id` | Sacerdote / Admin | Elimina espacio |

### Grupos — `/api/grupos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/grupos` | Lista todos los grupos |
| GET | `/api/grupos/:id` | Detalle de grupo |
| POST | `/api/grupos` | Crea nuevo grupo |
| PUT | `/api/grupos/:id` | Actualiza grupo |
| DELETE | `/api/grupos/:id` | Elimina grupo |

### Health Check

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Verifica que el backend está en línea |

---

## Usuarios de Prueba (Seeds)

### Equipo de desarrollo — contraseña `admin123` (rol Admin)

| Correo | Nombre |
|---|---|
| diego@parroquia.com | Diego Calderón |
| pedro@parroquia.com | Pedro Caso |
| javier@parroquia.com | Javier Alvarado |
| hugo@parroquia.com | Hugo Méndez |
| miguel@parroquia.com | Miguel Rosas |

### Usuarios por rol — contraseña `password123`

| Correo | Rol |
|---|---|
| sacerdote@parroquia.com | Sacerdote |
| coord.min@parroquia.com | Coordinador de Ministros |
| coord.grupos@parroquia.com | Coordinador de Grupos |
| ministro@parroquia.com | Ministro |

### Espacios físicos sembrados

| Espacio | Capacidad |
|---|---|
| Templo Principal | 500 |
| Salón Parroquial | 150 |
| Sala de Catequesis A | 30 |
| Sala de Catequesis B | 30 |
| Sala de Reuniones | 20 |
| Patio Central | 200 |
| Capilla Lateral | 80 |

---

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.
- Archivo `.env` proporcionado por el líder del equipo (ver sección Variables de Entorno).
- Git.

No se requiere instalar Node.js ni MariaDB localmente; todo corre dentro de contenedores Docker.

---

## Instalación y Puesta en Marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto
```

### 2. Colocar el archivo `.env`

Solicitar el archivo `.env` al líder del equipo y colocarlo en `app/.env`.

```
Software_Proyecto/
└── app/
    └── .env   ← aquí
```

Como referencia, la plantilla `app/.env.example` muestra todas las variables requeridas:

```env
# Frontend
VITE_API_URL=

# Backend
PORT=

# Base de datos
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# MariaDB Docker
DB_ROOT_PASSWORD=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=
```

### 3. Copiar el archivo Docker Compose

```bash
cd app
cp docker-compose.example.yml docker-compose.yml
```

### 4. Primer arranque

El primer `--build` construye las imágenes de frontend y backend, y MariaDB ejecuta automáticamente `01_schema.sql` y `02_seeds.sql` para crear el esquema y cargar los datos iniciales.

```bash
docker compose up --build -d
```

### 5. Arranques posteriores (sin reconstruir)

```bash
docker compose up -d
```

### 6. Detener los contenedores

```bash
docker compose down
```

### Reiniciar desde cero (borrar la BD y re-ejecutar seeds)

Útil cuando el esquema o los seeds cambiaron y se necesita un estado limpio:

```bash
docker compose down -v       # elimina contenedores Y el volumen de MariaDB
docker compose up --build -d # reconstruye imágenes y recarga seeds
```

> **Advertencia:** `down -v` destruye todos los datos persistidos. Usar solo en entornos de desarrollo.

---

## Acceso a los Servicios

| Servicio | URL local |
|---|---|
| Aplicación web (frontend) | http://localhost:5173 |
| API REST (backend) | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Base de datos (MariaDB) | localhost:3306 |

---

## Desarrollo Local (sin Docker)

Para desarrollar un servicio específico de forma aislada sin levantar toda la pila Docker:

### Frontend

```bash
cd app/frontend
npm install
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # Verifica tipos TypeScript y genera build de producción
```

### Backend

```bash
cd app/backend
npm install
npm run dev    # ts-node-dev con hot reload → http://localhost:3001
npm run build  # Compila TypeScript a dist/
npm start      # Ejecuta el JS compilado
```

> Asegurarse de que la instancia de MariaDB esté disponible (ya sea el contenedor Docker o una instalación local) y que las variables de entorno estén configuradas correctamente.

---

## Dockerización

El proyecto utiliza tres contenedores orquestados con Docker Compose:

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐                 │
│  │   frontend   │   │   backend    │                 │
│  │  React+Vite  │──▶│  Express+TS  │                 │
│  │  :5173       │   │  :3001       │                 │
│  └──────────────┘   └──────┬───────┘                 │
│                            │ depends_on (healthcheck) │
│                     ┌──────▼───────┐                 │
│                     │   mariadb    │                 │
│                     │  MariaDB 11  │                 │
│                     │  :3306       │                 │
│                     └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

- **frontend**: construido desde `app/frontend/Dockerfile`. Vite sirve la SPA con hot-reload en desarrollo.
- **backend**: construido desde `app/backend/Dockerfile`. ts-node-dev recarga el servidor al guardar cambios.
- **mariadb**: imagen oficial `mariadb:11`. Monta `./database/init/` en `/docker-entrypoint-initdb.d/` para ejecutar los scripts SQL al primer inicio. Incluye healthcheck para que el backend espere a que la BD esté lista antes de arrancar.
- **Volumen persistente** (`mariadb_data`): los datos de la base de datos sobreviven reinicios del contenedor. Solo `docker compose down -v` los elimina.

---

## Despliegue en Producción

### Infraestructura

- **Plataforma:** Azure Virtual Machine (Ubuntu).
- **URL de producción:** se obtiene a partir de la IP configurada en los secrets de GitHub Actions.

### Pipeline CI/CD (GitHub Actions)

El archivo `.github/workflows/deploy.yml` define el flujo de despliegue continuo:

```
push a main
     │
     ▼
GitHub Actions (ubuntu-latest)
     │
     ▼
SSH al Azure VM (usuario: parroquia)
     │
     ├── git pull origin main
     ├── docker compose down
     ├── docker compose up -d --build
     ├── sleep 15 (espera de arranque)
     ├── docker compose ps
     └── docker image prune -f
```

El despliegue se activa automáticamente en cada `push` a `main`. También puede ejecutarse manualmente desde la pestaña **Actions** de GitHub (`workflow_dispatch`).

**Secrets requeridos en GitHub:**

| Secret | Descripción |
|---|---|
| `AZURE_VM_IP` | IP pública del servidor Azure |
| `AZURE_SSH_KEY` | Clave SSH privada para autenticarse en el VM |

> **Importante:** nunca mergear a `main` código que no haya pasado por `develop` y sido validado por el equipo.

---

## Flujo de Trabajo con Git

```
main        ← código estable, desplegado automáticamente a Azure
└── develop ← rama de integración del equipo
    └── feature/<nombre-funcionalidad>  ← trabajo individual
```

### Proceso estándar

```bash
# 1. Partir siempre desde develop actualizado
git checkout develop
git pull origin develop

# 2. Crear rama de funcionalidad
git checkout -b feature/nombre-funcionalidad

# 3. Desarrollar, commitear y pushear
git add <archivos>
git commit -m "feat: descripción del cambio"
git push origin feature/nombre-funcionalidad

# 4. Abrir Pull Request hacia develop en GitHub
# 5. Revisión y merge por otro integrante del equipo
```

Nunca trabajar directamente sobre `main` ni sobre `develop`. Las ramas de feature se eliminan tras el merge.

---

## Documentación del Proyecto

| Entrega | Documento |
|---|---|
| Corte 1 | [Primer Corte del Proyecto - Grupo 3.pdf](./corte1/Primer%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |
| Corte 2 | [Segundo Corte del Proyecto - Grupo 3.pdf](./corte2/Segundo%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |
| Corte 3 | [Tercer Corte del Proyecto - Grupo 3.pdf](./corte3/Tercer%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |

---

*Universidad del Valle de Guatemala — Ingeniería en Software 1, Sección 10 — 2026*