# Plataforma Administrativa — Parroquia San Pedro Nolasco

Sistema web de gestión administrativa para la Parroquia San Pedro Nolasco (Guatemala). Permite administrar grupos parroquiales, espacios físicos, reservas de salones, ministros, tareas y eventos, con control de acceso basado en roles (RBAC).

> **Estado actual: Sprint 3 terminado** — Módulo de reservas ampliado (título + descripción de evento, edición de reservas), rediseño completo de la interfaz con nuevo sistema de diseño.

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
| Infraestructura | Azure VM | Ubuntu |
| Fuentes | Cinzel + Noto Serif | Google Fonts |

---

## Funcionalidades Implementadas

### Sprint 3 (en curso)

#### Rediseño completo de la interfaz
- **Nuevo sistema de diseño** basado en paleta litúrgica: rojo `#9D2F38`, oro `#F2AF29`, crema `#F3F1E9`, tierra `#8B5A2D`
- **Fuentes:** Cinzel (títulos y kickers) + Noto Serif (cuerpo y tablas) + monospace para fechas/horas/IDs
- **AppShell:** TopBar (72px, fondo rojo) + Sidebar (260px, fondo crema) con links activos y navegación reactiva
- **Tokens CSS centralizados** en `src/styles/tokens.css` — cero colores hardcodeados en módulos
- **Primitivos UI reutilizables:** `Btn`, `Badge`, `Card`/`CardHead`/`CardBody`, `PageHeader`, `Field`/`InputUI`/`SelectUI`
- **Login:** layout split 50/50 con branding parroquial en panel rojo y formulario en panel crema
- **Dashboard:** KPI cards con número grande Cinzel, Próximas Tareas con icon chips, Accesos Rápidos en tiles
- **Espacios:** cards con foto placeholder, nombre Cinzel rojo, badge de disponibilidad, botón dorado
- **Detalle de espacio:** grid info + reservas con bloque de fecha (día grande rojo)
- **Mis Reservas:** KPI chips Cinzel 48px con colores semánticos por estado
- **Ministros:** directorio con avatares de iniciales y rol badge
- CSS Modules en todos los componentes — cero `style={{}}` en el frontend

#### Módulo de Reservas ampliado
- **Campos título y descripción** en `CrearReservaForm` (obligatorios, con asterisco rojo)
- Tabla `evento` actualizada: columna `titulo VARCHAR(255) NOT NULL` añadida
- `ListaReservas` muestra `evento_titulo` y `evento_descripcion` en columnas separadas
- `EspacioDetallePage` muestra título y descripción del evento en cada reserva
- **Edición de reservas** (`PUT /api/reservas/:id`):
  - Solicitante puede editar sus propias reservas
  - Admin y Sacerdote pueden editar cualquier reserva
  - Editar resetea estado a Pendiente para re-aprobación
  - Modal con campos pre-llenados y aviso de re-aprobación si era Confirmada/Rechazada
- `GET /api/reservas` ahora retorna `espacio_id`, `solicitante_id`, `evento_titulo`, `evento_descripcion`

#### Vista Mis Reservas
- Página `/mis-reservas` accesible para todos los roles autenticados
- Resumen de reservas propias con contadores por estado (Pendientes / Confirmadas / Rechazadas)
- Tabla con historial completo de solicitudes

---

### Sprint 2 (completado — 43 Story Points)

#### HU-10 — Dashboard e Interfaz de Navegación
- Dashboard con tarjetas de métricas y accesos rápidos filtrados por rol
- Navbar unificado (rediseñado como Sidebar+TopBar en Sprint 3)

#### HU-05 — Gestión de Grupos Parroquiales
- CRUD completo de grupos (`/api/grupos`)
- Vinculación de coordinador a cada grupo

#### HU-08 — Gestión de Espacios Físicos
- CRUD de espacios con nombre y capacidad
- Vista de detalle con reservas asociadas
- 7 espacios iniciales en seeds

#### HU-02 — Sistema de Reservas de Salones
- Formulario de solicitud con validación de horarios
- Flujo Pendiente → Aprobada/Rechazada
- Validación de conflictos de horario al aprobar
- Vista administrativa con controles de aprobación/rechazo

#### HU-09 — Seguridad, Roles y Rutas Protegidas
- Middleware JWT + RBAC con herencia jerárquica
- `ProtectedRoute` en frontend con redirección automática
- Doble token: access (15 min) + refresh (15 días, sliding, HttpOnly cookie)

