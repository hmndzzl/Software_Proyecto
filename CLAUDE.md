# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Administrative platform for San Pedro Nolasco Parish — a full-stack task management app.

**Stack:** React 18 + Vite + TypeScript (frontend) · Express + TypeScript (backend) · MariaDB 11

## Commands

### Docker (recommended)
```bash
cd app
docker compose up --build -d   # first run
docker compose up -d           # subsequent runs
docker compose down
```

### Frontend (app/frontend)
```bash
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

### Backend (app/backend)
```bash
npm run dev    # ts-node-dev with hot reload → http://localhost:3001
npm run build  # Compile to dist/
npm start      # Run compiled JS
```

## Environment Setup

Copy `app/.env.example` to `app/.env` and fill in values. Required variables:

| Variable | Used by |
|---|---|
| `VITE_API_URL` | Frontend — base URL for API calls |
| `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Backend |
| `DB_ROOT_PASSWORD` | MariaDB container |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Backend auth |

## Architecture

```
app/
├── frontend/        React + Vite + TypeScript
│   ├── api/         Axios client (reads VITE_API_URL)
│   ├── context/     AuthContext — JWT auth state
│   ├── modules/     Feature modules (e.g. Tareas/Tasks)
│   └── pages/       Route-level pages (Login, Dashboard)
├── backend/         Express + TypeScript
│   ├── controllers/ Business logic per resource
│   ├── middlewares/ JWT auth/authz guards
│   └── routes/      Express router definitions
├── database/
│   └── init/        01_schema.sql, 02_seeds.sql (run by MariaDB container on first start)
└── docker-compose.yml
```

**Data flow:** React → Axios (`VITE_API_URL`) → Express controllers → MariaDB

**Auth:** JWT tokens issued by backend, stored client-side, validated via middleware on protected routes.

## Deployment

GitHub Actions (`deploy.yml`) deploys to an Azure VM on every push to `main`. Changes to `main` go live automatically.
