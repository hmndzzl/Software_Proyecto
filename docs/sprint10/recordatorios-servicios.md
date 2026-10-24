# Recordatorios anticipados de servicios

El backend ejecuta una revisión al iniciar el servidor y cada 15 minutos. Por cada
asignación vigente a un Ministro con cuenta activa, envía una notificación cuando
el inicio de la tarea está entre 24 y 48 horas en el futuro, incluidos ambos límites.
Las fechas y horas de las tareas se interpretan en horario de Guatemala (UTC-6).

El recordatorio aparece en **Notificaciones → Recibidas** y en la campana, como
mensaje individual del **Sistema**, inicialmente no leído. Incluye título de la
tarea, fecha, hora de inicio y fin. No solicita confirmar asistencia a un evento:
las tareas no tienen una relación con eventos en el modelo actual. Se conservan
los avisos que se envían al asignar una tarea.

## Duplicados y cambios

- Un aviso por combinación tarea/ministro/fecha/hora de inicio.
- El registro persiste al reiniciar y al borrar la notificación; no se vuelve a enviar.
- Cambiar de ministro permite un aviso para el nuevo asignado, si aún está en rango.
- Cambiar fecha u hora de inicio permite un aviso para ese nuevo horario.
- Quitar y volver a agregar al mismo ministro al mismo horario no duplica el aviso.
- Modificar solo título, descripción u hora final no produce otro recordatorio.
- Se revalida la asignación dentro de una transacción antes del envío.
- Registro de envío, notificación y destinatario se guardan juntos. Un fallo revierte
  los tres y permite reintentar en el siguiente ciclo.
- Una clave única protege ante varios procesos del backend. Cada proceso evita
  además ejecutar dos ciclos propios simultáneamente.

No se envía a tareas fuera del rango, sin asignados, eliminadas, cuentas inactivas
ni personas cuyo rol sea distinto de Ministro. El modelo actual no tiene un estado
de cancelación de tarea: eliminarla o retirar su asignación la excluye.

## Instalación y operación

No hay dependencias nuevas, servicios externos ni cambios de interfaz.
Antes de desplegar el backend sobre una base existente, aplicar:

`app/database/migrations/20261023_recordatorio_servicio.sql`

La migración crea `recordatorio_servicio` de forma repetible, sin modificar datos
existentes ni borrar volúmenes. La inicialización de bases nuevas incluye
`app/database/init/04_recordatorio_servicio.sql`. La fecha/hora de la notificación
usa el campo `enviado_en` incorporado en la tarea anterior.

Tras compilar (`npm run build`) y arrancar (`npm start`), el proceso queda activo.
Los ciclos con envíos o errores se registran como `Recordatorios de servicios`.
Los fallos no detienen el servidor y se reintentan cada 15 minutos. Al cerrar el
servidor se cancela el temporizador; importar `app` en una prueba no lo inicia.

El backend debe permanecer en ejecución. Si está apagado durante toda la ventana
de 48 a 24 horas, no se envía un aviso tardío fuera del rango. Una asignación creada
cuando ya faltan menos de 24 horas conserva únicamente el aviso inmediato existente.

## Verificación

No se agrega un endpoint que permita disparar envíos. Para comprobar recepción:

1. En una base de pruebas, asignar una tarea que empiece aproximadamente dentro de
   36 horas a un ministro activo.
2. Arrancar el backend o esperar hasta 15 minutos si ya está iniciado.
3. Con la sesión del ministro, consultar `GET http://localhost:3001/api/notificaciones`
   con `Authorization: Bearer <token>`: 200, mensaje que empieza por
   `Recordatorio de servicio:`, `remitente_id: null` y `leida: 0`.
4. Sin sesión: 401. Otro usuario no recibe ese aviso en su lista.
5. Reiniciar el backend o esperar otro ciclo y comprobar que no se duplica.

Pruebas automatizadas desde `app/backend`:

```sh
npm test -- --maxWorkers=2
npm run build
npm run test:integration -- recordatorios.integration
```

La integración usa MariaDB temporal: límites exactos y exclusiones, varios ministros,
dos ejecuciones concurrentes, persistencia, reasignación, cambio de horario,
migración repetible, fallo de entrega con rollback, reintento y consulta API con
aislamiento entre usuarios. Las pruebas del temporizador comprueban arranque,
intervalo, exclusión de ciclos simultáneos, recuperación y parada.

La migración ya se aplicó al entorno local de desarrollo. Cada entorno del equipo
debe aplicarla antes de desplegar esta versión del backend.
