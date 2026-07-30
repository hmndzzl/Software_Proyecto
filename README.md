# Plataforma Administrativa — Parroquia San Pedro Nolasco

Sistema web de gestión administrativa para la Parroquia San Pedro Nolasco (Guatemala). Permite administrar grupos parroquiales, espacios físicos, reservas de salones, ministros, tareas, eventos y notificaciones, con control de acceso basado en roles (RBAC).

> **Estado actual: Sprint 5 completado** — Confirmación de asistencia desde notificaciones (HU-22), validación de conflictos de horario al asignar tareas (HU-08), suite de pruebas unitarias con Vitest (backend y frontend). Sprint 4: notificaciones en tiempo real, calendario semanal de ministros, edición de perfil, disponibilidad dinámica de espacios. Sprint 3: rediseño completo de la interfaz, módulo de reservas ampliado.

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
| Autenticación | JWT (jsonwebtoken) doble token | — |
| CI/CD | GitHub Actions | — |
| Infraestructura | DigitalOcean Droplet | Ubuntu |
| Pruebas unitarias | Vitest | backend + frontend |
| Fuentes | Cinzel + Noto Serif | Google Fonts |

---

## Funcionalidades Implementadas

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

#### Módulo de Notificaciones
- **Campana en TopBar** con badge rojo de no-leídas, polling automático cada 60s
- Dropdown de últimas 5 notificaciones con vista previa; click navega a `/notificaciones` y marca como leída
- **Página `/notificaciones`:** tabla completa con columnas Fecha, Mensaje, Remitente, Tipo, Estado (Badge verde/amarillo)
- **Botón "Marcar todas como leídas"** visible solo cuando hay no-leídas
- **Envío manual de notificaciones** (modal con acordeón por rol):
  - Admin/Sacerdote: tipo Global (auto-todos) o Individual (cualquier persona, lista agrupada por rol colapsable)
  - Coordinador de Ministros: Individual a sus ministros asignados únicamente
  - CoordGrupos y Ministros: solo reciben, no envían
- Backend CRUD completo: `GET`, `PUT /:id/leida`, `POST`, `DELETE`
- `GET /api/notificaciones/destinatarios` retorna personas disponibles según rol del remitente

#### Rediseño completo de la interfaz
- **Nuevo sistema de diseño** basado en paleta litúrgica: rojo `#9D2F38`, oro `#F2AF29`, crema `#F3F1E9`, tierra `#8B5A2D`
- **Fuentes:** Cinzel (títulos y kickers) + Noto Serif (cuerpo y tablas) + monospace para fechas/horas/IDs
- **AppShell:** TopBar (72px, fondo rojo) + Sidebar (260px, fondo crema) con links activos y navegación reactiva
- **Tokens CSS centralizados** en `src/styles/tokens.css` — cero colores hardcodeados en módulos
- **Primitivos UI reutilizables:** `Btn`, `Badge`, `Card`/`CardHead`/`CardBody`, `PageHeader`, `Field`/`InputUI`/`SelectUI`, `Modal`
- **Login:** layout split 50/50 con branding parroquial en panel rojo y formulario en panel crema
- **Dashboard:** KPI cards, Próximas Tareas, Accesos Rápidos filtrados por rol
- CSS Modules en todos los componentes — cero `style={{}}` estáticos en el frontend

#### Módulo de Reservas ampliado
- Campos **título y descripción** obligatorios en `CrearReservaForm`
- **Edición de reservas** (`PUT /api/reservas/:id`): solicitante edita las propias; Admin/Sacerdote editan cualquiera; resetea estado a Pendiente
- Modal con campos pre-llenados y aviso de re-aprobación si era Confirmada/Rechazada

---

### Sprint 2 (completado — 43 Story Points)

- **HU-10** Dashboard e interfaz de navegación principal
- **HU-05** CRUD de grupos parroquiales
- **HU-08** CRUD de espacios físicos (7 espacios en seeds)
- **HU-02** Sistema completo de reservas (formulario, aprobación, validación de conflictos)
- **HU-09** Middleware JWT + RBAC + rutas protegidas frontend

