# D4 — Calendario unificado

## Uso

Abrir **Calendario** (`/calendario`). La pantalla inicia en **Semana**, presentada
como una agenda por días para que los horarios y nombres completos sean legibles.
**Mes** muestra una cuadrícula en escritorio y una agenda mensual en pantallas
estrechas. **Hoy** vuelve al período actual sin quitar el filtro elegido.

- Cada evento reúne sus tareas y ministros. **Ver detalle del evento** muestra
  tarea, horario de servicio y responsables.
- Las tareas independientes aparecen bajo **Tareas sin evento asociado**.
- En el mes se presentan hasta dos resúmenes por día; seleccionar el día muestra
  todos sus compromisos debajo. Un evento y sus tareas se agrupan en un solo
  compromiso para evitar duplicarlos en las casillas.
- Los estados se explican con texto: **Confirmado**, **Pendiente de aprobación**
  o **Rechazado** cuando hay compromisos vinculados. El color es complementario.
- **Sin compromisos registrados** describe los datos consultados; no garantiza
  disponibilidad. Las reglas de asignación continúan aplicándose al guardar.

### Quién puede consultar qué

| Usuario | Consulta |
| --- | --- |
| Sacerdote / Admin | Coordinación con todos los ministros, filtro individual y equipo completo por evento. |
| Coordinador de ministros | Eventos parroquiales confirmados/pendientes y tareas de sus ministros; el selector ofrece solo ministros propios activos. |
| Ministro / Coordinador de grupos | Mis compromisos: tareas asignadas y eventos donde sirve o es encargado. También puede consultar Eventos de la parroquia sin tareas ajenas. |

En coordinación, los eventos sin tareas también aparecen. Al filtrar una persona,
solo se incluyen eventos en los que tiene una tarea o figura como encargado.
El detalle conserva el equipo autorizado completo de cada evento, aunque se
seleccione un ministro específico. Un coordinador solo recibe nombres de sus
propios ministros; un usuario en vista personal recibe sus propias asignaciones.

La vista parroquial interna muestra eventos confirmados, sin tareas. Esto no cambia
la agenda pública: el indicador `publico` sigue controlando qué se publica sin sesión.
Los eventos cancelados y sus tareas vinculadas quedan fuera de todas las vistas
del calendario, incluso si se consulta a su encargado. Sus registros y asignaciones
se conservan en la gestión de tareas. Los eventos rechazados se conservan como
contexto cuando tienen compromisos autorizados vinculados o la persona consultada
figura como encargada.

## Vincular una tarea

En **Tareas**, al crear o editar, usar **Misa o evento asociado (opcional)**.

1. Seleccionar el evento. Al crear se sugieren su fecha y sus horas.
2. Ajustar el horario de servicio si corresponde. Por ejemplo: misa de 10:00 a
   11:00 y preparación del altar de 9:30 a 10:00, en el mismo día.
3. Seleccionar ministros y guardar mediante el flujo existente.

Para vincular tareas antiguas, usar **Editar tarea** en sus asignaciones. Elegir
**Sin evento asociado** retira únicamente el vínculo; conserva tarea y asignados.

Reglas:

- Una tarea tiene cero o un evento; un evento puede tener muchas tareas.
- La fecha debe coincidir con la del evento. El horario es independiente.
- Solo se crean vínculos con eventos confirmados o pendientes.
- Si una reserva cambia de horas, las tareas mantienen su horario de servicio.
- Cambiar de día una reserva con tareas vinculadas devuelve 409: primero deben
  desvincularse, después reprogramarse y vincularse en la nueva fecha.
- Rechazar/cancelar un evento conserva las tareas para que coordinación las revise.
  Al cancelar, el evento y sus tareas dejan de aparecer en el calendario.
- Borrar un evento deja sus tareas sin evento asociado; no borra sus asignaciones.
- Las tareas existentes permanecen independientes hasta vincularlas explícitamente.

## API

`GET /api/calendario` requiere sesión válida y acepta:

| Parámetro | Regla |
| --- | --- |
| `fecha_inicio`, `fecha_fin` | Obligatorios, fechas reales `YYYY-MM-DD`, inclusivas, ordenadas, hasta 42 días. |
| `vista` | `personal` (predeterminada), `coordinacion` o `parroquial`. |
| `persona_id` | Opcional, solo en coordinación; identificador de un ministro activo autorizado. |