---

### Sprint 1 (completado)

- Módulo de Tareas: CRUD + asignación a ministros
- Módulo de Ministros/Personas: listado y registro
- Autenticación básica con JWT

---

## Roles y Permisos (RBAC)

| rol_id | Nombre | Herencia | Descripción |
|---|---|---|---|
| 1 | Sacerdote | CoordMin + CoordGrupos | Aprueba/rechaza reservas. Edita cualquier reserva. |
| 2 | Coordinador de Ministros | Ministro | Asigna tareas, reserva salones. Edita sus reservas. |
| 3 | Coordinador de Grupos | — | Gestiona su grupo, reserva salones. Edita sus reservas. |
| 4 | Ministro | — | Solo visualización. |
| 5 | Admin | Todos | Rol técnico. Acceso total. Edita cualquier reserva. |

```
Admin (5)          → [5, 1, 2, 3, 4]
Sacerdote (1)      → [1, 2, 3, 4]
CoordMinistros (2) → [2, 4]
CoordGrupos (3)    → [3]
Ministro (4)       → [4]
```

---

## Estructura del Proyecto

```
Software_Proyecto/
├── .github/workflows/deploy.yml     # CI/CD → Azure VM en push a main
├── app/
│   ├── frontend/
│   │   ├── index.html               # Carga fuentes Google Fonts (Cinzel + Noto Serif)
│   │   └── src/
│   │       ├── assets/
│   │       │   └── logo-parroquia.jpeg
│   │       ├── api/
│   │       │   ├── client.ts        # Axios con interceptor de refresh token
│   │       │   └── auth.ts
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── AppShell.tsx   # Wrapper principal (Sidebar + TopBar + main)
│   │       │   │   ├── Sidebar.tsx    # Nav lateral con NavLinks activos
│   │       │   │   └── TopBar.tsx     # Barra superior con logo, usuario y logout
│   │       │   └── ui/
│   │       │       ├── Btn.tsx        # Botón: 6 kinds × 3 sizes
│   │       │       ├── Badge.tsx      # Badge de estado con dot
│   │       │       ├── Card.tsx       # Card + CardHead + CardBody
│   │       │       ├── Field.tsx      # Field + InputUI + SelectUI + TextareaUI
│   │       │       ├── PageHeader.tsx # Kicker + H1 + subtitle + rule oro
│   │       │       └── ProtectedRoute.tsx
│   │       ├── context/AuthContext.tsx
│   │       ├── modules/
│   │       │   ├── espacios/components/   # EspacioCard
│   │       │   ├── eventos/components/    # ListaEventos, EditarEventoForm, CrearEventoForm
│   │       │   ├── grupos/components/     # CrearGrupoForm, EditarGrupoForm, ListaGrupos
│   │       │   ├── reservas/components/   # CrearReservaForm, ListaReservas
│   │       │   └── tareas/components/     # CrearTareaForm, AsignarTareaForm, ListaAsignaciones
│   │       ├── pages/
│   │       │   ├── auth/           # LoginPage (split 50/50)
│   │       │   ├── dashboard/      # DashboardPage
│   │       │   ├── espacios/       # EspaciosPage, EspacioDetallePage
│   │       │   ├── eventos/        # EventosPage
│   │       │   ├── grupos/         # GruposPage
│   │       │   ├── ministers/      # MinistrosPage
│   │       │   ├── mis-reservas/   # MisReservasPage
│   │       │   ├── reservas/       # ReservasPage
│   │       │   └── tasks/          # TareasPage
│   │       ├── styles/
│   │       │   ├── tokens.css      # CSS custom properties (colores, fuentes, sombras, espaciado)
│   │       │   └── Form.module.css # Estilos compartidos de formularios
│   │       ├── types/index.ts
│   │       └── utils/roles.ts
│   ├── backend/
│   │   └── src/
│   │       ├── config/db.ts, roles.ts
│   │       ├── controllers/
│   │       │   ├── auth.controller.ts
│   │       │   ├── espacio.controller.ts
│   │       │   ├── evento.controller.ts
│   │       │   ├── grupo.controller.ts
│   │       │   ├── persona.controller.ts
│   │       │   ├── reserva.controller.ts  # crearReserva, editarReserva, obtenerReservas...
│   │       │   └── tarea.controller.ts
│   │       ├── middlewares/auth.middleware.ts
│   │       ├── routes/
│   │       └── utils/httpStatus.ts
│   ├── database/init/
│   │   ├── 01_schema.sql   # DDL con tabla evento.titulo añadida
│   │   └── 02_seeds.sql
│   ├── .env.example
│   └── docker-compose.yml
├── docs/                   # PDFs de cortes académicos y sprints
└── README.md
```

