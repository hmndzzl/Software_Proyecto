# Sprint 10 — Gestión de coordinadores y ministros

## Uso de la pantalla

Ingresar como **Sacerdote o Admin** y abrir **Ministros → Gestionar coordinadores**.
URL de desarrollo: `http://localhost:5173/ministros/coordinadores`.

1. Elegir un coordinador. Se muestran sus ministros y el estado de sus cuentas.
2. Elegir un ministro activo y pulsar **Asignar ministro**. Los ya asignados no se
   ofrecen otra vez en el selector.
3. Para retirar una relación, pulsar **Quitar** en su fila y **Confirmar retiro**.
   Cancelar el diálogo conserva la relación.
4. Entrar como el coordinador y recargar su directorio: los cambios se reflejan
   mediante el filtrado existente de `GET /api/personas`.

Se reutilizan PageHeader, Card, Field/SelectUI, Btn, Badge, Modal, estados de carga/error
y tablas ordenables. La pantalla mantiene los colores, fuentes y diseño adaptable
existentes. El acceso directo a la URL también exige Sacerdote o Admin.

## Reglas y persistencia

- Se reutiliza `coordinador_ministro`; **no hay migración ni columnas nuevas**.
- Se asignan únicamente personas con rol exacto Ministro a personas con rol exacto
  Coordinador de Ministros, con ambas cuentas activas. Sacerdote/Admin administran
  las relaciones, pero no son destinatarios de ellas por herencia de roles.
- La clave primaria compuesta evita relaciones duplicadas. PUT y DELETE son
  idempotentes: repetir una operación válida devuelve 200.
- Se conserva la relación muchos-a-muchos actual: agregar a un coordinador no
  retira al ministro de otros. No se establece exclusividad nueva.
- Eliminar una relación no elimina cuentas, tareas ni relaciones de otros coordinadores.
  Como consecuencia del filtrado ya existente, el coordinador retirado deja de ver
  a ese ministro como propio.
- Los coordinadores no activos se pueden consultar para retirar sus relaciones,
  pero no reciben nuevas asignaciones. Las relaciones existentes de personas no
  activas se muestran y se pueden retirar.
- Las escrituras validan las personas y sus estados dentro de una transacción con
  bloqueo de filas. Si fallan, se revierte la operación.
- No se reemplaza una lista completa: cada petición modifica solo la pareja indicada.

## API y Postman

Importar `coordinadores-ministros.postman.json` de esta carpeta. Configurar `baseUrl`
como `http://localhost:3001`, `token` con una sesión válida de Sacerdote/Admin y los
identificadores `coordinadorId`/`ministroId` obtenidos de las consultas.
La colección no contiene credenciales ni tokens reales.

Todas las rutas siguientes requieren `Authorization: Bearer <token>`.
Los errores usan `{ "mensaje": "..." }`.

| Método | URL local | Respuesta 200 |
| --- | --- | --- |
| GET | `http://localhost:3001/api/coordinadores-ministros` | Array de coordinadores: `id`, `nombre`, `estado_cuenta` |
| GET | `http://localhost:3001/api/coordinadores-ministros/7/ministros` | Array de asignados: `id`, `nombre`, `correo`, `estado_cuenta` |
| PUT | `http://localhost:3001/api/coordinadores-ministros/7/ministros/9` | `{ "mensaje": "Ministro asignado al coordinador" }` |
| DELETE | `http://localhost:3001/api/coordinadores-ministros/7/ministros/9` | `{ "mensaje": "Relación retirada" }` |

PUT y DELETE **no requieren cuerpo JSON**: los dos identificadores están en la URL.
Para elegir ministros activos se reutiliza `GET http://localhost:3001/api/personas`.
Las consultas vacías devuelven `[]`. Los identificadores de los ejemplos corresponden
al seed; deben sustituirse por los de cada entorno.

Errores esperados:

- **400:** identificador inválido, destinatario sin rol Ministro o cuenta no activa al asignar.
- **401:** sin sesión válida.
- **403:** usuario autenticado con otro rol, incluido el propio coordinador.
- **404:** coordinador inexistente/sin rol de Coordinador de Ministros, o persona inexistente.
- **500:** error de base de datos, con mensaje genérico.

Secuencia de comprobación: consultar la lista actual, asignar un ministro, repetir
el PUT (sin duplicados), consultar de nuevo, retirar la relación y verificar que las
otras relaciones permanecen. Repetir como Coordinador/Ministro debe dar 403.
Consultar sin token debe dar 401. Usar datos de prueba o una base aislada para
validar escrituras sin alterar las asignaciones institucionales.

## Entornos y verificación

No hay preparación nueva de base de datos. En Docker, reconstruir el backend cuando
se ejecute la imagen compilada: desde `app`, `docker compose up -d --build --no-deps backend`.
El frontend de desarrollo con `target: dev` y `src` montado recibe los cambios de código;
en un entorno compilado también hay que reconstruir su imagen. No borrar volúmenes.

Pruebas:

- Backend: `npm run build` y `npm run coverage` (incluye permisos, validaciones,
  transacciones y errores de conexión de las rutas nuevas).
- Frontend: `npm run build`, `npm run lint` y `npm run coverage` (incluye asignación,
  retiro/cancelación, reintentos, respuestas fuera de orden, estados vacíos y permisos).
- Flujo completo: desde backend, `npm run test:coordinadores-ui`. Requiere Docker,
  dependencias de backend y frontend, y Chromium de Playwright. Instalar este último
  con `npx playwright install chromium` desde frontend. En Windows se puede usar Edge
  instalado mediante `$env:PLAYWRIGHT_CHANNEL = 'msedge'`.

El flujo completo crea MariaDB temporal, ejecuta la API local en un puerto libre y
Vite en `http://localhost:4175`. Verifica los cambios en los directorios de dos
coordinadores, persistencia al recargar, idempotencia, conservación de tareas,
restricciones por rol y vista móvil. Cierra sus servicios al terminar y no toca la
base habitual. Capturas e informes quedan en `app/backend/test-results/`, fuera de Git.

Validación realizada: 547 pruebas frontend y 663 backend correctas, además de las
2 pruebas con navegador/API/MariaDB. Cobertura frontend por encima del mínimo del 95%
en líneas, sentencias, ramas y funciones. Builds y lint correctos.
