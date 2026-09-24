# HU-31: notificar ausencia desde la aplicación

Rama `feature/notificar-periodo-ausencia-frontend`, creada directamente desde `develop`.

## Dependencia de backend

Para enviar notificaciones debe estar disponible la rama `feature/notificar-periodo-ausencia-backend` (incluidos título y justificación) y sus migraciones. Esta rama frontend no incorpora esos commits: integrar ambas ramas en `develop` antes de desplegar el flujo completo. El endpoint es `POST /api/ausencias`.

## Página

Entrar como `ministro@parroquia.com` / `password123` y seleccionar **Notificar Ausencia** en el menú (`/ausencias`). Se mantiene el `AppShell`, encabezado, menú, tipografía, colores, tarjeta y controles compartidos de la aplicación.

- Fecha de inicio a la izquierda y fecha de fin a la derecha, alineadas y con el calendario nativo usado en Reservas. En anchos de hasta 600 px, el formulario apila ambos campos.
- Las fechas son obligatorias, inclusivas, y se permite una ausencia de un día. Un rango invertido se señala en pantalla y no se envía a la API.
- Razón de la ausencia: campo de texto obligatorio, máximo 255 caracteres, enviado como `titulo`.
- Justificación o descripción: texto multilínea obligatorio, máximo 5000 caracteres, enviado como `justificacion`.
- El ID procede de la sesión y no se muestra en pantalla. Se recortan espacios exteriores y se rechazan textos en blanco.
- Se bloquean los controles durante el envío y los envíos repetidos. Al completarse se muestra confirmación y se limpia el formulario. Si falla, se conservan los datos y se muestra un mensaje para reintentar.
- Solo el rol exacto Ministro ve el acceso y puede abrir la página; los otros roles se redirigen al dashboard.

## Verificación

`npm run build`, `npm run lint` y `npm test` en `app/frontend`: compilación y lint correctos; 31 pruebas aprobadas, incluidas 16 del flujo de ausencias. Cubren payload, fechas invertidas y del mismo día, campos obligatorios, espacios, error/reintento, envíos repetidos y acceso por roles.

Revisión en navegador con la cuenta de ministro: página, menú, encabezado y selectores nativos presentes; posiciones de ambos campos de fecha verificadas a la misma altura en escritorio.
