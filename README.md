
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

## Descripción del Problema

La parroquia depende significativamente del servicio comunitario para sus actividades litúrgicas y sociales. Sin embargo, el sistema de organización actual presenta varios retos:

- **Asignación Manual:** Los coordinadores utilizan hojas de Excel y mensajes de WhatsApp, lo cual es tedioso y propenso a errores humanos.
- **Falta de Visibilidad:** Los voluntarios a menudo no revisan los métodos actuales, lo que genera fallos en la asistencia.
- **Conflictos de Reservas:** La gestión de salones se realiza mediante llamadas y memoria, provocando duplicidad en el uso de espacios.

---

## Objetivos

**General:** Modernizar y centralizar la gestión administrativa de la Parroquia San Pedro Nolasco, optimizando la coordinación de sus voluntarios y el uso de sus instalaciones.

**Específicos:**
- Analizar los puntos críticos del sistema actual basado en Excel.
- Definir perfiles de usuario (sacerdotes, coordinadores, ministros) para entender sus necesidades reales.
- Centralizar la comunicación de roles y la disponibilidad de salones en una sola plataforma accesible.
- Implementar un sistema visualmente intuitivo que motive el cumplimiento de los servicios.

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

**1. Clonar el repositorio**
```bash
git clone https://github.com/hmndzzl/Software_Proyecto.git
cd Software_Proyecto
```

**2. Colocar el archivo `.env` en la raíz del proyecto**

Solicitar el archivo `.env` al líder del equipo y colocarlo en:
```
Software_Proyecto/
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

---

## Estructura del Proyecto

```
Software_Proyecto/
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── backend/                # Express + TypeScript
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── init/
│       ├── 01_schema.sql   # Estructura de la base de datos
│       └── 02_seeds.sql    # Datos iniciales
├── .env.example
├── .gitignore
├── docker-compose.example.yml
└── README.md
```

---

## Documentación del Proyecto

| Entrega | Documento |
|---|---|
| Corte 1 | [Primer Corte del Proyecto - Grupo 3.pdf](./Corte1/Primer%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |
| Corte 2 | [Segundo Corte del Proyecto - Grupo 3.pdf](./Corte2/Segundo%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |
| Corte 3 | [Tercer Corte del Proyecto - Grupo 3.pdf](./Corte3/Tercer%20Corte%20del%20Proyecto%20-%20Grupo%203.pdf) |

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