Ejemplo: `/api/calendario?fecha_inicio=2026-10-01&fecha_fin=2026-10-31&vista=coordinacion&persona_id=9`.

Respuesta 200: `{ eventos: [...], tareas: [...] }`.

- Cada evento contiene `id`, `titulo`, `descripcion`, `fecha`, `hora_inicio`,
  `hora_fin`, `encargado_id`, `nombre_encargado`, `nombre_espacio`,
  `estado_reserva_id` y `tareas` con su equipo autorizado.
- Las tareas contienen sus campos habituales, `evento_id` y
  `asignados: [{ persona_id, nombre }]`. Se omiten correos.
- La lista superior `tareas` respeta el filtro individual; `eventos[].tareas`
  conserva el equipo que el usuario puede consultar.
- La vista parroquial devuelve `tareas: []` y eventos con `tareas: []`.
- Los datos se consultan dentro de una transacción y las asignaciones se cargan
  en lote, sin una consulta por tarea.

Errores: 400 para parámetros inválidos, 401 sin sesión, 403 por vista/ministro
no autorizado y 500 ante fallo interno. El cuerpo usa `{ mensaje: "..." }`.
Una consulta vacía devuelve `{ eventos: [], tareas: [] }`.

`POST /api/tareas` y `PUT /api/tareas/:id` admiten `evento_id` entero positivo o
`null`. En creación, omitirlo equivale a una tarea independiente. En edición,
omitirlo conserva la asociación; enviar `null` la retira. La validación y la
escritura se realizan en la misma transacción, incluyendo la creación con varios
ministros. Las lecturas existentes de tareas incluyen la columna nueva.
Las consultas internas de eventos también incluyen su `titulo` existente.

## Preparación de la base de datos

En bases existentes, ejecutar **antes de utilizar el backend nuevo**:

```text
app/database/migrations/20261024_tarea_evento.sql
```

Ejecutar el archivo completo en una misma conexión MariaDB, con la base correcta
seleccionada. Por ejemplo, con el cliente ya configurado para ese entorno:

```bash
mariadb --database=parroquia < app/database/migrations/20261024_tarea_evento.sql
```

La migración es repetible: añade la columna nullable, su índice y la clave foránea
con `ON DELETE SET NULL`. No vincula tareas automáticamente ni elimina datos.
Las instalaciones nuevas ya contienen la relación en `01_schema.sql`.

El despliegue existente no aplica estas migraciones automáticamente. No reiniciar
la base ni borrar sus volúmenes para aplicar el cambio. Si se revierte la aplicación,
conservar la migración: el backend anterior puede ignorar la columna adicional.
La aplicación de la migración, push, PR, integración y despliegue quedan a cargo
del responsable del entorno.

## Verificación

Desde `app/backend`:

```bash
npm run build
npm run coverage
npm run test:integration
npm run test:calendario-ui
```

Desde `app/frontend`:

```bash
npm run build
npm run lint
npm run coverage
npm run test:regression
```

La prueba `test:calendario-ui` requiere Docker y Chromium de Playwright
(`npx playwright install chromium` desde frontend). Levanta una MariaDB temporal,
la API en un puerto libre y Vite en `http://localhost:4175`; no usa la base habitual.
Al terminar cierra sus servicios. Las capturas de semana, mes y móvil se guardan
en `app/backend/test-results/`, excluido de Git.

Las pruebas cubren permisos, asociación/desvinculación, conservación de datos,
repetición de la migración, meses bisiestos, navegación sin saltarse febrero,
respuestas fuera de orden, cambio de usuario/rol, teclado, devolución del foco,
contraste de controles en ambos temas y pantallas de 320/768/1440 píxeles.
La lectura con ayudas técnicas por personas usuarias y la facilidad de uso con
adultos mayores requieren además una validación humana; las pruebas automáticas
no sustituyen esa observación.

Validación local de esta entrega: 726 pruebas unitarias backend, 577 frontend,
19 pruebas de integración MariaDB, 6 pruebas de navegador con servicios reales y
10 regresiones Playwright correctas. Builds y lint correctos. Cobertura backend
de al menos el 96 % en las cuatro métricas; frontend superior al 95 %.
