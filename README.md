# Plataforma Administrativa — Parroquia San Pedro Nolasco

Aplicación web para apoyar la gestión interna de la Parroquia San Pedro Nolasco, Guatemala. Centraliza procesos que antes dependían de hojas de cálculo y mensajería: coordinación de ministros, reservas de espacios, eventos, grupos y comunicaciones.

El proyecto fue desarrollado por el Grupo 3 de Ingeniería de Software 2 (UVG, 2026). El incremento funcional más reciente corresponde al Sprint 8.

## Capacidades principales

- Portal público con información parroquial, horarios y formulario de contacto.
- Autenticación con JWT de acceso y renovación mediante cookie `HttpOnly`, además de control de acceso por roles.
- Administración de espacios, eventos y reservas con validación de traslapes y disponibilidad por fecha y horario.
- Gestión de ministros y tareas: asignación, reasignación, calendario semanal, control de disponibilidad y alertas de rotación.
- Solicitud y respuesta de cambios de turno entre ministros, con reasignación automática al aceptar.
- Notificaciones para recordatorios, confirmación o excusa de asistencia, inasistencias, cambios de turno y periodos de ausencia.
- Bandeja de notificaciones con mensajes enviados, papelera, restauración y vaciado manual. Los elementos de la papelera se purgan al consultarla después de 15 días.
- Registro de periodos de ausencia para ministros, con aviso a sacerdotes y coordinadores de ministros.

Los mensajes enviados desde el formulario público se guardan en la base de datos y generan una notificación no leída para los usuarios con rol de Sacerdote o Administrador.

## Tecnologías

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Axios |
| Backend | Node.js, Express 4, TypeScript |
| Base de datos | MariaDB 11 |
| Contenedores | Docker y Docker Compose |
| Pruebas | Vitest y Grafana k6 |
| Automatización | GitHub Actions |

## Inicio rápido

### Requisitos

- Docker Engine y Docker Compose.
- Git.

### Levantar el entorno local

```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
cp .env.example .env
```

Complete `app/.env` con los valores de su entorno. Las credenciales o secretos de producción no deben versionarse.

```bash
docker compose up --build -d
docker compose ps
```

En el primer inicio, MariaDB crea el esquema y carga los datos de ejemplo desde `app/database/init/`.

| Servicio | Dirección |
|---|---|
| Portal y aplicación web | http://localhost:5173 |
| API | http://localhost:3001 |
| Estado de la API | http://localhost:3001/health |
| Adminer | `http://localhost:${ADMINER_PORT}` |

Para detener el entorno:

```bash
docker compose down
```

Para reinicializar la base de datos local, incluyendo la eliminación de todos sus datos y volumen:

```bash
docker compose down -v
docker compose up --build -d
```

### Desarrollo sin Docker

Se necesitan dos terminales y una instancia accesible de MariaDB configurada en `app/.env`.

```bash
cd app/backend
npm install
npm run dev
```

```bash
cd app/frontend
npm install
npm run dev
```

## Configuración

Copie `app/.env.example` como `app/.env`. El backend no inicia fuera de pruebas si faltan sus variables críticas de conexión o secretos JWT.

| Grupo | Variables |
|---|---|
| Frontend | `VITE_API_URL` |
| API | `PORT`, `NODE_ENV`, `CORS_ORIGIN` |
| MariaDB | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_ROOT_PASSWORD` |
| Sesión | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` |
| Administración local | `ADMINER_PORT` |

`CORS_ORIGIN` admite orígenes separados por comas. Para desarrollo local, incluya `http://localhost:5173` si se configura explícitamente.

## Roles y acceso

| Rol | Responsabilidades principales |
|---|---|
| Administrador | Acceso completo y registro de usuarios. |
| Sacerdote | Gestión de espacios, reservas, eventos y usuarios. |
| Coordinador de Ministros | Gestión de sus ministros, tareas y comunicaciones relacionadas. |
| Coordinador de Grupos | Gestión de grupos y solicitudes de reserva. |
| Ministro | Consulta de servicios, confirmación de asistencia, cambios de turno y ausencias. |

El sistema aplica una jerarquía de permisos. Por ejemplo, Administrador puede realizar las acciones de los demás roles, mientras que un Coordinador de Ministros solo opera sobre los ministros bajo su coordinación cuando la regla de negocio así lo exige.

## Rutas de la interfaz

