# Crear eventos desde Gestión de eventos

Sacerdote y Admin tienen el botón **Nuevo evento** en la cabecera de **Gestión de eventos**. Abre un modal con el formulario compartido de reserva: espacio, aforo esperado, fecha, hora inicial/final, título, descripción y publicación opcional en la agenda pública.

Al guardar se utiliza `POST /api/reservas`, que ya crea la reserva y el evento en una misma transacción. La solicitud queda **pendiente**, también si quien la crea es Sacerdote o Admin: se debe aprobar desde **Reservas** antes de que aparezca como actividad confirmada en calendario o agenda pública. No se usa el formulario antiguo de asociación a reservas confirmadas sin evento, porque las solicitudes normales ya generan su evento y no se deben duplicar.

La pantalla reutiliza `CrearReservaForm` con `contexto="evento"`; solo adapta las etiquetas y el mensaje de resultado. Se mantienen las validaciones existentes de fechas, horario, capacidad, conflictos y permisos del servidor. Al guardar se bloquean los envíos duplicados y los cierres del modal; ante un error se conservan los campos y se muestra el motivo. Un resultado exitoso cierra el modal y refresca el listado.

Pruebas: `EventosPage.creacion.test.tsx` comprueba roles, envío completo, cancelación, error y espera de respuesta. `tests/regression/crear-evento.spec.ts` verifica la creación y actualización del listado en móvil y escritorio. Las pruebas de integración de reservas existentes comprueban la persistencia conjunta de reserva y evento con MariaDB real.
