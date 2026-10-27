# D9 — Baja lógica de personas

Sacerdote y Admin pueden dar de baja una cuenta desde **Cuentas → Activas → Eliminar**. La confirmación propia aclara que la operación revoca el acceso y conserva los datos. No permite eliminar la cuenta propia; solo Admin puede dar de baja a otro Admin.

Las solicitudes pendientes conservan **Aprobar** y **Rechazar**. Las rechazadas pueden aprobarse; las dadas de baja se consultan en **Dadas de baja**, con su rol e historial de decisiones, sin reactivación desde la aprobación de solicitudes.

## Persistencia y despliegue

Aplicar, antes de desplegar el backend, `app/database/migrations/20261027_baja_cuentas.sql` sobre la base correspondiente. Requiere la migración del historial de decisiones (`20261025_historial_decisiones.sql`). La nueva migración es repetible y amplía los ENUM de `persona.estado_cuenta` y `cuenta_decision.resultado`; no elimina registros. Las instalaciones nuevas ya incluyen esos valores en `01_schema.sql`. Reiniciar contenedores con un volumen existente no ejecuta automáticamente las migraciones.

`PATCH /api/cuentas/:id/baja` cambia exclusivamente una cuenta activa a `baja`. Bloquea la fila con `FOR UPDATE` y registra autor y fecha UTC en la misma transacción. Una segunda baja devuelve 409. Un fallo del registro de auditoría revierte el cambio. Después de confirmar la transacción intenta enviar el correo de desactivación; un fallo SMTP no revierte la baja.

Se conservan la persona, su correo y vínculo con Clerk, las asignaciones, reservas, eventos, relaciones de coordinación y decisiones anteriores. **También se conservan los compromisos futuros**: la baja no cancela reservas ni reasigna tareas; sus responsables deben revisarlos desde las pantallas existentes. Mantener el correo único y el vínculo de Clerk impide que la misma identidad vuelva a entrar mediante un registro nuevo.

## Acceso y directorios

Login y refresh rechazan cuentas no activas. Cada petición autenticada con JWT consulta el estado y rol persistidos, sin caché; por eso un token emitido antes de la baja pierde acceso en la siguiente petición. Clerk comprueba igualmente el estado al resolver la persona. La respuesta 403 incluye `CUENTA_BAJA`; la interfaz limpia la sesión local, cierra la sesión de Clerk y muestra el motivo al volver a login. No se elimina la identidad del proveedor.

Los directorios de ministros, coordinadores, encargados y destinatarios muestran solo cuentas activas. Las nuevas asignaciones de tareas, relaciones de coordinación, encargados de eventos/grupos y envíos manuales de notificaciones validan el estado en el servidor. Las consultas históricas conservan las uniones con la persona y muestran su nombre.

## Verificación

- Pruebas unitarias: estados, permisos, IDs inválidos, rechazo exclusivo de pendientes, baja, auditoría y rollback; JWT previo, rol vigente, Clerk y fallos de consulta.
- Integración con MariaDB desechable: migración repetida, login/refresh/token anterior, directorios, bloqueo de nuevas asignaciones, conservación exacta de asignaciones/reservas/relaciones y consulta de decisiones. No utiliza la base habitual.
- Regresión Playwright (`baja-cuentas.spec.ts`): móvil/escritorio, cancelar sin mutación, confirmar una sola baja y consultar el historial sin ofrecer reactivación.

Para probar manualmente, usar una cuenta de prueba activa distinta de quien administra, guardar una referencia de sus tareas/reservas y abrir una sesión con ella. Darla de baja desde otra sesión administrativa, comprobar el rechazo de la siguiente petición y del siguiente login, y verificar su ausencia de selectores junto con la conservación de sus registros anteriores.