---

## Modelo de Base de Datos

| Tabla | Descripción |
|---|---|
| `rol` | Catálogo de roles del sistema |
| `estado_reserva` | Estados: 1=Pendiente, 2=Confirmada, 3=Rechazada |
| `espacio` | Salones y áreas físicas (nombre + capacidad) |
| `persona` | Usuarios (correo + password hasheado + rol) |
| `telefono` | Teléfonos de contacto por persona |
| `grupo` | Grupos parroquiales con coordinador asignado |
| `coordinador_ministro` | Relación N:M coordinadores ↔ ministros |
| `tarea` | Tareas asignables (fecha, horario, descripción) |
| `asignacion_tarea` | Relación N:M tarea ↔ persona |
| `notificacion` | Notificaciones asociadas a grupos |
| `persona_notificacion` | Relación N:M persona ↔ notificación |
| `reserva` | Solicitudes de reserva (con `solicitante_id`) |
| `evento` | Vinculado 1-to-1 con reserva; tiene `titulo` y `descripcion` |

---

## API Endpoints

Todas las rutas (excepto login/logout/refresh) requieren `Authorization: Bearer <token>`.

### Autenticación — `/api/auth`
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Retorna access token + refresh cookie |
| POST | `/api/auth/refresh` | Cookie | Renueva access token |
| POST | `/api/auth/logout` | No | Limpia cookie de refresh |
| POST | `/api/auth/register` | Sacerdote/Admin | Registra nueva persona |

### Reservas — `/api/reservas`
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/reservas` | Cualquiera | Crea reserva + evento en transacción |
| GET | `/api/reservas` | Cualquiera | Lista con `espacio_id`, `solicitante_id`, `evento_titulo`, `evento_descripcion` |
| GET | `/api/reservas?espacio_id=N` | Cualquiera | Filtra por espacio |
| GET | `/api/reservas/mis-reservas` | Cualquiera | Reservas del usuario autenticado |
| GET | `/api/reservas/:id` | Cualquiera | Detalle de reserva |
| **PUT** | **`/api/reservas/:id`** | **Solicitante / Sacerdote / Admin** | **Edita reserva + evento, resetea a Pendiente** |
| PUT | `/api/reservas/:id/estado` | Sacerdote / Admin | Aprueba o rechaza (valida conflictos) |

### Espacios — `/api/espacios`
| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/espacios` | Cualquiera | Lista espacios |
| GET | `/api/espacios/:id` | Cualquiera | Detalle de espacio |
| POST | `/api/espacios` | Sacerdote/Admin | Crea espacio |
| PUT | `/api/espacios/:id` | Sacerdote/Admin | Actualiza espacio |
| DELETE | `/api/espacios/:id` | Sacerdote/Admin | Elimina espacio |

### Otros módulos
| Recurso | Prefijo | Notas |
|---|---|---|
| Tareas | `/api/tareas` | CRUD + asignación/desasignación |
| Personas | `/api/personas` | GET lista + GET detalle |
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

## Instalación y Puesta en Marcha

### Prerrequisitos
- Docker Desktop instalado y ejecutándose
- Archivo `app/.env` proporcionado por el líder del equipo

### Primera vez

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
cp docker-compose.example.yml docker-compose.yml
# Colocar .env en app/.env
docker compose up --build -d
```

MariaDB ejecuta automáticamente `01_schema.sql` y `02_seeds.sql` al primer inicio.

### Siguientes veces

```bash
cd app
docker compose up -d
```

### Reiniciar BD desde cero (cuando cambia el schema)

```bash
docker compose down -v        # elimina contenedores Y volumen de BD
docker compose up --build -d  # reconstruye y recarga seeds
```

> **Importante:** el campo `titulo` en tabla `evento` fue añadido en Sprint 3. Si existe un volumen anterior, es necesario hacer `down -v` para aplicarlo.

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

GitHub Actions (`.github/workflows/deploy.yml`) despliega automáticamente a Azure VM en cada `push` a `main`:

```
push a main → SSH al VM → git pull → docker compose down → docker compose up --build -d
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

---

*Universidad del Valle de Guatemala — Ingeniería en Software 1, Sección 30 — 2026*