| Ruta | Descripción |
|---|---|
| `/` | Portal público, horarios e información de contacto. |
| `/login` | Inicio de sesión. |
| `/dashboard` | Resumen y accesos rápidos. |
| `/tareas`, `/calendario` | Gestión y calendario de servicios. |
| `/ministros`, `/ausencias`, `/cambios-turno` | Operación de ministros. |
| `/reservas`, `/mis-reservas`, `/espacios` | Espacios y reservas. |
| `/eventos`, `/grupos` | Eventos y grupos parroquiales. |
| `/notificaciones` | Bandeja, enviados y papelera. |
| `/perfil` | Datos del usuario autenticado. |

## API

La API usa el prefijo `/api`. Salvo autenticación, salud y contacto público, los endpoints requieren un token Bearer válido. El cliente web gestiona la renovación de sesión automáticamente.

| Recurso | Prefijo | Operaciones destacadas |
|---|---|---|
| Autenticación | `/api/auth` | Inicio, renovación, cierre de sesión y registro autorizado. |
| Contacto público | `/api/contacto` | Envío de mensajes desde la landing. |
| Tareas | `/api/tareas` | CRUD, asignación, desasignación y reasignación. |
| Reservas | `/api/reservas` | Creación, edición, consulta y cambio de estado. |
| Espacios | `/api/espacios` | Gestión y consulta de disponibilidad. |
| Notificaciones | `/api/notificaciones` | Lectura, asistencia, enviados, papelera y envío. |
| Cambios de turno | `/api/cambios-turno` | Solicitud, consulta y respuesta. |
| Ausencias | `/api/ausencias` | Registro de periodos de ausencia. |
| Personas, grupos y eventos | `/api/personas`, `/api/grupos`, `/api/eventos` | Consultas y administración según rol. |

La referencia detallada de ausencias y una colección de Postman se encuentran en [`docs/hu31/`](docs/hu31/README.md).

## Datos de prueba

Al inicializar un volumen nuevo se crean cuentas de ejemplo.

| Correo | Rol | Contraseña |
|---|---|---|
| `sacerdote@parroquia.com` | Sacerdote | `password123` |
| `coord.min@parroquia.com` | Coordinador de Ministros | `password123` |
| `coord.grupos@parroquia.com` | Coordinador de Grupos | `password123` |
| `ministro@parroquia.com` | Ministro | `password123` |
| `diego@parroquia.com` | Administrador | `admin123` |

Estas cuentas son exclusivamente para desarrollo y demostración. Cámbielas o elimínelas en cualquier entorno compartido o productivo.

## Pruebas y calidad

### Pruebas unitarias y estáticas

```bash
cd app/backend
npm test
npm run coverage

cd ../frontend
npm run lint
npm test
npm run coverage
```

El flujo de integración continua ejecuta build, lint y cobertura del frontend, además de cobertura del backend, en pull requests hacia `main` y `develop`.

### Carga y estrés

La suite k6 cubre autenticación, disponibilidad de espacios, notificaciones, reservas, calendario, picos y ejecución prolongada.

```bash
docker compose -f tests/k6/docker-compose.yml up -d --build --wait
K6_STACK=true ./tests/k6/run-tests.sh all load
K6_STACK=true ./tests/k6/run-tests.sh all stress
```

Consulte las opciones, escenarios y resultados en [`tests/k6/README.md`](tests/k6/README.md). Las pruebas de volumen e inundación de la base de datos están documentadas en [`tests/db-volume/`](tests/db-volume/).

## Estructura del repositorio

```text
app/
├── frontend/          # Interfaz React/Vite
├── backend/           # API Express y pruebas unitarias
├── database/
│   ├── init/          # Esquema y datos iniciales de MariaDB
│   └── migrations/    # Migraciones incrementales
└── docker-compose.yml # Entorno local completo
docs/                  # Informes, evidencia y documentación funcional
tests/
├── k6/                # Pruebas de carga y estrés
└── db-volume/         # Pruebas de volumen de MariaDB
```

## Documentación y despliegue

- Los documentos de cada sprint, entregables y registros de tiempo se conservan en [`docs/`](docs/).
- El workflow de integración continua está en [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
- El workflow de despliegue se ejecuta al hacer push a `main` y está en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Equipo

| Integrante | Carné |
|---|---:|
| Diego André Calderón Salazar | 241263 |
| Pedro Julio Caso Tzunun | 241286 |
| Javier Sebastián Alvarado Monzón | 24546 |
| Hugo Méndez Lee | 241265 |
| José Miguel Rosas Guerra | 241274 |