---

### Sprint 1 (completado)

- Módulo de Tareas: CRUD + asignación a ministros
- Módulo de Ministros/Personas: listado y registro
- Autenticación básica con JWT

---

## Roles y Permisos (RBAC)

| rol_id | Nombre | Descripción |
|---|---|---|
| 1 | Sacerdote | Aprueba/rechaza reservas. Edita cualquier reserva. Envía notificaciones a todos. |
| 2 | Coordinador de Ministros | Asigna tareas, reserva salones. Envía notificaciones a sus ministros. |
| 3 | Coordinador de Grupos | Gestiona su grupo, reserva salones. Solo recibe notificaciones. |
| 4 | Ministro | Solo visualización. Solo recibe notificaciones. |
| 5 | Admin | Acceso total. Envía notificaciones a todos. |

```
Admin (5)          → [5, 1, 2, 3, 4]
Sacerdote (1)      → [1, 2, 3, 4]
CoordMinistros (2) → [2, 4]
CoordGrupos (3)    → [3]
Ministro (4)       → [4]
```

> **Nota sobre grupos:** Los miembros de grupos parroquiales no tienen acceso a la app. Solo el coordinador del grupo tiene cuenta. Las notificaciones de tipo "grupo" van al coordinador, quien comunica a sus miembros por otros medios.

---

## Estructura del Proyecto

```
Software_Proyecto/
├── .github/workflows/deploy.yml
├── app/
│   ├── frontend/
│   │   └── src/
│   │       ├── api/
│   │       │   ├── client.ts          # Axios + interceptor refresh token
│   │       │   └── auth.ts
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── AppShell.tsx
│   │       │   │   ├── Sidebar.tsx    # NavLinks activos + enlace notificaciones
│   │       │   │   └── TopBar.tsx     # Logo, campana con badge, usuario, logout
│   │       │   └── ui/
│   │       │       ├── Btn.tsx        # 6 kinds × 3 sizes
│   │       │       ├── Badge.tsx      # Dot badge de estado
│   │       │       ├── Card.tsx       # Card + CardHead + CardBody
│   │       │       ├── Field.tsx      # Field + InputUI + SelectUI + TextareaUI
│   │       │       ├── Modal.tsx      # Overlay con blur + cierre ESC/click fuera
│   │       │       ├── PageHeader.tsx # Kicker + H1 + subtitle + rule oro
│   │       │       └── ProtectedRoute.tsx
│   │       ├── context/AuthContext.tsx
│   │       ├── modules/
│   │       │   ├── espacios/
│   │       │   ├── eventos/
│   │       │   ├── grupos/
│   │       │   ├── notificaciones/
│   │       │   │   ├── components/    # NotificacionRow, EnviarNotificacionForm
│   │       │   │   └── hooks/         # useNotificaciones
│   │       │   ├── reservas/
│   │       │   └── tareas/
│   │       ├── pages/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── espacios/
│   │       │   ├── eventos/
│   │       │   ├── grupos/
│   │       │   ├── ministers/
│   │       │   ├── mis-reservas/
│   │       │   ├── notificaciones/    # NotificacionesPage
│   │       │   ├── reservas/
│   │       │   └── tasks/
│   │       ├── styles/
│   │       │   ├── tokens.css
│   │       │   └── Form.module.css
│   │       ├── types/index.ts
│   │       └── utils/
│   │           ├── date.ts            # formatFecha() — ISO → "21 may. 2026"
│   │           └── roles.ts
│   ├── backend/
│   │   └── src/
│   │       ├── config/db.ts, roles.ts
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts
│   │       │   ├── espacio.controller.ts
│   │       │   ├── evento.controller.ts
│   │       │   ├── grupo.controller.ts
│   │       │   ├── notificacion.controller.ts
│   │       │   ├── persona.controller.ts
│   │       │   ├── reserva.controller.ts
│   │       │   └── tarea.controller.ts
│   │       ├── middlewares/auth.middleware.ts
│   │       ├── routes/
│   │       ├── types/
│   │       │   ├── notificacion.types.ts
│   │       │   └── tarea.types.ts
│   │       └── utils/httpStatus.ts
│   ├── database/init/
│   │   ├── 01_schema.sql
│   │   └── 02_seeds.sql
│   ├── .env.example
│   └── docker-compose.yml
├── docs/
└── README.md
```

