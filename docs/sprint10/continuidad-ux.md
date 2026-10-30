# Continuidad de la interfaz

Implementación del 30 de octubre de 2026, verificada por etapas.

1. Los filtros de la lista de reservas y la consulta de disponibilidad de espacios se conservan por usuario y pestaña mediante sessionStorage. El contenedor administrativo restaura la posición de cada ruta, esperando la altura del contenido asíncrono. La interacción manual cancela la restauración.
2. Al refrescar reservas se conserva la lista anterior y aparece «Actualizando reservas…». Los errores permiten reintentar sin borrar las filas conocidas. Espacios conserva su refresco en segundo plano existente.
3. Los filtros compartidos distinguen una lista sin coincidencias y ofrecen «Quitar filtros y ver todos». Una lista de reservas vacía ofrece solicitar la primera reserva.
4. Reservas y tareas agrupan la actividad y su horario. Los errores de campos requeridos y orden de horas aparecen junto al campo y se asocian mediante aria-describedby/aria-invalid. Se mantienen las validaciones del servidor y los avisos generales.
5. Las confirmaciones de reservas enlazan a reservas o mis reservas según el rol. Las tareas indican el título y la cantidad de ministros y enlazan al calendario. Los avisos con una acción permanecen disponibles hasta su uso o cierre manual.

## Validación

- Etapa 1: pruebas de persistencia y regreso a una lista larga, más seis regresiones de filtros y espacios.
- Etapa 2: prueba con respuesta pendiente que confirma filas visibles durante el refresco; ocho regresiones de navegación y creación.
- Etapa 3: veinte pruebas de filtros y tablas.
- Etapa 4: cincuenta y una pruebas de formularios; comprobación visual de errores en reservas y tareas a 375 y 1440 px.
- Etapa 5: prueba de permanencia y uso del enlace del aviso; creación de reserva con enlace de continuación.
- Suite de componentes/integración: 885 pruebas aprobadas.
- Suite completa de navegador: 81 pruebas aprobadas; después se aprobaron 11 pruebas específicas que incluyen dos escenarios nuevos de formularios.
- Build y lint aprobados.

Las pruebas de navegador usan datos ficticios y solicitudes interceptadas. No se modificó producción ni se hicieron commits o push.
