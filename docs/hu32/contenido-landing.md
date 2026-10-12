# HU-32 — Contenido editable de la landing (Sprint 9)

Entrega de backend para P3: Pedro puede consumir estos endpoints desde la landing
y desde la futura pantalla de edición. No se modifica el frontend ni se gestionan imágenes.
Admin y Sacerdote son los roles autorizados; si Javier define otros permisos,
la regla está centralizada en `app/backend/src/routes/landing.routes.ts`.

## Endpoints

| Método y ruta | Acceso | Resultado |
| --- | --- | --- |
| `GET /api/public/landing` | Público, sin token | Documento completo de contenido |
| `GET /api/landing` | Admin/Sacerdote | Mismo documento para el editor |
| `PATCH /api/landing` | Admin/Sacerdote | Guarda cambios y devuelve el documento completo actualizado |

Base local: `http://localhost:3001`. Para las rutas administrativas usar
`Authorization: Bearer <token válido>` (sesión de Clerk o JWT admitido por el backend).
La edición requiere `Content-Type: application/json`.
La ruta pública solo admite lectura. Los GET y PATCH exitosos devuelven 200.
Todas las respuestas de contenido llevan `Cache-Control: no-store`.

Ejemplo de edición parcial:

```json
{
  "quienes_somos": {
    "descripcion": "Somos una comunidad parroquial al servicio de las familias."
  },
  "cantidad_grupos": 15,
  "cantidad_espacios": 8,
  "contacto": {
    "telefono": "+502 5555 1234"
  },
  "horarios_misa": [
    { "dias": "Domingo", "horas": ["08:00", "11:00", "18:00"] },
    { "dias": "Lunes a viernes", "horas": ["18:30"] }
  ]
}
```

Los campos omitidos se conservan, también dentro de `quienes_somos`,
`valores_encabezado` y `contacto`. Las listas se reemplazan completas; `[]` las vacía.
Las ediciones se publican inmediatamente: no hay borradores ni aprobación adicional.
La transacción bloquea la fila al combinar cambios para evitar perder campos de
ediciones simultáneas. Cuando dos editores modifican el mismo campo, prevalece la
última edición confirmada.

## Documento público y validaciones

| Campo | Forma / límites |
| --- | --- |
| `nombre_parroquia`, `lema`, `titulo_principal` | Texto no vacío, hasta 255 caracteres |
| `descripcion_principal` | Texto no vacío, hasta 5000 caracteres |
| `quienes_somos` | Objeto: `titulo` (255), `descripcion`, `mision`, `comunidad`, `servicio` (5000 cada uno); textos no vacíos |
| `cantidad_grupos`, `cantidad_espacios` | Enteros JSON entre 0 y 1 000 000 |
| `valores_encabezado` | Objeto con `titulo` (255) y `descripcion` (5000), no vacíos |
| `valores` | Hasta 20 objetos completos con `titulo` (255) y `descripcion` (2000), no vacíos |
| `horarios_misa` | Hasta 30 objetos completos con `dias` (texto hasta 255) y `horas` (hasta 24 horas `HH:mm`, de 00:00 a 23:59) |
| `horarios_oficina` | Hasta 30 objetos completos con `dias` (255) y `horario` (500), no vacíos; horario es texto para permitir rangos |
| `contacto` | Objeto con `titulo` (255, no vacío), `direccion` (1000), `correo` (255, formato email) y `telefono` (50, dígitos, espacios, guiones, paréntesis y prefijo `+` opcional) |
| `texto_pie` | Texto hasta 2000 caracteres |

`direccion`, `correo`, `telefono` y `texto_pie` admiten `""` para ocultar información.
Los textos se recortan en los extremos. No se aceptan `null`, tipos incorrectos,
campos desconocidos ni objetos vacíos en un PATCH. Los elementos de listas deben
contener todos sus campos; los cambios de secciones sí pueden ser parciales.
Campos de imágenes o archivos se rechazan como cualquier campo desconocido.

Los horarios son informativos en hora local de Guatemala y no generan eventos o reservas.
Las cantidades de grupos y espacios son contenido editorial: no calculan ni alteran
las tablas `grupo` o `espacio`. Si cambia una cantidad, el editor debe revisar también
los textos que la mencionen (por ejemplo, `quienes_somos.comunidad`).

El contenido se entrega como texto, no como HTML. P3 debe renderizarlo como texto
escapado, sin `dangerouslySetInnerHTML`. No se incluyen metadatos internos de la tabla,
credenciales ni datos personales de usuarios.

Errores:

- 400: body vacío, campo desconocido, tipo, formato o límite inválido. No guarda cambios.
- 401: falta una sesión válida para la ruta administrativa.
- 403: rol sin permiso (ministro o coordinadores).
- 404: fila de contenido no inicializada.
- 500: error de base de datos; mensaje genérico sin detalles internos.

## Base de datos y despliegue

La tabla `contenido_landing` guarda un documento JSON en la única fila `id = 1`
y la fecha de actualización. El contenido inicial reproduce los textos actuales de
la landing, las cantidades 12/7, los seis valores y los horarios/contacto actuales.
Es una copia del contenido ya existente, no una verificación de esos datos institucionales.

En bases existentes ejecutar `app/database/migrations/20261011_contenido_landing.sql`.
La migración puede repetirse y no sobrescribe contenido previamente editado.
No elimina datos ni cambia las tablas de grupos, espacios o eventos.
En bases nuevas, Docker ejecuta `app/database/init/03_landing.sql` después del schema y los seeds.
Recrear contenedores con un volumen existente no ejecuta automáticamente estos archivos.
Después de desplegar el código, reiniciar el backend si el proceso de desarrollo no
detecta las rutas nuevas. Aplicar la migración en cada entorno.

## Prueba manual

Se incluye `contenido-landing.postman.json` con `base_url` y `token` como variables.
No contiene credenciales; copiar un token válido de Admin/Sacerdote para la edición.

1. GET público sin sesión: comprobar 200 y el contenido inicial.
2. PATCH autenticado: editar una descripción o cantidad.
3. Repetir GET público: comprobar que el valor cambió y los campos omitidos permanecen.
4. PATCH sin token: comprobar 401; con un rol sin permiso: 403.
5. Enviar `{ "cantidad_grupos": -1 }`: comprobar 400 y que no se guardó.

## Pruebas automatizadas

Desde `app/backend`: `npm test`, `npm run build` y `npm run test:integration`.
Las pruebas de integración usan una MariaDB temporal separada de la base local.
Verifican persistencia, edición parcial, conservación de datos internos de grupos/espacios,
rechazo de entrada inválida, ediciones concurrentes y migración repetible que conserva el contenido.