---

## Modelo de Base de Datos

| Tabla | Descripción |
|---|---|
| `rol` | Catálogo de roles del sistema |
| `estado_reserva` | 1=Pendiente, 2=Confirmada, 3=Rechazada |
| `espacio` | Salones y áreas físicas |
| `persona` | Usuarios (correo + password hasheado + rol) |
| `telefono` | Teléfonos de contacto por persona |
| `grupo` | Grupos parroquiales con coordinador asignado |
| `coordinador_ministro` | N:M coordinadores ↔ ministros |
| `tarea` | Tareas asignables (fecha, horario, descripción) |
| `asignacion_tarea` | N:M tarea ↔ persona |
| `notificacion` | Notificaciones: `tipo` ENUM(global/grupo/individual), `remitente_id`, `grupo_id` |
| `persona_notificacion` | N:M persona ↔ notificación + `leida`, `confirmada`, `asistencia_confirmada` (HU-22) |
| `reserva` | Solicitudes de reserva con solicitante |
| `evento` | 1-to-1 con reserva; tiene `titulo` y `descripcion` |

---

## API Endpoints

Todas las rutas (excepto login/logout/refresh) requieren `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/login` | No | Access token + refresh cookie |
| POST | `/refresh` | Cookie | Renueva access token |
| POST | `/logout` | No | Limpia cookie |
| POST | `/register` | Sacerdote/Admin | Registra persona |

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
| diego@parroquia.com | Diego Calderón |
| pedro@parroquia.com | Pedro Caso |
| javier@parroquia.com | Javier Alvarado |
| hugo@parroquia.com | Hugo Méndez |
| miguel@parroquia.com | Miguel Rosas |

### Usuarios por rol — contraseña `password123`
| Correo | Rol | Notas |
|---|---|---|
| sacerdote@parroquia.com | Sacerdote | — |
| coord.min@parroquia.com | Coordinador de Ministros | Coordina a `ministro@parroquia.com` |
| coord.grupos@parroquia.com | Coordinador de Grupos | — |
| ministro@parroquia.com | Ministro | Asignado a coord.min |

### Espacios físicos sembrados
| Espacio | Capacidad |
|---|---|
| Templo Principal | 500 |
| Salón Parroquial | 150 |
| Sala de Catequesis A/B | 30 c/u |
| Sala de Reuniones | 20 |
| Patio Central | 200 |
| Capilla Lateral | 80 |

---

## Instalación y Puesta en Marcha

### Prerrequisitos
- Docker Desktop instalado y ejecutándose
- Archivo `app/.env` (copiar desde `app/.env.example`)

### Primera vez

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
cp .env.example .env   # completar variables
docker compose up --build -d
```

MariaDB ejecuta automáticamente `01_schema.sql` y `02_seeds.sql` al primer inicio.

### Siguientes veces

```bash
cd app && docker compose up -d
```

### Reiniciar BD desde cero (cuando cambia el schema)

**⚠️ Borra todos los datos existentes.**

```bash
docker compose down -v
docker compose up --build -d
```

> Necesario cuando: se agrega una columna (ej. `leida` en `persona_notificacion`), se cambia el schema, o se actualizan las seeds.

### Desarrollo local (sin Docker — para IntelliSense del IDE)

```bash
cd app/backend  && npm install
cd app/frontend && npm install
```

### Pruebas unitarias

```bash
cd app/backend  && npm test   # Vitest
cd app/frontend && npm test   # Vitest
```

---

## Acceso a los Servicios

| Servicio | URL local |
|---|---|
| Aplicación web | http://localhost:5173 |
| API REST | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| Adminer (UI de BD) | http://localhost:8080 |

**Adminer:** Sistema `MySQL`, Servidor `mariadb`, credenciales del `.env`.

---

## Despliegue en Producción

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
