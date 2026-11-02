# SEC-03: revocación de sesiones JWT

El acceso JWT propio mantiene una sesión en `sesion_jwt`. La base guarda únicamente
el hash SHA-256 del refresh token, su vencimiento y la fecha de revocación. Cada
renovación reemplaza ese hash bajo bloqueo transaccional. Si se presenta un refresh
firmado que ya fue consumido, se revoca la sesión completa: tampoco funcionan sus
access tokens. Este criterio sigue la detección de reutilización descrita en
[RFC 9700, sección 4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2).

Logout revoca la sesión identificada por la cookie o el bearer propio y borra la
cookie. Los otros dispositivos conservan sus sesiones. Cambiar la contraseña o dar
de baja una cuenta revoca todas sus sesiones JWT dentro de la misma transacción
que modifica la cuenta. Una baja conserva la respuesta `403/CUENTA_BAJA`; reactivar
la cuenta no recupera las sesiones revocadas. Un fallo de revocación devuelve 500,
no un cierre exitoso. Si el navegador no tiene conexión, su limpieza local no
garantiza la revocación en el servidor.

## Despliegue en una base existente

1. Hacer el respaldo habitual de la base de datos.
2. Antes de arrancar el backend nuevo, importar
   `app/database/migrations/20261104_sesiones_jwt.sql` en la misma base que usa el
   backend, mediante el cliente MariaDB o la herramienta de administración habitual.
   Es repetible y no modifica personas ni elimina sesiones existentes.
3. Desplegar backend y frontend juntos por el procedimiento habitual. El workflow
   de despliegue actual no ejecuta esta migración automáticamente.
4. Volver a iniciar sesión: los JWT anteriores, sin identificador de sesión, se
   rechazan. No se necesita cambiar secretos ni duraciones para esta corrección.
5. Verificar login, navegación, renovación y logout antes de dar el cambio por
   corregido en producción.

En una instalación nueva, `database/init/01_schema.sql` ya crea la tabla. No ejecutar
el esquema completo sobre una base existente, ni borrar volúmenes para migrarla.
Si se vuelve al backend anterior, conservar la tabla no le afecta, pero ese backend
volvería a tener el problema de revocación original.

Se conservan las duraciones configuradas por `JWT_EXPIRES_IN` y
`JWT_REFRESH_EXPIRES_IN`, incluido el vencimiento renovable que ya tenía la aplicación.
La cookie usa la expiración real del refresh emitido. Los registros vencidos pueden
depurarse en mantenimiento con `DELETE FROM sesion_jwt WHERE expira_en < UNIX_TIMESTAMP()`;
el acceso ya se rechaza aunque todavía no se hayan depurado.

## Alcance de Clerk y de varias pestañas

Esta tabla controla los JWT emitidos por `/api/auth/login` y `/api/auth/refresh`.
Clerk mantiene su propio ciclo de sesiones; el frontend conserva su `signOut` actual.
La revocación global de sesiones Clerk y la reautenticación al editar credenciales
son una revisión independiente. No se ha cambiado la configuración de Nginx ni
se ha aplicado SEC-02.

El cliente HTTP coordina renovaciones entre pestañas del mismo origen con Web Locks
(disponible en navegadores compatibles en HTTPS o localhost). Si otra pestaña ya
renovó, usa su access token. No guarda respuestas tardías tras logout ni sobrescribe
un nuevo login. En navegadores sin Web Locks se conserva la cola por pestaña; dos
renovaciones simultáneas desde pestañas distintas pueden disparar la detección de
reutilización y exigir otro login. No se abre una excepción de seguridad para ese caso.

## Comprobación automatizada

En `app/backend`, con Docker disponible:

```sh
npm run build
npm run coverage -- --maxWorkers=1 --testTimeout=15000
npm run test:integration
```

`sesiones-jwt.integration.test.ts` utiliza MariaDB desechable, cuentas y secretos
exclusivos de prueba. Comprueba hash, migración repetible, logout, rotación, replay,
concurrencia, aislamiento entre dispositivos, cambio de contraseña, baja,
expiración, tokens antiguos y rollback ante fallos de revocación. Las pruebas
existentes de integración también crean sesiones persistidas cuando necesitan JWT.

En `app/frontend`:

```sh
npm run build
npm run lint
npm run coverage -- --maxWorkers=1 --testTimeout=15000
npm run test:regression
```

## Comprobación manual local

Usar una cuenta local de prueba y un cliente HTTP con cookies; no publicar capturas
con tokens ni credenciales. La base de la API local suele ser
`http://localhost:3001/api`; si se usa un proxy, respetar su prefijo configurado.

1. Enviar `POST /auth/login` con correo y contraseña. Conservar temporalmente el
   access de la respuesta y la cookie `refreshToken` en el cliente de prueba.
2. Enviar `GET /auth/me` con `Authorization: Bearer <access>`: debe responder 200.
3. Enviar `POST /auth/logout` con esa cookie y/o bearer: debe responder 200.
4. Reenviar el access anterior a `/auth/me` y la cookie anterior a
   `POST /auth/refresh`: ambos deben responder 401. Repetir logout devuelve 200.
5. Iniciar otra sesión, renovar una vez con `POST /auth/refresh`, y comprobar que
   devuelve un access nuevo y reemplaza la cookie. Presentar deliberadamente el
   refresh anterior debe dar 401 e invalidar también el refresh nuevo de esa sesión.
6. Iniciar dos sesiones independientes con un cliente HTTP y una ventana privada.
   Cerrar una no debe cerrar la otra. Cambiar la contraseña desde el perfil sí debe
   invalidar las dos sesiones JWT; entrar de nuevo con la contraseña nueva.

Los pasos de replay necesitan conservar la cookie anterior explícitamente: el
navegador normal la reemplaza o elimina. Si se prueba solo con el login visual de
Clerk, no se está comprobando este mecanismo JWT propio.
