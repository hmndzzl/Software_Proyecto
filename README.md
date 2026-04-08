# Plataforma Administrativa - Parroquia San Pedro Nolasco

## Equipo de Trabajo (Grupo 3)

| Nombre | Carné |
|---|---|
| Diego André Calderón Salazar | 241263 |
| Pedro Julio Caso | 241286 |
| Javier Sebastián Alvarado Monzón | 24546 |
| Hugo Méndez Lee | 241265 |
| José Miguel Rosas Guerra | 241274 |

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Express + TypeScript |
| Base de datos | MariaDB 11 |
| Contenedores | Docker + Docker Compose |

---

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
- Archivo `.env` recibido del líder del equipo.

---

## Instalación y Despliegue

**1. Clonar el repositorio y cambiar a develop**
```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto/app
git checkout develop
```

**2. Colocar el archivo `.env` dentro de `/app`**

Solicitar el archivo `.env` al líder del equipo y colocarlo en:
```
Software_Proyecto/
└── app/
    └── .env   ← aquí
```

**3. Copiar el archivo de Docker Compose**
```bash
cp docker-compose.example.yml docker-compose.yml
```

**4. Levantar el proyecto**
```bash
docker compose up --build -d
```

> El flag `--build` solo es necesario la primera vez, o cuando se modifique un `Dockerfile` o `package.json`. Para el uso diario basta con `docker compose up -d`.

**5. Acceder a la aplicación**

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| Base de datos | localhost:3306 |

> **Nota para visualizar la página:** Al entrar a la URL del frontend (`http://localhost:5173`), visualizarás la vista de **Login**. Inicia sesión (puedes revisar el archivo `app/database/init/02_seeds.sql` para consultar usuarios de prueba disponibles). Tras iniciar exitosamente, serás redirigido al Dashboard, desde el cual podrás utilizar el **Navbar** unificado y acceder al módulo actual de **Tareas**.

---

## Estructura del Proyecto
```
Software_Proyecto/
└── app/
    ├── frontend/                   # React + Vite + TypeScript
    │   ├── src/
    │   │   ├── api/                # Llamadas a la API backend
    │   │   ├── components/         # Componentes compartidos (Navbar, etc.)
    │   │   ├── context/            # Contextos de React (ej. AuthContext)
    │   │   ├── modules/            # Módulos específicos (ej. tareas)
    │   │   ├── pages/              # Páginas principales (Login, Dashboard)
    │   │   └── types/              # Definiciones de tipos TypeScript
    │   ├── Dockerfile
    │   └── package.json
    ├── backend/                    # Express + TypeScript
    │   ├── src/
    │   │   ├── config/             # Configuración (BD, etc.)
    │   │   ├── controllers/        # Lógica de los endpoints
    │   │   ├── middlewares/        # Middlewares (ej. Autenticación)
    │   │   ├── routes/             # Definición de rutas Express
    │   │   ├── types/              # Tipos TypeScript
    │   │   ├── utils/              # Utilidades
    │   │   └── app.ts              # Archivo principal
    │   ├── Dockerfile
    │   └── package.json
    ├── database/
    │   └── init/
    │       ├── 01_schema.sql       # Estructura de la base de datos
    │       └── 02_seeds.sql        # Datos iniciales
    ├── .env.example
    ├── .gitignore
    ├── docker-compose.example.yml
    └── README.md
```

---

## Estado Actual y Funcionalidades
Actualmente el proyecto cuenta con la base estructural completada y probada:
- **Autenticación y Redirección:** Flujo de login funcional conectado al backend con redirección segura al Dashboard tras autenticarse.
- **Navegación:** Se cuenta con un Navbar estandarizado. 
- **Módulos Frontend:** Módulo inicial de "Tareas" en desarrollo, con la visualización básica de asignaciones.
- **Diseño Estandarizado:** CSS consistente entre módulos y componentes reutilizables.
- **Entorno de Pruebas:** Funcionalidad backend y frontend verificada mediante Testing de estabilidad en la aplicación.

---

## Flujo de Trabajo con Git
```
main        ← código estable únicamente
└── develop ← rama de integración
    └── feature/nombre-funcionalidad ← trabajo individual
```

Cada integrante crea su rama desde `develop`:
```bash
git checkout develop
git checkout -b feature/nombre-funcionalidad
```

Al terminar, abre un Pull Request hacia `develop`. Nunca se trabaja directamente sobre `main`.

---

*Universidad del Valle de Guatemala — Ingeniería en Software 1, Sección 10 — 2026*