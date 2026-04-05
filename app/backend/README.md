# Backend API - Módulo de Autenticación ([HU-01])

Este documento resume la implementación de la **Historia de Usuario 01 (Endpoint de autenticación con Express)**, desarrollada sobre la rama `feature/login-backend`. El diseño sigue una arquitectura por capas modular y segura.

## 📋 Resumen de Cambios

Se construyó la base estructural para el manejo de sesiones y seguridad de la aplicación, implementando el registro de usuarios y el inicio de sesión utilizando `JSON Web Tokens (JWT)` y encriptación de contraseñas.

### 1. Configuración de Base de Datos (`src/config/db.ts`)
- Implementación de un **Pool de Conexiones** asíncrono (`mysql2/promise`) conectado a MariaDB.
- Centralización de credenciales usando variables de entorno (`dotenv`) para no exponer datos sensibles en el repositorio.

### 2. Controladores de Autenticación (`src/controllers/auth.controller.ts`)
Se desarrollaron dos lógicas principales:
- **`register`**: Endpoint para dar de alta nuevos usuarios. Verifica colisiones de correos y encripta la contraseña usando `bcryptjs` con 10 rondas de saltos.
- **`login`**: Autentica usuarios comparando el hash de la base de datos contra el input. Genera y firma un token JWT seguro con vigencia predefinida, conteniendo el `rol_id`.

### 3. Sistema de Rutas (`src/routes/auth.routes.ts`)
- Mapeo de métodos POST hacia los endpoints funcionales bajo la sub-ruta `/api/auth/register` y `/api/auth/login`.

### 4. Refactorización y Buenas Prácticas (`src/utils/httpStatus.ts`)
- Creación de un `enum` nativo en TypeScript para el manejo semántico de los Códigos de Estado HTTP (ej. `HttpStatus.OK`, `HttpStatus.UNAUTHORIZED`), eliminando *magic numbers* y favoreciendo el mantenimiento a largo plazo.

## 🛠️ Tecnologías y Librerías Utilizadas
* **Express & Node.js**: Infraestructura base.
* **bcryptjs**: Hashing de credenciales unidireccional.
* **jsonwebtoken**: Generación y verificación de tokens.
* **mysql2**: Conector a la DB con soporte a promesas para evitar *callback hell*.

## 🧪 Pruebas (Instrucciones)
Las pruebas pueden realizarse con Thunder Client, Postman o cURL apuntando a `http://localhost:<PORT>/api/auth`:
1. `POST /register`: Requiere cuerpo JSON con `nombre`, `correo`, `password` y `rol_id`.
2. `POST /login`: Requiere cuerpo JSON con `correo` y `password`. Devuelve token de sesión HTTP 200.
